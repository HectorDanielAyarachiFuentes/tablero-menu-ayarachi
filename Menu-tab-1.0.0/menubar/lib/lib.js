/**
 * Módulo de utilidad para importar y re-exportar librerías de terceros.
 * En este caso, se encarga de cargar DOMPurify para sanitizar HTML.
 */
// Importa la copia local de DOMPurify.
// Dado que purify.min.js es un módulo UMD y no un módulo ES6 nativo,
// no podemos usar `import from`. En su lugar, lo importamos como un script
// que adjuntará DOMPurify al objeto `window`.
await import('../../lib/purify.min.js');

// Re-exportamos DOMPurify para que pueda ser importado desde otros módulos de la app.
// Ahora DOMPurify está disponible globalmente, lo tomamos y lo exportamos.
const DOMPurify = window.DOMPurify;
export { DOMPurify };