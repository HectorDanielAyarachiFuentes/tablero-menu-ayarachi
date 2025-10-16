/**
 * Gestiona la lógica de los controles de personalización de los paneles.
 * Incluye color, opacidad, desenfoque, radio y ahora también sombras.
 */
import { $, $$, saveAndSyncSetting, storageGet } from '../core/utils.js';

const PANEL_THEMES = [
    { id: 'default', name: 'Por Defecto', panelBg: '#0e193a', panelOpacity: 0.05, panelBlur: 6, panelRadius: 12, panelShadowEnabled: false, panelTextColor: '#f0f8ff', panelTextSecondaryColor: '#cdd9e5' },
    { id: 'glass', name: 'Cristalino', panelBg: '#ffffff', panelOpacity: 0.1, panelBlur: 10, panelRadius: 16, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 20, panelTextColor: '#000000', panelTextSecondaryColor: '#333333' },
    { id: 'solid', name: 'Sólido', panelBg: '#1C1C1E', panelOpacity: 0.85, panelBlur: 0, panelRadius: 10, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 15, panelTextColor: '#f5f5f7', panelTextSecondaryColor: '#a0a0a0' },
    { id: 'deep-ocean', name: 'Océano', panelBg: '#001f3f', panelOpacity: 0.2, panelBlur: 8, panelRadius: 14, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 15, panelTextColor: '#f0f8ff', panelTextSecondaryColor: '#b3e5fc' },
    { id: 'forest', name: 'Bosque', panelBg: '#00332e', panelOpacity: 0.25, panelBlur: 10, panelRadius: 12, panelShadowEnabled: true, panelShadowColor: '#001a17', panelShadowBlur: 20, panelTextColor: '#f0fff0', panelTextSecondaryColor: '#b2dfdb' },
    { id: 'matrix', name: 'Matrix', panelBg: '#002b00', panelOpacity: 0.15, panelBlur: 5, panelRadius: 4, panelShadowEnabled: true, panelShadowColor: '#00ff00', panelShadowBlur: 15, panelTextColor: '#00ff41', panelTextSecondaryColor: '#00cc00' },
    { id: 'fire', name: 'Fuego', panelBg: '#ff4500', panelOpacity: 0.1, panelBlur: 8, panelRadius: 18, panelShadowEnabled: true, panelShadowColor: '#ff6347', panelShadowBlur: 25, panelTextColor: '#ffffff', panelTextSecondaryColor: '#ffdab9' },
    { id: 'lavender', name: 'Lavanda', panelBg: '#e6e6fa', panelOpacity: 0.2, panelBlur: 12, panelRadius: 15, panelShadowEnabled: false, panelTextColor: '#2f2f4f', panelTextSecondaryColor: '#483d8b' },
    { id: 'mint', name: 'Menta', panelBg: '#98ff98', panelOpacity: 0.15, panelBlur: 10, panelRadius: 14, panelShadowEnabled: false, panelTextColor: '#004d00', panelTextSecondaryColor: '#006400' },
    { id: 'chocolate', name: 'Chocolate', panelBg: '#3d2b1f', panelOpacity: 0.8, panelBlur: 2, panelRadius: 8, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 10, panelTextColor: '#f5f5dc', panelTextSecondaryColor: '#d2b48c' },
    { id: 'steel', name: 'Acero', panelBg: '#cccccc', panelOpacity: 0.1, panelBlur: 4, panelRadius: 6, panelShadowEnabled: true, panelShadowColor: '#ffffff', panelShadowBlur: 10, panelTextColor: '#1a1a1a', panelTextSecondaryColor: '#4d4d4d' },
    { id: 'vanilla', name: 'Vainilla', panelBg: '#f3e5ab', panelOpacity: 0.7, panelBlur: 1, panelRadius: 10, panelShadowEnabled: true, panelShadowColor: '#d1c48c', panelShadowBlur: 15, panelTextColor: '#5d4037', panelTextSecondaryColor: '#795548' },
    { id: 'cherry', name: 'Cereza', panelBg: '#d2042d', panelOpacity: 0.25, panelBlur: 12, panelRadius: 20, panelShadowEnabled: true, panelShadowColor: '#ff0000', panelShadowBlur: 20, panelTextColor: '#ffffff', panelTextSecondaryColor: '#ffc1cc' },
    { id: 'sapphire', name: 'Zafiro', panelBg: '#0f52ba', panelOpacity: 0.15, panelBlur: 15, panelRadius: 18, panelShadowEnabled: true, panelShadowColor: '#007fff', panelShadowBlur: 30, panelTextColor: '#f0f8ff', panelTextSecondaryColor: '#b0e0e6' },
    { id: 'emerald', name: 'Esmeralda', panelBg: '#50c878', panelOpacity: 0.2, panelBlur: 14, panelRadius: 16, panelShadowEnabled: true, panelShadowColor: '#00ff7f', panelShadowBlur: 28, panelTextColor: '#ffffff', panelTextSecondaryColor: '#c0ffc0' },
    { id: 'ruby', name: 'Rubí', panelBg: '#e0115f', panelOpacity: 0.18, panelBlur: 16, panelRadius: 18, panelShadowEnabled: true, panelShadowColor: '#ff1493', panelShadowBlur: 32, panelTextColor: '#ffffff', panelTextSecondaryColor: '#ffcce5' },
    { id: 'amethyst', name: 'Amatista', panelBg: '#9966cc', panelOpacity: 0.22, panelBlur: 13, panelRadius: 17, panelShadowEnabled: true, panelShadowColor: '#bf94e4', panelShadowBlur: 26, panelTextColor: '#fdfdff', panelTextSecondaryColor: '#e1bee7' },
    { id: 'obsidian', name: 'Obsidiana', panelBg: '#0b0b0b', panelOpacity: 0.1, panelBlur: 20, panelRadius: 10, panelShadowEnabled: true, panelShadowColor: '#ffffff', panelShadowBlur: 20, panelTextColor: '#ffffff', panelTextSecondaryColor: '#cccccc' },
    { id: 'marble', name: 'Mármol', panelBg: '#ffffff', panelOpacity: 0.05, panelBlur: 3, panelRadius: 12, panelShadowEnabled: true, panelShadowColor: '#d3d3d3', panelShadowBlur: 10, panelTextColor: '#1a1a1a', panelTextSecondaryColor: '#555555' },
    { id: 'smoke', name: 'Humo', panelBg: '#333333', panelOpacity: 0.3, panelBlur: 18, panelRadius: 14, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 25, panelTextColor: '#ffffff', panelTextSecondaryColor: '#e0e0e0' },
    { id: 'sand', name: 'Arena', panelBg: '#c2b280', panelOpacity: 0.4, panelBlur: 5, panelRadius: 10, panelShadowEnabled: false, panelTextColor: '#4a3c2a', panelTextSecondaryColor: '#6d4c41' },
    { id: 'night-sky', name: 'Cielo Nocturno', panelBg: '#000033', panelOpacity: 0.1, panelBlur: 10, panelRadius: 16, panelShadowEnabled: true, panelShadowColor: '#ffffff', panelShadowBlur: 15, panelTextColor: '#f0f8ff', panelTextSecondaryColor: '#bbdefb' },
    { id: 'aurora', name: 'Aurora', panelBg: '#003366', panelOpacity: 0.15, panelBlur: 15, panelRadius: 20, panelShadowEnabled: true, panelShadowColor: '#7df9ff', panelShadowBlur: 30, panelTextColor: '#f0ffff', panelTextSecondaryColor: '#b3ffff' },
    { id: 'copper', name: 'Cobre', panelBg: '#b87333', panelOpacity: 0.5, panelBlur: 4, panelRadius: 8, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 12, panelTextColor: '#ffffff', panelTextSecondaryColor: '#ffe0b2' },
    { id: 'bronze', name: 'Bronce', panelBg: '#cd7f32', panelOpacity: 0.6, panelBlur: 3, panelRadius: 9, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 14, panelTextColor: '#ffffff', panelTextSecondaryColor: '#ffecb3' },
    { id: 'graphite', name: 'Grafito', panelBg: '#252525', panelOpacity: 0.9, panelBlur: 0, panelRadius: 5, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 20, panelTextColor: '#f5f5f5', panelTextSecondaryColor: '#bdbdbd' },
    { id: 'parchment', name: 'Pergamino', panelBg: '#fcf5e5', panelOpacity: 0.85, panelBlur: 1, panelRadius: 4, panelShadowEnabled: true, panelShadowColor: '#d2b48c', panelShadowBlur: 10, panelTextColor: '#5d4037', panelTextSecondaryColor: '#795548' },
    { id: 'neon-blue', name: 'Neón Azul', panelBg: '#000022', panelOpacity: 0.1, panelBlur: 12, panelRadius: 20, panelShadowEnabled: true, panelShadowColor: '#0000ff', panelShadowBlur: 25, panelTextColor: '#f0f8ff', panelTextSecondaryColor: '#82b1ff' },
    { id: 'neon-green', name: 'Neón Verde', panelBg: '#002200', panelOpacity: 0.1, panelBlur: 12, panelRadius: 20, panelShadowEnabled: true, panelShadowColor: '#00ff00', panelShadowBlur: 25, panelTextColor: '#f0fff0', panelTextSecondaryColor: '#a5d6a7' },
    { id: 'pastel-pink', name: 'Rosa Pastel', panelBg: '#ffc0cb', panelOpacity: 0.3, panelBlur: 8, panelRadius: 16, panelShadowEnabled: false, panelTextColor: '#7c002e', panelTextSecondaryColor: '#c2185b' },
    { id: 'pastel-blue', name: 'Azul Pastel', panelBg: '#aec6cf', panelOpacity: 0.3, panelBlur: 8, panelRadius: 16, panelShadowEnabled: false, panelTextColor: '#1a237e', panelTextSecondaryColor: '#283593' },
    { id: 'holographic', name: 'Holográfico', panelBg: '#ffffff', panelOpacity: 0.05, panelBlur: 15, panelRadius: 25, panelShadowEnabled: true, panelShadowColor: '#ff00ff', panelShadowBlur: 35, panelTextColor: '#4a148c', panelTextSecondaryColor: '#7b1fa2' },
    { id: 'solarized-dark', name: 'Solarized Oscuro', panelBg: '#002b36', panelOpacity: 0.8, panelBlur: 1, panelRadius: 6, panelShadowEnabled: false, panelTextColor: '#93a1a1', panelTextSecondaryColor: '#657b83' },
    { id: 'solarized-light', name: 'Solarized Claro', panelBg: '#fdf6e3', panelOpacity: 0.7, panelBlur: 1, panelRadius: 6, panelShadowEnabled: false, panelTextColor: '#586e75', panelTextSecondaryColor: '#839496' },
    { id: 'paper', name: 'Papel', panelBg: '#ffffff', panelOpacity: 0.95, panelBlur: 0, panelRadius: 2, panelShadowEnabled: true, panelShadowColor: '#cccccc', panelShadowBlur: 8, panelTextColor: '#212121', panelTextSecondaryColor: '#757575' },
    { id: 'sunrise', name: 'Amanecer', panelBg: '#ff8c69', panelOpacity: 0.15, panelBlur: 12, panelRadius: 16, panelShadowEnabled: true, panelShadowColor: '#ff4500', panelShadowBlur: 25, panelTextColor: '#ffffff', panelTextSecondaryColor: '#ffdab9' },
    { id: 'cyberpunk', name: 'Cyberpunk', panelBg: '#2c003e', panelOpacity: 0.1, panelBlur: 15, panelRadius: 8, panelShadowEnabled: true, panelShadowColor: '#00ffff', panelShadowBlur: 30, panelTextColor: '#ff00ff', panelTextSecondaryColor: '#00ffff' },
    { id: 'light-minimal', name: 'Minimal Claro', panelBg: '#f0f0f0', panelOpacity: 0.2, panelBlur: 2, panelRadius: 8, panelShadowEnabled: true, panelShadowColor: '#dcdcdc', panelShadowBlur: 10, panelTextColor: '#212121', panelTextSecondaryColor: '#666666' },
    { id: 'dark-minimal', name: 'Minimal Oscuro', panelBg: '#121212', panelOpacity: 0.3, panelBlur: 2, panelRadius: 8, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 15, panelTextColor: '#e0e0e0', panelTextSecondaryColor: '#b0b0b0' },
    { id: 'intense-red', name: 'Rojo Intenso', panelBg: '#6e0000', panelOpacity: 0.2, panelBlur: 10, panelRadius: 12, panelShadowEnabled: true, panelShadowColor: '#ff0000', panelShadowBlur: 20, panelTextColor: '#ffffff', panelTextSecondaryColor: '#ffcdd2' },
    { id: 'luxury-gold', name: 'Dorado Lujo', panelBg: '#b8860b', panelOpacity: 0.15, panelBlur: 8, panelRadius: 18, panelShadowEnabled: true, panelShadowColor: '#daa520', panelShadowBlur: 22, panelTextColor: '#ffffff', panelTextSecondaryColor: '#fff8e1' },
    { id: 'ice', name: 'Hielo', panelBg: '#add8e6', panelOpacity: 0.1, panelBlur: 18, panelRadius: 22, panelShadowEnabled: true, panelShadowColor: '#ffffff', panelShadowBlur: 25, panelTextColor: '#0d47a1', panelTextSecondaryColor: '#1565c0' },
    { id: 'slate', name: 'Pizarra', panelBg: '#2f4f4f', panelOpacity: 0.7, panelBlur: 1, panelRadius: 6, panelShadowEnabled: true, panelShadowColor: '#000000', panelShadowBlur: 10, panelTextColor: '#f0f8ff', panelTextSecondaryColor: '#b0bec5' },
    { id: 'neon', name: 'Neón', panelBg: '#1a001a', panelOpacity: 0.1, panelBlur: 12, panelRadius: 20, panelShadowEnabled: true, panelShadowColor: '#ff00ff', panelShadowBlur: 25, panelTextColor: '#ffffff', panelTextSecondaryColor: '#f8bbd0' },
    { id: 'transparent', name: 'Transparente', panelBg: '#000000', panelOpacity: 0, panelBlur: 0, panelRadius: 12, panelShadowEnabled: false, panelTextColor: '#dbe7ff', panelTextSecondaryColor: '#dbe7ff' }
];

