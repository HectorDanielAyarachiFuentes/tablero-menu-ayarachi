// --- START OF FILE bg-loader.js ---

/**
 * Este script se ejecuta de forma síncrona en el <head> para prevenir el FOUC (Flash of Unstyled Content).
 * Lee la configuración de fondo guardada (tema, gradiente, URL o datos de imagen) y la aplica
 * al body ANTES de que la página se renderice por completo.
 */
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
        style.backgroundPosition = 'center center';
      }
    };

    const applyGradient = (gradientId, settings) => {
      const gradient = GRADIENTS.find(g => g.id === gradientId);
      if (!gradient) {
          // Si no se encuentra el gradiente, aplicar uno por defecto para evitar el flash azul
          const defaultGradient = GRADIENTS[0];
          if (!defaultGradient) return;
          document.body.style.backgroundImage = defaultGradient.gradient;
          for (const [key, value] of Object.entries(defaultGradient.cssVariables || DEFAULT_GRADIENT_COLORS)) {
            document.documentElement.style.setProperty(key, value);
          }
          return;
      }

      const colors = gradient.cssVariables || DEFAULT_GRADIENT_COLORS;

      for (const [key, value] of Object.entries(colors)) {
        if (key.startsWith('--panel') && settings[key.substring(2)]) {
          continue;
        }
        document.documentElement.style.setProperty(key, value);
      }

      document.body.style.backgroundImage = gradient.gradient;
    };

    const applyBackground = (settings) => {
      if (!settings) {
        // Si no hay configuración, aplicamos un gradiente por defecto para evitar el flash.
        applyGradient(GRADIENTS[0].id, {});
        return;
      }

      // CORRECCIÓN: Se reordena la lógica para que siempre se aplique un fondo.
      // Prioridad 1: Doodle. Si hay un doodle, limpiamos el fondo del body para que el doodle se vea.
      if (settings.doodle && settings.doodle !== 'none') {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = 'transparent'; // Esencial para que el doodle sea el fondo
      } 
      // Prioridad 2: Imagen de fondo (local o URL)
      else if (settings.bgData) {
        document.body.style.backgroundImage = `url('${settings.bgData}')`;
        applyBackgroundStyles(settings.bgDisplayMode);
      } else if (settings.bgUrl) {
        document.body.style.backgroundImage = `url('${settings.bgUrl}')`;
        applyBackgroundStyles(settings.bgDisplayMode);
      } 
      // Prioridad 3: Degradado guardado.
      else if (settings.gradient) {
        applyGradient(settings.gradient, settings);
      } 
      // Prioridad 4: Degradado aleatorio.
      else if (settings.randomBg) {
        const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
        applyGradient(randomGradient.id, settings);
      }
      // Prioridad 5 (Fallback): Si no hay nada configurado, usar el primer gradiente.
      else {
        applyGradient(GRADIENTS[0].id, settings);
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
    }
    
    // Aplicar fondo de la página
    applyBackground(settings);

  } catch (error) {
    console.error('Error in bg-loader:', error);
    // Fallback de emergencia si todo falla: aplicar un fondo oscuro genérico
    document.body.style.backgroundColor = '#111';
  }
})();