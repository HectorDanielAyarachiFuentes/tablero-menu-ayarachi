import { FileSystem } from './file-system.js';
import { showSaveStatus } from './ui.js';

export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));

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
        // Pasamos el objeto de configuración directamente para que se guarde en el archivo.
        await FileSystem.saveDataToFile(setting);
    }
    showSaveStatus();
}