export function initPanelSettings() {
    renderPanelThemes();

    // Listeners para las sub-pestañas de paneles
    $$('#tab-paneles .sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToPanelSubTab(btn.dataset.subtab));
    });

    // Controles existentes
    $('#panelColor').addEventListener('input', (e) => handleColorChange('panelBg', e.target.value, '--panel-bg'));
    $('#panelTextColor').addEventListener('input', (e) => handleColorChange('panelTextColor', e.target.value, '--panel-text-color'));
    $('#panelTextSecondaryColor').addEventListener('input', (e) => handleColorChange('panelTextSecondaryColor', e.target.value, '--panel-text-secondary-color'));
    $('#panelOpacity').addEventListener('input', (e) => handlePanelSliderChange('panelOpacity', e.target.value, '--panel-opacity'));
    $('#panelBlur').addEventListener('input', (e) => handlePanelSliderChange('panelBlur', e.target.value, '--panel-blur', 'px'));
    $('#panelRadius').addEventListener('input', (e) => handlePanelSliderChange('panelRadius', e.target.value, '--panel-radius', 'px'));
    $('#resetPanelsBtn').addEventListener('click', resetPanelStyles);

    // Nuevos controles para la sombra
    $('#panelShadowToggle').addEventListener('change', handleShadowToggle);
    $('#panelShadowColor').addEventListener('input', (e) => handleShadowColorChange(e.target.value));
    $('#panelShadowBlur').addEventListener('input', (e) => handlePanelSliderChange('panelShadowBlur', e.target.value, '--panel-shadow-blur', 'px'));

    // Cargar y aplicar estado inicial
    loadAndApplyPanelSettings();
}

