/**
 * Este script se ejecuta de forma síncrona en el <head> para prevenir el FOUC (Flash of Unstyled Content).
 * Lee la configuración de fondo guardada (tema, gradiente, URL o datos de imagen) y la aplica
 * al body ANTES de que la página se renderice por completo.
 */
(() => {
  const applyBackground = (settings) => {
    // Si no hay configuraciones, no hacer nada y dejar que el body use sus valores por defecto.
    if (!settings) {
      return;
    }

    if (settings.bgData) {
      document.body.style.backgroundImage = `url('${settings.bgData}')`;
    } else if (settings.bgUrl) {
      document.body.style.backgroundImage = `url('${settings.bgUrl}')`;
    } else if (settings.gradient) {
      document.body.style.backgroundImage = settings.gradient;
    } else if (settings.theme) {
      // Aplica la imagen de fondo del tema directamente para evitar la carga de todas las imágenes.
      document.body.style.backgroundImage = `url('images/${settings.theme}.jpg')`;
      document.body.classList.add('theme-background');
    }
  };

  // Usamos una IIFE asíncrona para poder usar await con chrome.storage
  (async () => {
    const keys = ['theme', 'bgData', 'bgUrl', 'gradient'];
    const settings = await new Promise(resolve => chrome.storage.sync.get(keys, resolve));
    applyBackground(settings);
  })();
})();