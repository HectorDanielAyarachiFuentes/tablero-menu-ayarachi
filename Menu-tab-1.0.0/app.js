import { $, storageGet, storageSet } from './utils.js';
import { initUI, renderGreeting, updateActiveThemeButton, updateActiveGradientButton, updateSliderValueSpans } from './ui.js';
import { initTiles, renderTiles, tiles, setTiles, renderEditor } from './tiles.js';
import { initSearch, renderFavoritesInSelect } from './search.js';
import { initSettings, loadGradients } from './settings.js';
import { WeatherManager } from './tiempo.js';

let currentTheme = 'paisaje'; // This can be moved if themes get more complex
let currentBackgroundValue = '';

async function init(){
  // 1. Carga inicial desde la caché local (muy rápido)
  const cachedSettings = await storageGet(['tiles','engine','theme','bgData','bgUrl', 'userName', 'weatherCity', 'gradient', 'panelOpacity', 'panelBlur'], true);
  await applySettings(cachedSettings, false);

  // 2. Espera a que las fuentes estén cargadas para evitar FOUC
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  } else {
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  // 3. Muestra la UI inmediatamente con los datos de la caché
  document.body.classList.remove('loading');

  // 4. En segundo plano, busca actualizaciones desde la nube (sync) y vuelve a aplicar si hay cambios
  const syncedSettings = await storageGet(['tiles','engine','theme','bgData','bgUrl', 'userName', 'weatherCity', 'gradient', 'panelOpacity', 'panelBlur'], false);
  await applySettings(syncedSettings, true);
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

  $('#userName').value = settings.userName || '';
  $('#weatherCity').value = settings.weatherCity || '';
  renderGreeting(settings.userName);
  renderFavoritesInSelect();

  if (settings.bgData) {
    // No guardamos el bgData en currentBackgroundValue aquí para evitar tenerlo en memoria. Se aplica en bg-loader.js
    currentBackgroundValue = `url('${settings.bgData}')`;
  } else if (settings.bgUrl) {
    currentBackgroundValue = `url('${settings.bgUrl}')`;
  } else if (settings.gradient) {
    updateActiveGradientButton(settings.gradient);
    currentBackgroundValue = settings.gradient;
  } else {
    currentTheme = settings.theme || 'paisaje';
    currentBackgroundValue = `url('images/${currentTheme}.jpg')`;
    updateActiveThemeButton(currentTheme);
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

  if (!isUpdate) {
    initUI();
    initTiles();
    initSearch();
    initSettings({ currentTheme, currentBackgroundValue });

    WeatherManager.init();
    setInterval(WeatherManager.init, 1800000); // Actualiza el clima cada 30 minutos
    loadNonCriticalCSS();
  }
}

init();

function loadNonCriticalCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'non-critical.css';
  document.head.appendChild(link);
}