function switchToPanelSubTab(subTabId) {
    // Ocultar todos los paneles y desactivar todos los botones
    $$('#tab-paneles .sub-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    $$('#tab-paneles .sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activar el panel y el botón correctos
    const paneToActivate = $(`#subtab-${subTabId}`);
    const btnToActivate = $(`.sub-tab-btn[data-subtab="${subTabId}"]`);
    if (paneToActivate) paneToActivate.classList.add('active');
    if (btnToActivate) btnToActivate.classList.add('active');
}

function renderPanelThemes() {
    const listEl = $('#panel-theme-list');
    PANEL_THEMES.forEach(theme => {
        const btn = document.createElement('button');
        btn.className = 'theme-btn panel-theme-btn';
        btn.dataset.themeId = theme.id;
        btn.innerHTML = `<span class="theme-name">${theme.name}</span>`;
        // Previsualización del tema más precisa
        const previewOpacity = theme.panelOpacity > 0.1 ? theme.panelOpacity : (theme.panelOpacity + 0.1);
        btn.style.backgroundColor = `${theme.panelBg}${Math.round(previewOpacity * 255).toString(16).padStart(2, '0')}`;
        btn.style.backdropFilter = `blur(${theme.panelBlur}px)`;
        btn.style.borderRadius = `${theme.panelRadius}px`;
        btn.style.color = theme.panelTextColor; // Usar el color de texto del tema para la previsualización
        btn.style.border = '1px solid rgba(255,255,255,0.1)';

        btn.addEventListener('click', () => applyPanelTheme(theme.id));
        listEl.appendChild(btn);
    });
}

function handleColorChange(key, color, cssVar) {
    document.documentElement.style.setProperty(cssVar, color);
    saveAndSyncSetting({ [key]: color });
    if (key === 'panelBg') {
        updatePanelRgb(color);
    }
    clearActiveTheme();
}

function handleShadowColorChange(color) {
    document.documentElement.style.setProperty('--panel-shadow-color', color);
    saveAndSyncSetting({ panelShadowColor: color });
    clearActiveTheme();
}

function handlePanelSliderChange(key, value, cssVar, unit = '') {
    document.documentElement.style.setProperty(cssVar, `${value}${unit}`);
    saveAndSyncSetting({ [key]: value });
    updateSliderValueSpans();
    clearActiveTheme();
}

function handleShadowToggle(e) {
    const enabled = e.target.checked;
    $('#panelShadowOptions').hidden = !enabled;
    saveAndSyncSetting({ panelShadowEnabled: enabled });
    applyShadowStyle(enabled);
    clearActiveTheme();
}

function applyPanelTheme(themeId) {
    const theme = PANEL_THEMES.find(t => t.id === themeId);
    if (!theme) return;

    // Aplicar todos los valores del tema
    $('#panelColor').value = theme.panelBg; handleColorChange('panelBg', theme.panelBg, '--panel-bg');
    $('#panelTextColor').value = theme.panelTextColor; handleColorChange('panelTextColor', theme.panelTextColor, '--panel-text-color');
    $('#panelTextSecondaryColor').value = theme.panelTextSecondaryColor; handleColorChange('panelTextSecondaryColor', theme.panelTextSecondaryColor, '--panel-text-secondary-color');
    $('#panelOpacity').value = theme.panelOpacity;
    handlePanelSliderChange('panelOpacity', theme.panelOpacity, '--panel-opacity');
    $('#panelBlur').value = theme.panelBlur;
    handlePanelSliderChange('panelBlur', theme.panelBlur, '--panel-blur', 'px');
    $('#panelRadius').value = theme.panelRadius;
    handlePanelSliderChange('panelRadius', theme.panelRadius, '--panel-radius', 'px');

    $('#panelShadowToggle').checked = theme.panelShadowEnabled;
    handleShadowToggle({ target: { checked: theme.panelShadowEnabled } });

    if (theme.panelShadowEnabled) {
        $('#panelShadowColor').value = theme.panelShadowColor;
        handleShadowColorChange(theme.panelShadowColor);
        $('#panelShadowBlur').value = theme.panelShadowBlur;
        handlePanelSliderChange('panelShadowBlur', theme.panelShadowBlur, '--panel-shadow-blur', 'px');
    }

    saveAndSyncSetting({ activePanelTheme: themeId });
    updateActivePanelThemeButton(themeId);
}

export function updateSliderValueSpans() {
    $('#opacityValue').textContent = `${Math.round($('#panelOpacity').value * 100)}%`;
    $('#blurValue').textContent = `${$('#panelBlur').value}px`;
    $('#radiusValue').textContent = `${$('#panelRadius').value}px`;
    $('#shadowBlurValue').textContent = `${$('#panelShadowBlur').value}px`;
}

export function updatePanelRgb(hex) {
    const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16));
    document.documentElement.style.setProperty('--panel-bg-rgb', rgb.join(', '));
}

