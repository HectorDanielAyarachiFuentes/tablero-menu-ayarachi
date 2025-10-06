export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));

// storage helpers supporting chrome.storage.sync or fallback to localStorage
export const storageGet = (keys, useCache = false) => new Promise(resolve => {
  if (window.chrome && chrome.storage) {
    // Para la carga inicial rápida, leemos de la caché local.
    // Para obtener los datos más recientes, leemos de sync.
    const storageArea = useCache ? chrome.storage.local : chrome.storage.sync;
    storageArea.get(keys, resolve);
  } else {
    const out = {};
    keys.forEach(k => { out[k] = JSON.parse(localStorage.getItem(k)); });
    resolve(out);
  }
});

export const storageSet = (obj) => new Promise(resolve => {
  if (window.chrome && chrome.storage) {
    // Guardamos todo en ambos almacenamientos:
    // - local: para una carga inicial ultrarrápida.
    // - sync: para sincronizar entre dispositivos.
    chrome.storage.local.set(obj, () => {
      chrome.storage.sync.set(obj, resolve);
    });
  } else {
    Object.keys(obj).forEach(k => localStorage.setItem(k, JSON.stringify(obj[k])));
    resolve();
  }
});