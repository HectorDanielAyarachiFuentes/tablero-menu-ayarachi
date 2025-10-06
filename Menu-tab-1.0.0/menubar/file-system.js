import { storageGet, storageSet } from './utils.js';
import { STORAGE_KEYS } from './config.js';

const FILE_NAME = 'tablero-data.json';
let dirHandle = null;

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
        const handle = await this.getDirectoryHandle();
        if (!handle) return null;

        try {
            const fileHandle = await handle.getFileHandle(FILE_NAME, { create: false });
            const file = await fileHandle.getFile();
            const content = await file.text();
            const data = JSON.parse(content);
            console.log('Datos cargados desde el archivo local.');
            // Una vez cargado, lo guardamos en el storage del navegador para acceso rápido.
            await storageSet(data);
            return data;
        } catch (err) {
            if (err.name === 'NotFoundError') {
                console.log('El archivo de datos no existe aún en el directorio seleccionado.');
            } else {
                console.error('Error al cargar datos desde el archivo:', err);
            }
            return null;
        }
    },

    /**
     * Guarda el estado actual de la aplicación en el archivo local.
     * @param {object} dataToSave - Los datos a guardar (tiles, trash, etc.).
     */
    async saveDataToFile(dataToSave) {
        const handle = await this.getDirectoryHandle();
        if (!handle) return;

        try {
            const allSettings = await storageGet(STORAGE_KEYS); // Obtiene todos los ajustes usando las claves definidas
            const fullData = { ...allSettings, ...dataToSave };

            // Excluimos los datos del clima para no guardarlos en el archivo, solo la ciudad.
            delete fullData.weather;

            const fileHandle = await handle.getFileHandle(FILE_NAME, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(fullData, null, 2));
            await writable.close();
            console.log('Datos guardados en el archivo local.');
        } catch (err) {
            console.error('Error al guardar datos en el archivo:', err);
        }
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
    }
    return false;
}
