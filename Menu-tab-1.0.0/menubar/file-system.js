import { storageGet, storageSet } from './utils.js';
import { STORAGE_KEYS } from './config.js';
import { showFileError } from './ui.js';

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
        // Obtenemos TODAS las configuraciones, no solo las de STORAGE_KEYS, para asegurarnos de capturar 'weather'.
        const allSettings = await storageGet(null); 
        const fullData = { ...allSettings, ...dataToSave }; // dataToSave puede contener actualizaciones recientes

        // Excluimos los datos del clima para no guardarlos en el archivo, solo la ciudad.
        delete fullData.weather;
        // Excluimos el handle del directorio para no guardarlo dentro del propio archivo.
        delete fullData.dirHandle;

        return new Promise(async (resolve, reject) => {
            const handle = await this.getDirectoryHandle();
            if (!handle) return resolve();
            
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
     * @returns {FileSystemDirectoryHandle|null}
     */
    async getDirectoryHandle() {
        if (dirHandle) return dirHandle;
        
        const handleFromDB = await get('dirHandle');
        if (!handleFromDB) return null;

        if (await verifyPermission(handleFromDB)) {
            dirHandle = handleFromDB;
            return dirHandle;
        }
        return null;
    }
};

// --- IndexedDB Helpers para guardar el handle ---
import { get, set } from '/menubar/idb-keyval.js';

async function verifyPermission(fileHandle, readWrite = true) {
    const options = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    // Only check if permission has already been granted. Do not request it.
    // Requesting permission must be done in response to a user gesture (e.g., a click).
    const permission = await fileHandle.queryPermission(options);
    if (permission === 'granted') {
        return true;
    }
    if (permission === 'prompt') {
        console.log('File system permission status is "prompt". The user must re-select the directory via a user action to re-grant permission.');
        showFileError('Permiso de acceso a carpeta denegado.', true);
    }
    return false;
}
