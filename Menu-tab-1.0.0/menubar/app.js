import { $, storageGet, storageSet } from './utils.js';
import { STORAGE_KEYS } from './config.js';

import { initUI, renderGreeting, updateActiveThemeButton, updateActiveGradientButton, updateSliderValueSpans, updateDataTabUI } from './ui.js';
import { initTiles, renderTiles, tiles, setTiles, renderEditor, renderNotes, setTrash, renderTrash } from './tiles.js';
import { initSearch, renderFavoritesInSelect } from '../utils/search.js';
import { initSettings, loadGradients, applyTheme, applyGradient, applyBackgroundStyles } from './settings.js';
import { WeatherManager } from '../utils/tiempo.js';
import { DOODLES, initDoodleSettings, updateDoodleSelectionUI } from './doodles.js';
import { FileSystem } from './file-system.js';


let currentTheme = 'paisaje'; // This can be moved if themes get more complex
let currentBackgroundValue = '';

/**
 * Escucha mensajes desde otras partes de la extensión (como el service worker).
 * Si recibe un mensaje de que se añadió un marcador, recarga los datos y
 * vuelve a renderizar los accesos para mostrar el nuevo.
 */
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'BOOKMARK_ADDED') {
    console.log('Mensaje de nuevo marcador recibido. Actualizando tablero...');
    const { tiles: updatedTiles } = await storageGet(['tiles']);
    setTiles(updatedTiles);
    renderTiles();
  }
});

async function init(){
  // 1. Carga inicial desde la caché local (muy rápido)
  // Primero, intenta cargar desde el archivo local si existe el handle.
  let settings = await FileSystem.loadDataFromFile();
  let loadedFromFile = !!settings;

  if (!settings) {
    // Si no se pudo cargar del archivo, usa el almacenamiento del navegador
    settings = await storageGet(STORAGE_KEYS);
  }
  await applySettings(settings, false);

  // 2. Espera a que las fuentes estén cargadas para evitar FOUC
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  } else {
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // 3. Muestra la UI inmediatamente con los datos de la caché
  document.body.classList.remove('loading');

  // 4. En segundo plano, si no cargamos del archivo, busca actualizaciones desde chrome.storage.sync
  if (!loadedFromFile) {
    const syncedSettings = await storageGet(STORAGE_KEYS, false);
    await applySettings(syncedSettings, true);
  }
}

async function applySettings(settings, isUpdate = false) {
  let initialTiles = settings.tiles;

  // Si no hay accesos guardados, intenta importar desde los marcadores del navegador.
  if (!initialTiles || initialTiles.length === 0) {
    console.log('No hay accesos guardados. Importando desde los marcadores del navegador...');
    const bookmarks = await getBookmarks();
    if (bookmarks.length > 0) {
      initialTiles = bookmarks;
      console.log(`${bookmarks.length} marcadores importados como accesos.`);
      // Guardamos los marcadores importados para que no se vuelvan a importar la próxima vez.
      await storageSet({ tiles: initialTiles });
    } else {
      // Si no se encuentran marcadores, usar la lista por defecto.
      initialTiles = [
        {type: 'link', name:'YouTube', url:'https://www.youtube.com/'},
        {type: 'link', name:'Google', url:'https://www.google.com/', favorite: true},
        {type: 'link', name:'Wikipedia', url:'https://es.wikipedia.org/'},
        {type: 'link', name:'GitHub', url:'https://github.com/'}
      ];
      console.log('No se encontraron marcadores, usando la lista de accesos por defecto.');
    }
  }

  const processedTiles = initialTiles.map(t => {
    if (!t.type && t.url) return { ...t, type: 'link' };
    if (!t.type) t.type = 'link';
    if (t.type === 'folder' && !t.children) t.children = [];
    return t;
  });
  setTiles(processedTiles);

  const initialTrash = settings.trash || [];
  setTrash(initialTrash);

  $('#userName').value = settings.userName || '';
  $('#weatherCity').value = settings.weatherCity || '';
  renderGreeting(settings.userName);
  renderFavoritesInSelect();

  if (settings.bgData) {
    currentBackgroundValue = `url('${settings.bgData}')`;
    applyBackgroundStyles(settings.bgDisplayMode);
    document.body.style.backgroundImage = currentBackgroundValue;
  } else if (settings.bgUrl) {
    currentBackgroundValue = `url('${settings.bgUrl}')`;
    applyBackgroundStyles(settings.bgDisplayMode);
    document.body.style.backgroundImage = currentBackgroundValue;
  } else if (settings.gradient) {
    applyGradient(settings.gradient);
    updateActiveGradientButton(settings.gradient);
  } else {
    currentTheme = settings.theme || 'paisaje';
    applyTheme(currentTheme);
  }

  const panelOpacity = settings.panelOpacity ?? 0.05;
  const panelBlur = settings.panelBlur ?? 6;
  document.documentElement.style.setProperty('--panel-opacity', panelOpacity);
  document.documentElement.style.setProperty('--panel-blur', `${panelBlur}px`);
  $('#panelOpacity').value = panelOpacity;
  $('#panelBlur').value = panelBlur;
  updateSliderValueSpans();

  // Aplicar doodle
  const doodleId = settings.doodle || 'none';
  applyDoodle(doodleId);

  await storageSet({ engine: settings.engine || 'google' });
  loadGradients(settings.gradient);
  renderTiles();
  renderEditor();
  renderNotes();
  renderTrash();

  if (!isUpdate) {
    initUI();
    initTiles();
    initSearch();
    initSettings({
      currentTheme,
      currentGradient: settings.gradient,
      currentBackgroundValue,
      randomBg: settings.randomBg,
      autoSync: settings.autoSync,
      bgDisplayMode: settings.bgDisplayMode,
      isCustomBg: !!(settings.bgData || settings.bgUrl)
    });
    initDoodleSettings(doodleId);

    WeatherManager.init();
    setInterval(WeatherManager.fetchAndRender, 1800000); // Actualiza el clima cada 30 minutos
    loadNonCriticalCSS();
  }
}

