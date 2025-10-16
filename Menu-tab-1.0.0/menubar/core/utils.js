/**
 * Proporciona funciones de utilidad reutilizables en toda la aplicación.
 * Incluye selectores de DOM, helpers para el almacenamiento y una función de guardado con debounce.
 */
import { FileSystem } from '../system/file-system.js';
import { showSaveStatus } from '../components/ui.js';

export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));

let saveDebounceTimer;

// storage helpers supporting chrome.storage.sync or fallback to localStorage
export const storageGet = (keys, useCache = false) => new Promise(resolve => {
  if (window.chrome && chrome.storage?.local) {
    // Siempre leemos de local, que es nuestra "fuente de verdad" en el navegador.
    chrome.storage.local.get(keys, resolve);
  } else { // Fallback para cuando no es una extensión
    const out = {};
    keys.forEach(k => { out[k] = JSON.parse(localStorage.getItem(k)); });
    resolve(out);
  }
});

export const storageSet = (obj) => new Promise(resolve => {
  if (window.chrome && chrome.storage?.local) {
    // Solo guardamos en local. La sincronización con el archivo se maneja por separado.
    chrome.storage.local.set(obj, resolve);
  } else {
    Object.keys(obj).forEach(k => localStorage.setItem(k, JSON.stringify(obj[k])));
    resolve();
  }
});

/**
 * Función de guardado en archivo con "debounce".
 * Agrupa múltiples llamadas a guardar en un corto período de tiempo en una sola.
 * @param {object} dataToSave - Datos a fusionar y guardar.
 */
const debouncedSaveToFile = (dataToSave) => {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
        // Pasamos el objeto de configuración directamente para que se guarde en el archivo.
        // No es necesario pasar `dataToSave` aquí, ya que `saveDataToFile` obtiene el estado más reciente del storage.
        try {
            await FileSystem.saveDataToFile({});
            showSaveStatus();
        } catch (error) {
            // El error ya se muestra en la UI desde file-system.js, aquí solo lo capturamos.
            console.error("Fallo el guardado automático después de varios intentos.", error);
        }
    }, 300); // Espera 300ms antes de guardar
};

/**
 * Guarda una configuración, la almacena en el navegador y sincroniza con el archivo si autoSync está activado.
 * @param {object} setting - Un objeto con la clave y valor a guardar. Ej: { userName: 'Test' }
 * @param {function(object):void} [applyCallback] - Una función opcional para aplicar los cambios en la UI.
 */
export async function saveAndSyncSetting(setting, applyCallback) {
    await storageSet(setting);
    if (applyCallback) {
        applyCallback(setting);
    }
    const { autoSync } = await storageGet(['autoSync']);
    if (autoSync) {
        debouncedSaveToFile(setting);
    } else {
        showSaveStatus();
    }
}