async function resetPanelStyles() {
    if (!confirm('¿Restablecer todos los estilos de los paneles a sus valores por defecto?')) return;

    // Simplemente aplica el tema "default"
    applyPanelTheme('default');
}

function clearActiveTheme() {
    saveAndSyncSetting({ activePanelTheme: null });
    updateActivePanelThemeButton(null);
}

async function loadAndApplyPanelSettings() {
    const settings = await storageGet([
        'panelBg', 'panelOpacity', 'panelBlur', 'panelRadius',
        'panelTextColor', 'panelTextSecondaryColor',
        'panelShadowEnabled', 'panelShadowColor', 'panelShadowBlur',
        'activePanelTheme'
    ]);

    // Aplicar valores o defaults
    const panelBg = settings.panelBg || '#0e193a';
    $('#panelColor').value = panelBg; handleColorChange('panelBg', panelBg, '--panel-bg');
    $('#panelTextColor').value = settings.panelTextColor || '#dbe7ff'; handleColorChange('panelTextColor', settings.panelTextColor || '#dbe7ff', '--panel-text-color');
    $('#panelTextSecondaryColor').value = settings.panelTextSecondaryColor || '#dbe7ff'; handleColorChange('panelTextSecondaryColor', settings.panelTextSecondaryColor || '#dbe7ff', '--panel-text-secondary-color');

    $('#panelOpacity').value = settings.panelOpacity ?? 0.05;
    $('#panelBlur').value = settings.panelBlur ?? 6;
    $('#panelRadius').value = settings.panelRadius ?? 12;

    const shadowEnabled = settings.panelShadowEnabled || false;
    $('#panelShadowToggle').checked = shadowEnabled;
    $('#panelShadowOptions').hidden = !shadowEnabled;
    applyShadowStyle(shadowEnabled);

    const shadowColor = settings.panelShadowColor || '#000000';
    $('#panelShadowColor').value = shadowColor; handleShadowColorChange(shadowColor);
    $('#panelShadowBlur').value = settings.panelShadowBlur ?? 10;

    // Actualizar estilos y sliders
    document.documentElement.style.setProperty('--panel-opacity', $('#panelOpacity').value);
    document.documentElement.style.setProperty('--panel-blur', `${$('#panelBlur').value}px`);
    document.documentElement.style.setProperty('--panel-radius', `${$('#panelRadius').value}px`);
    document.documentElement.style.setProperty('--panel-shadow-blur', `${$('#panelShadowBlur').value}px`);
    updateSliderValueSpans();
    updateActivePanelThemeButton(settings.activePanelTheme);
}

function updateActivePanelThemeButton(themeId) {
    $$('.panel-theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeId === themeId);
    });
}

function applyShadowStyle(enabled) {
    if (enabled) {
        document.documentElement.style.setProperty('--panel-shadow', '0 5px var(--panel-shadow-blur, 10px) var(--panel-shadow-color, #000000)');
    } else {
        document.documentElement.style.setProperty('--panel-shadow', 'none');
    }
}