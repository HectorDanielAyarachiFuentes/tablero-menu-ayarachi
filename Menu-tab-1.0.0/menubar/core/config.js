/**
 * Archivo de configuración central.
 * Define constantes utilizadas en toda la aplicación, como las claves de almacenamiento y las URLs de APIs.
 */
export const STORAGE_KEYS = [
  'tiles',
  'engine',
  'theme',
  'bgData',
  'bgUrl',
  'userName',
  'weatherCity',
  'gradient',
  'panelBg',
  'panelOpacity',
  'panelBlur',
  'panelRadius',
  'randomBg',
  'trash', // Re-added trash
  'autoSync',
  'doodle'
];

export const API_URLS = {
  GEOCODING: 'https://geocoding-api.open-meteo.com/v1/search',
  WEATHER: 'https://api.open-meteo.com/v1/forecast'
};