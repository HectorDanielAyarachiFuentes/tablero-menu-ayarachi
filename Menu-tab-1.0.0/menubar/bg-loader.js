/**
 * Este script se ejecuta de forma síncrona en el <head> para prevenir el FOUC (Flash of Unstyled Content).
 * Lee la configuración de fondo guardada (tema, gradiente, URL o datos de imagen) y la aplica
 * al body ANTES de que la página se renderice por completo.
 */
// Usamos una IIFE asíncrona para poder usar await
(async () => {
  try {
    // Importamos dinámicamente el módulo de temas
    // const { THEMES } = await import('./themes-config.js'); // No más temas

    // Colores por defecto para los degradados, para evitar FOUC si se selecciona un degradado sin paleta.
    const DEFAULT_GRADIENT_COLORS = {
      '--text-color': '#e0e0e0',
      '--text-color-strong': '#ffffff',
      '--panel-bg': '#1c1c1c',
      '--accent-color': '#00aaff'
    };

    const applyGradientVariables = () => {
      // Para el bg-loader, no necesitamos saber el degradado exacto,
      // solo aplicar una paleta de colores por defecto para que el texto sea legible.
      // La lógica completa se ejecutará en settings.js.
      for (const [key, value] of Object.entries(DEFAULT_GRADIENT_COLORS)) {
        document.documentElement.style.setProperty(key, value);
      }
      const panelBg = DEFAULT_GRADIENT_COLORS['--panel-bg'];
      if (panelBg.startsWith('#')) {
          const r = parseInt(panelBg.slice(1, 3), 16), g = parseInt(panelBg.slice(3, 5), 16), b = parseInt(panelBg.slice(5, 7), 16);
          document.documentElement.style.setProperty('--panel-bg-rgb', `${r}, ${g}, ${b}`);
      }
    };

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

    const applyBackground = (settings) => {
      // Si no hay configuraciones, no hacer nada y dejar que el body use sus valores por defecto.
      if (!settings) {
        return;
      }

      // Prioridad 1: Doodle. Si hay un doodle, no aplicamos ningún otro fondo de imagen o degradado.
      if (settings.doodle && settings.doodle !== 'none') {
        // No podemos renderizar el doodle aquí porque el componente <css-doodle> aún no está listo,
        // pero sí podemos aplicar los colores base para evitar FOUC de texto.
        applyGradientVariables();
        return; // Salimos para que app.js se encargue de renderizar el doodle.
      }

      // Solo aplicar fondo aleatorio si NO hay un fondo específico (URL, datos, gradiente o tema) guardado.
      // Esto previene que el fondo aleatorio sobreescriba una selección guardada durante la carga inicial.
      const hasSpecificBackground = settings.bgData || settings.bgUrl || settings.gradient;

      if (settings.randomBg && !hasSpecificBackground) {
        // Ahora solo puede ser un degradado aleatorio.
        applyGradientVariables();
        return;
      }

      if (settings.bgData) {
        document.body.style.backgroundImage = `url('${settings.bgData}')`;
        applyBackgroundStyles(settings.bgDisplayMode);
      } else if (settings.bgUrl) {
        document.body.style.backgroundImage = `url('${settings.bgUrl}')`;
        applyBackgroundStyles(settings.bgDisplayMode);
      } else if (settings.gradient) {
        // Si hay un degradado guardado, aplicamos los colores por defecto para evitar FOUC.
        // El degradado específico y sus colores se aplicarán en app.js
        applyGradientVariables();
      }
    };

    // Leemos la configuración desde chrome.storage
    const keys = ['doodle', 'bgData', 'bgUrl', 'gradient', 'randomBg', 'bgDisplayMode', 'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius'];
    const settings = await new Promise(resolve => (chrome.storage.sync || chrome.storage.local).get(keys, resolve));

    // Aplicar estilos de panel de forma temprana para evitar FOUC
    if (settings) {
      const panelBg = settings.panelBg || '#0e193a';
      const panelOpacity = settings.panelOpacity ?? 0.05;
      const panelBlur = settings.panelBlur ?? 6;
      const panelRadius = settings.panelRadius ?? 12;
      document.documentElement.style.setProperty('--panel-bg', panelBg);
      document.documentElement.style.setProperty('--panel-opacity', panelOpacity);
      document.documentElement.style.setProperty('--panel-blur', `${panelBlur}px`);
      document.documentElement.style.setProperty('--panel-radius', `${panelRadius}px`);
    }

    applyBackground(settings);

  } catch (error) {
    console.error('Error in bg-loader:', error);
  }
})();