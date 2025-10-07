/**
 * Configuración centralizada de temas.
 * Este archivo es la única fuente de verdad para los temas de la aplicación.
 * Es utilizado tanto por bg-loader.js (síncrono) como por el resto de la aplicación (módulos).
 */
export const THEMES = {
  'paisaje': {
    name: 'Paisaje',
    background: "url('../images/paisaje.jpg')",
    cssVariables: { '--text-color': '#dbe7ff', '--panel-bg': '#0e193a' }
  },
  'cosmico': {
    name: 'Cósmico',
    background: "url('../images/cosmico.jpg')",
    cssVariables: { '--text-color': '#e0e0e0', '--panel-bg': '#1a1a2e' }
  },
  'neon': {
    name: 'Neón',
    background: "url('../images/neon.jpg')",
    cssVariables: { '--text-color': '#f0f0f0', '--panel-bg': '#0f0f0f' }
  }
};