/**
 * Obtiene los marcadores del navegador y los convierte al formato de 'tile'.
 * @returns {Promise<Array<object>>} Una promesa que resuelve a un array de tiles.
 */
export async function getBookmarks() {
  // Comprobamos que la API de marcadores esté disponible.
  if (!chrome.bookmarks) {
    return [];
  }

  return new Promise(resolve => {
    chrome.bookmarks.getTree(bookmarkTreeNodes => {
      const tiles = [];
      // Función recursiva para aplanar el árbol de marcadores.
      function flatten(nodes) {
        for (const node of nodes) {
          // Si es un marcador con URL (no una carpeta), lo añadimos.
          if (node.url) {
            tiles.push({ type: 'link', name: node.title || new URL(node.url).hostname, url: node.url, favorite: false });
          }
          // Si tiene hijos (es una carpeta), seguimos buscando dentro.
          if (node.children) {
            flatten(node.children);
          }
        }
      }
      flatten(bookmarkTreeNodes);
      resolve(tiles);
    });
  });
}

export function applyDoodle(doodleId) {
  const doodleBgContainer = $('#doodle-background');
  const doodlePreviewContainer = $('#doodle-preview');
  if (!doodleBgContainer || !doodlePreviewContainer) return;

  // Limpiar el fondo del body para que el doodle sea visible si hay un gradiente activo.
  document.body.style.backgroundImage = 'none';

  const doodle = DOODLES.find(d => d.id === doodleId);

  // Limpiar doodles anteriores de ambos contenedores
  doodleBgContainer.innerHTML = '';
  doodlePreviewContainer.innerHTML = '';

  if (doodle && doodle.id !== 'none' && doodle.template) {
    // Aplicar al fondo de la página principal
    doodleBgContainer.insertAdjacentHTML('beforeend', doodle.template);
    const newDoodle = doodleBgContainer.querySelector('css-doodle');
    if (newDoodle && typeof newDoodle.update === 'function') {
      newDoodle.update();
    }

    // Aplicar a la vista previa en la configuración
    doodlePreviewContainer.insertAdjacentHTML('beforeend', doodle.template);
    const newPreviewDoodle = doodlePreviewContainer.querySelector('css-doodle');
    if (newPreviewDoodle && typeof newPreviewDoodle.update === 'function') {
      setTimeout(() => newPreviewDoodle.update(), 100);
    }
  } else {
    // Si se selecciona "Ninguno", mostrar texto en la vista previa
    doodlePreviewContainer.innerHTML = '<span class="placeholder-text">Selecciona un doodle para verlo aquí</span>';
  }
}

init();

function loadNonCriticalCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/non-critical.css';
  document.head.appendChild(link);
}
