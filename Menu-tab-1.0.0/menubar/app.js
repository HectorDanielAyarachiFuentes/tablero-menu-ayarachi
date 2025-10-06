import { $, storageGet, storageSet } from './utils.js';
import { STORAGE_KEYS } from './config.js';

import { initUI, renderGreeting, updateActiveThemeButton, updateActiveGradientButton, updateSliderValueSpans, updateDataTabUI } from './ui.js';
import { initTiles, renderTiles, tiles, setTiles, renderEditor, setTrash, renderTrash, renderNotes } from './tiles.js';
import { initSearch, renderFavoritesInSelect } from '../utils/search.js';
import { initSettings, loadGradients, applyTheme, applyGradient, applyBackgroundStyles } from './settings.js';
import { WeatherManager } from '../utils/tiempo.js';
import { FileSystem } from './file-system.js';


let currentTheme = 'paisaje'; // This can be moved if themes get more complex
let currentBackgroundValue = '';

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
  const initialTiles = settings.tiles || [
    {type: 'link', name:'YouTube', url:'https://www.youtube.com/'},
    {type: 'link', name:'Google', url:'https://www.google.com/', favorite: true},
    {type: 'link', name:'Wikipedia', url:'https://es.wikipedia.org/'},
    {type: 'link', name:'GitHub', url:'https://github.com/'}
  ];

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

    WeatherManager.init();
    setInterval(WeatherManager.fetchAndRender, 1800000); // Actualiza el clima cada 30 minutos
    loadNonCriticalCSS();
  }
}

init();

function loadNonCriticalCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/non-critical.css';
  document.head.appendChild(link);
}
