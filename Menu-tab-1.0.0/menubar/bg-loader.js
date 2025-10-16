/**
 * Este script se ejecuta de forma síncrona en el <head> para prevenir el FOUC (Flash of Unstyled Content).
 * Lee la configuración de fondo guardada (tema, gradiente, URL o datos de imagen) y la aplica
 * al body ANTES de que la página se renderice por completo.
 */
// Usamos una IIFE asíncrona para poder usar await
import { GRADIENTS, DEFAULT_GRADIENT_COLORS } from '../utils/gradients.js';

(async () => {
  try {
    const applyBackgroundStyles = (mode) => {
      const style = document.body.style;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center center';
      style.backgroundRepeat = 'no-repeat';

      if (mode === 'contain') {
        style.backgroundSize = 'contain';
      } else if (mode === 'stretch') {
        style.backgroundSize = '100% 100%';
        style.backgroundPosition = 'center center';
        style.backgroundRepeat = 'no-repeat';
      } else if (mode === 'center') {
        style.backgroundSize = 'auto';
        style.backgroundPosition = 'center center'; // Asegurar que esté centrado
      }
      // 'cover' is the default
    };

    const applyGradient = (gradientId, settings) => {
      const gradient = GRADIENTS.find(g => g.id === gradientId);
      if (!gradient) return;

      const colors = gradient.cssVariables || DEFAULT_GRADIENT_COLORS;

      // Aplicar todas las variables CSS del degradado (o las por defecto)
      for (const [key, value] of Object.entries(colors)) {
        // No sobreescribir los colores de panel si ya están personalizados por el usuario
        if (key.startsWith('--panel') && settings[key.substring(2)]) {
          continue;
        }
        document.documentElement.style.setProperty(key, value);
      }

      // Aplicar el fondo de degradado
      document.body.style.backgroundImage = gradient.gradient;
    };

    const applyBackground = (settings) => {
      // Si no hay configuraciones, no hacer nada y dejar que el body use sus valores por defecto.
      if (!settings) {
        return;
      }

      // Prioridad 1: Doodle. Si hay un doodle, no aplicamos ningún otro fondo.
      if (settings.doodle && settings.doodle !== 'none') {
        return; // Salimos para que app.js se encargue de renderizar el doodle.
      }

      // Prioridad 2: Imagen de fondo (local o URL)
      if (settings.bgData) {
        document.body.style.backgroundImage = `url('${settings.bgData}')`;
        applyBackgroundStyles(settings.bgDisplayMode);
      } else if (settings.bgUrl) {
        document.body.style.backgroundImage = `url('${settings.bgUrl}')`;
        applyBackgroundStyles(settings.bgDisplayMode);
      } else if (settings.gradient) {
        // Prioridad 3: Degradado guardado.
        applyGradient(settings.gradient, settings);
      } else if (settings.randomBg) {
        // Prioridad 4: Degradado aleatorio.
        const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
        applyGradient(randomGradient.id, settings);
      }
    };

    // Leemos la configuración desde chrome.storage
    const keys = [
      'doodle', 'bgData', 'bgUrl', 'gradient', 'randomBg', 'bgDisplayMode',
      'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
      'panelTextColor', 'panelTextSecondaryColor'
    ];
    const settings = await new Promise(resolve => (chrome.storage.sync || chrome.storage.local).get(keys, resolve));

    // Aplicar estilos de panel de forma temprana para evitar FOUC
    if (settings) {
      const style = document.documentElement.style;
      style.setProperty('--panel-bg', settings.panelBg || '#0e193a');
      style.setProperty('--panel-opacity', settings.panelOpacity ?? 0.05);
      style.setProperty('--panel-blur', `${settings.panelBlur ?? 6}px`);
      style.setProperty('--panel-radius', `${settings.panelRadius ?? 12}px`);
      style.setProperty('--panel-text-color', settings.panelTextColor || '#dbe7ff');
      style.setProperty('--panel-text-secondary-color', settings.panelTextSecondaryColor || '#dbe7ff');

      // Aplicar fondo de la página
      applyBackground(settings);
    }

  } catch (error) {
    console.error('Error in bg-loader:', error);
  }
})();