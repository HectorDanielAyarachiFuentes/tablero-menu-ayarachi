/**
 * Este archivo contiene ejemplos y utilidades para asegurar la compatibilidad de la aplicación
 * en diferentes navegadores como Firefox y Opera, utilizando técnicas como la detección
 * de características y polyfills.
 */

(function() {
  'use strict';

  console.log("Verificando compatibilidad del navegador...");

  /**
   * ==================================================================================
   * 1. DETECCIÓN DE CARACTERÍSTICAS (FEATURE DETECTION)
   * ==================================================================================
   * En lugar de verificar el navegador (ej. "¿Es Firefox?"), es mucho mejor
   * verificar si la característica que quieres usar existe.
   */

  // Ejemplo: Verificar si el navegador soporta la API de Geolocalización.
  if ('geolocation' in navigator) {
    console.log('¡La geolocalización está soportada!');
    // Aquí puedes llamar a tu código que usa la geolocalización.
    // navigator.geolocation.getCurrentPosition(...);
  } else {
    console.warn('La geolocalización NO está soportada en este navegador.');
    // Podrías mostrar un mensaje al usuario o usar una alternativa.
  }

  // Ejemplo: Verificar si el navegador soporta la API Fetch para peticiones de red.
  if ('fetch' in window) {
    console.log('¡La API Fetch está soportada!');
    // fetch('https://api.example.com/data').then(...);
  } else {
    console.warn('La API Fetch NO está soportada. Considera usar un polyfill o XMLHttpRequest.');
  }


  /**
   * ==================================================================================
   * 2. POLYFILLS
   * ==================================================================================
   * Un polyfill es un trozo de código que provee la funcionalidad que esperas
   * que el navegador tenga de forma nativa.
   */

  // Ejemplo: Polyfill para String.prototype.startsWith()
  // Esta función es parte de ES6 y podría no estar en navegadores muy antiguos.
  if (!String.prototype.startsWith) {
    console.log('Aplicando polyfill para String.prototype.startsWith');
    String.prototype.startsWith = function(searchString, position) {
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
    };
  }

  // Ahora puedes usar .startsWith() con seguridad en cualquier navegador.
  const miTexto = "Hola mundo";
  if (miTexto.startsWith("Hola")) {
    console.log("El texto comienza con 'Hola'.");
  }

  console.log("Verificación de compatibilidad completada.");

})();