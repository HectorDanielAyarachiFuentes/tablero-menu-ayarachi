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