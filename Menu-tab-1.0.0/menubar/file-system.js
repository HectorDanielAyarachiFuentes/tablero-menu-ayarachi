import { storageGet, storageSet } from './utils.js';
import { STORAGE_KEYS } from './config.js';
import { showFileError, showSaveStatus } from './ui.js';

const FILE_NAME = 'tablero-data.json';
let dirHandle = null;
let fsWorkerInstance = null;


/**
 * Obtiene una instancia única del Web Worker para el sistema de archivos.
 * @returns {Worker}
 */
function getWorker() {
    if (!fsWorkerInstance) {
        // Usamos la ruta absoluta desde la raíz de la extensión.
        fsWorkerInstance = new Worker('/menubar/file-worker.js', { type: 'module' });
    }
    return fsWorkerInstance;
}

/**
 * Módulo para manejar la interacción con el sistema de archivos local
 * usando la API de Acceso al Sistema de Archivos.
 */
export const FileSystem = {
    /**
     * Solicita al usuario que seleccione un directorio para almacenar los datos.
     * Guarda el handle del directorio en IndexedDB para persistencia.
     */
    async selectDirectory() {
        if (!window.showDirectoryPicker) {
            alert('Tu navegador no soporta la API de Acceso al Sistema de Archivos. Prueba con Chrome, Edge o Opera.');
            return;
        }
        try {
            const handle = await window.showDirectoryPicker();
            await set('dirHandle', handle);
            dirHandle = handle;
            console.log('Directorio seleccionado y guardado:', handle.name);

            // Realizar un guardado inicial en el hilo principal para asegurar la creación del archivo.
            // Esto es crucial porque la acción del usuario (el click) garantiza el permiso.
            // Las operaciones posteriores pueden ser delegadas al worker de forma segura.
            const fileHandle = await handle.getFileHandle(FILE_NAME, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify({}, null, 2)); // Escribir un objeto vacío inicial
            await writable.close();
            console.log('Archivo de datos inicial creado en el hilo principal.');

            showSaveStatus();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error al seleccionar el directorio:', err);
            }
        }
    },

    /**
     * Carga los datos desde el archivo local si existe un handle y permisos.
     * @returns {object|null} Los datos cargados o null si no se pudo cargar.
     */
    async loadDataFromFile() {
        return new Promise(async (resolve) => {
            const handle = await this.getDirectoryHandle();
            if (!handle) return resolve(null);
            
            const fsWorker = getWorker();
            fsWorker.onmessage = (event) => {
                if (event.data.action === 'loadDataResult') {
                    if (event.data.success && event.data.data) {
                        // El worker nos devuelve los datos, ahora los guardamos en IndexedDB
                        storageSet(event.data.data).then(() => resolve(event.data.data));
                    } else {
                        resolve(null);
                    }
                }
            };
            fsWorker.postMessage({ action: 'loadData', payload: { handle } });
        });
    },

    /**
     * Guarda el estado actual de la aplicación en el archivo local.
     * @param {object} dataToSave - Los datos a guardar (tiles, trash, etc.).
     */
    async saveDataToFile(dataToSave) {
        // Importamos dinámicamente para evitar dependencias circulares y obtener el estado más reciente.
        const { tiles, trash } = await import('./tiles.js');

        // Obtenemos TODAS las configuraciones, no solo las de STORAGE_KEYS, para asegurarnos de capturar 'weather'.
        const allSettings = await storageGet(null); 
        // Creamos el objeto de datos completo, asegurándonos de incluir siempre los tiles y la papelera.
        // `dataToSave` puede contener otras actualizaciones que también se fusionarán.
        const fullData = { ...allSettings, ...dataToSave, tiles, trash };
        
        // Excluimos los datos del clima para no guardarlos en el archivo, solo la ciudad.
        delete fullData.weather;
        // Excluimos el handle del directorio para no guardarlo dentro del propio archivo.
        delete fullData.dirHandle;

        return new Promise(async (resolve, reject) => {
            // ¡CAMBIO CLAVE!
            // Para una operación de guardado (escritura), siempre verificamos el permiso
            // ANTES de enviar la tarea al worker. Como es una operación en segundo plano,
            // no podemos solicitar el permiso aquí (withPermissionRequest = false).
            // Si no tenemos permiso, simplemente rechazamos la promesa para que el
            // guardado automático falle de forma controlada y muestre el error en la UI.
            const handle = await this.getDirectoryHandle(false);

            if (!handle) {
                // Si no tenemos handle (porque el permiso es 'prompt' o 'denied'),
                // rechazamos la promesa para que la lógica de reintentos en utils.js sepa que falló.
                return reject(new Error('Permiso de archivo no concedido para guardado automático.'));
            }
            
            const fsWorker = getWorker();
            fsWorker.onmessage = (event) => {
                if (event.data.action === 'saveDataResult') { 
                    if (event.data.success) {
                        resolve();
                    } else {
                        showFileError(`Error al guardar: ${event.data.error}`);
                        reject(new Error(event.data.error));
                    }
                }
            };
            fsWorker.postMessage({ action: 'saveData', payload: { handle, data: fullData } });
        });
    },

    /**
     * Obtiene el handle del directorio desde la caché o IndexedDB.
     * Verifica los permisos antes de devolverlo.
     * @param {boolean} withPermissionRequest - Si es `true`, intentará solicitar el permiso si es necesario (debe ser por acción del usuario).
     * @returns {FileSystemDirectoryHandle|null}
     */
    async getDirectoryHandle(withPermissionRequest = false) {
        if (dirHandle) return dirHandle;
        
        const handleFromDB = await get('dirHandle');
        if (!handleFromDB) return null;

        // Pasamos el flag para que verifyPermission sepa si puede o no pedir permiso.
        if (await verifyPermission(handleFromDB, withPermissionRequest)) {
            dirHandle = handleFromDB;
            return dirHandle;
        }
        return null;
    }
};

// --- IndexedDB Helpers para guardar el handle ---
import { get, set } from '/menubar/idb-keyval.js';

/**
 * Verifica y, si es necesario, solicita permiso para un handle de archivo/directorio.
 * @param {FileSystemHandle} fileHandle - El handle a verificar.
 * @param {boolean} withRequest - Si es `true`, intentará solicitar el permiso si el estado es 'prompt'.
 * @returns {Promise<boolean>} - `true` si se tiene permiso, `false` en caso contrario.
 */
async function verifyPermission(fileHandle, withRequest = false) {
    const options = { mode: 'readwrite' };

    // Primero, consulta el estado del permiso sin molestar al usuario.
    if (await fileHandle.queryPermission(options) === 'granted') {
        return true;
    }

    // Si se nos permite (porque la acción fue iniciada por el usuario), solicitamos el permiso.
    if (withRequest && await fileHandle.requestPermission(options) === 'granted') {
        return true;
    }

    // Si llegamos aquí, es porque el permiso es 'prompt' (y no se solicitó) o 'denied'.
    if (await fileHandle.queryPermission(options) === 'prompt') {
        console.log('File system permission status is "prompt". The user must re-select the directory via a user action to re-grant permission.');
        showFileError('Permiso de acceso a carpeta denegado.', true);
    }
    return false;
}
