const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// storage helpers supporting chrome.storage.sync or fallback to localStorage
const storageGet = (keys) => new Promise(resolve => {
  if (window.chrome && chrome.storage) {
    chrome.storage.sync.get(keys, (syncRes) => {
      // For 'tiles', we also check local storage for custom icons
      if (keys.includes('tiles')) {
        chrome.storage.local.get(['tiles'], (localRes) => {
          // Merge local data (icons) into sync data
          if (syncRes.tiles && localRes.tiles) {
            syncRes.tiles = syncRes.tiles.map((tile, i) => ({ ...tile, ...localRes.tiles[i] }));
          }
          resolve(syncRes);
        });
      } else {
        resolve(syncRes);
      }
    });
  } else {
    const out = {};
    keys.forEach(k => { out[k] = JSON.parse(localStorage.getItem(k)); });
    resolve(out);
  }
});

const storageSet = (obj) => new Promise(resolve => {
  if (window.chrome && chrome.storage) {
    // Separate custom icons to store them in local storage
    const { tiles, ...syncData } = obj;
    chrome.storage.sync.set(syncData, () => {
      if (tiles) {
        const localTiles = tiles.map(({ customIcon }) => ({ customIcon }));
        const syncTiles = tiles.map(({ name, url, type, favorite, children }) => ({ name, url, type, favorite, children }));
        chrome.storage.local.set({ tiles: localTiles }, () => {
          chrome.storage.sync.set({ tiles: syncTiles }, resolve);
        });
      } else {
        resolve();
      }
    });
  } else {
    Object.keys(obj).forEach(k => localStorage.setItem(k, JSON.stringify(obj[k])));
    resolve();
  }
});