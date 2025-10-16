/**
 * Gestiona la lógica de la pestaña "Paneles" en la configuración.
 * Se encarga de los controles de apariencia como color, opacidad, desenfoque y radio de borde.
 */
import { $, $$ } from '../core/utils.js';
import { saveAndSyncSetting, storageGet } from '../core/utils.js';
import { showSaveStatus } from '../components/ui.js';

export function initPanelSettings() {
    const panelColorInput = $('#panelColor');
    const panelColorValue = $('#panelColorValue');

    panelColorInput.addEventListener('input', (e) => {
        const color = e.target.value;
        panelColorValue.value = color;
        document.documentElement.style.setProperty('--panel-bg', color);
        updatePanelRgb(color);
    });
    panelColorInput.addEventListener('change', (e) => saveAndSyncSetting({ panelBg: e.target.value }));

    panelColorValue.addEventListener('change', (e) => {
        const color = e.target.value;
        panelColorInput.value = color;
        panelColorInput.dispatchEvent(new Event('input'));
        panelColorInput.dispatchEvent(new Event('change'));
    });

    $('#panelOpacity').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--panel-opacity', e.target.value);
        updateSliderValueSpans();
    });
    $('#panelOpacity').addEventListener('change', (e) => {
        saveAndSyncSetting({ panelOpacity: parseFloat(e.target.value) });
    });

    $('#panelBlur').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--panel-blur', `${e.target.value}px`);
        updateSliderValueSpans();
    });
    $('#panelBlur').addEventListener('change', (e) => {
        saveAndSyncSetting({ panelBlur: parseInt(e.target.value, 10) });
    });

    $('#panelRadius').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--panel-radius', `${e.target.value}px`);
        updateSliderValueSpans();
    });
    $('#panelRadius').addEventListener('change', (e) => {
        saveAndSyncSetting({ panelRadius: parseInt(e.target.value, 10) });
    });

    $('#resetPanelsBtn').addEventListener('click', async () => {
        await resetPanelSettings();
    });
}

export function updateSliderValueSpans() {
    $('#opacityValue').textContent = `${Math.round($('#panelOpacity').value * 100)}%`;
    $('#blurValue').textContent = `${$('#panelBlur').value}px`;
    $('#radiusValue').textContent = `${$('#panelRadius').value}px`;
}

export function updatePanelRgb(hex) {
    if (!hex || !hex.startsWith('#')) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        document.documentElement.style.setProperty('--panel-bg-rgb', `${r}, ${g}, ${b}`);
    }
}

async function resetPanelSettings() {
    // Importamos dinámicamente para evitar dependencias circulares
    const { GRADIENTS, DEFAULT_GRADIENT_COLORS } = await import('../../utils/gradients.js');

    // Obtenemos el degradado actual para saber qué color de panel por defecto aplicar
    const { gradient: currentGradientId } = await storageGet(['gradient']);
    const currentGradient = GRADIENTS.find(g => g.id === currentGradientId);
    
    // Determinamos el color de panel por defecto basado en el degradado actual o un valor global
    const defaultPanelColor = currentGradient?.cssVariables?.['--panel-bg'] || DEFAULT_GRADIENT_COLORS['--panel-bg'] || '#0e193a';

    const defaults = {
        panelBg: defaultPanelColor,
        panelOpacity: 0.05,
        panelBlur: 6,
        panelRadius: 12
    };

    // Eliminar las configuraciones personalizadas del storage
    await saveAndSyncSetting({
        panelBg: null,
        panelOpacity: null,
        panelBlur: null,
        panelRadius: null
    });

    // Aplicar valores por defecto a la UI y al DOM
    $('#panelColor').value = defaults.panelBg;
    $('#panelColorValue').value = defaults.panelBg;
    $('#panelOpacity').value = defaults.panelOpacity;
    $('#panelBlur').value = defaults.panelBlur;
    $('#panelRadius').value = defaults.panelRadius;

    document.documentElement.style.setProperty('--panel-bg', defaults.panelBg);
    document.documentElement.style.setProperty('--panel-opacity', defaults.panelOpacity);
    document.documentElement.style.setProperty('--panel-blur', `${defaults.panelBlur}px`);
    document.documentElement.style.setProperty('--panel-radius', `${defaults.panelRadius}px`);
    updatePanelRgb(defaults.panelBg);
    updateSliderValueSpans();
    showSaveStatus();
}