import { $, $$, storageGet, storageSet } from './utils.js';
import { updateActiveThemeButton, updateActiveGradientButton, showSaveStatus, updateDataTabUI, renderGreeting, updateSliderValueSpans } from './ui.js';
import { tiles, trash, setTiles, setTrash, saveAndRender, renderTiles, renderTrash, renderNotes } from './tiles.js';
import { THEMES } from './themes.js';
import { GRADIENTS, DEFAULT_GRADIENT_COLORS } from '../utils/gradients.js';
import { FileSystem } from './file-system.js';
import { STORAGE_KEYS } from './config.js';

let appState = {};
let importInput;

export function initSettings(initialState) {
    appState = initialState;

    $$('.theme-btn').forEach(b => {
        const themeId = b.dataset.theme;
        const theme = THEMES[themeId];
        if (!theme) return;
        b.style.backgroundImage = theme.background;
        b.querySelector('.theme-name').textContent = theme.name;
        b.dataset.type = 'theme';
        b.addEventListener('click', handleThemeChange);
        b.addEventListener('mouseenter', handleThemeHover);
        b.addEventListener('mouseleave', handleBackgroundLeave);
    });

    $('#bgFile').addEventListener('change', handleBgFileChange);
    $('#bgUrl').addEventListener('input', (e) => {
        if (e.target.value.trim()) document.body.style.backgroundImage = `url('${e.target.value.trim()}')`;
    });
    $('#bgUrl').addEventListener('change', (e) => {
        const url = e.target.value.trim();
        if (!url) return;
        applyAndSaveBackground({ bgUrl: url, bgData: null, gradient: null, theme: null });
    });

    $('#randomBgToggle').checked = initialState.randomBg || false;
    $('#randomBgToggle').addEventListener('change', (e) => {
        storageSet({ randomBg: e.target.checked }).then(showSaveStatus);
    });

    // --- Nueva lógica para la pestaña de Datos ---
    $('#selectDirBtn').addEventListener('click', async () => {
        await FileSystem.selectDirectory();
        updateDataTabUI();
    });

    $('#autoSyncToggle').checked = initialState.autoSync || false;
    $('#autoSyncToggle').addEventListener('change', (e) => {
        storageSet({ autoSync: e.target.checked }).then(() => {
            showSaveStatus();
            updateDataTabUI();
        });
    });

    $('#manualSaveBtn').addEventListener('click', async () => {
        await FileSystem.saveDataToFile({ tiles, trash });
        showSaveStatus();
    });
    updateDataTabUI();

    // Add import/export buttons if not already added
    if (!$('#importJsonBtn')) {
        const importBtn = document.createElement('button');
        importBtn.id = 'importJsonBtn';
        importBtn.className = 'btn';
        importBtn.textContent = 'Importar JSON';
        importBtn.addEventListener('click', () => importInput.click());
        $('#selectDirBtn').parentNode.appendChild(importBtn);
    }

    if (!$('#exportJsonBtn')) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportJsonBtn';
        exportBtn.className = 'btn primary';
        exportBtn.textContent = 'Exportar JSON';
        exportBtn.addEventListener('click', exportData);
        $('#selectDirBtn').parentNode.appendChild(exportBtn);
    }

    // Add hidden input for import if not already added
    if (!importInput) {
        importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.addEventListener('change', handleImport);
        document.body.appendChild(importInput);
    }
}

export async function loadGradients(activeGradient) {
    const gradientListEl = $('#gradient-list');

    gradientListEl.innerHTML = '';
    GRADIENTS.forEach(g => {
        const btn = document.createElement('button');
        btn.className = 'gradient-btn';
        btn.style.backgroundImage = g.gradient;
        btn.title = g.name.trim(); // Show name on hover
        btn.dataset.gradientId = g.id;
        btn.dataset.type = 'gradient';
        if (g.id === activeGradient) btn.classList.add('active');
        btn.addEventListener('click', handleBackgroundChange);
        btn.addEventListener('mouseenter', handleBackgroundHover);
        btn.addEventListener('mouseleave', handleBackgroundLeave);
        gradientListEl.appendChild(btn);
    });
}

export function applyTheme(themeId) {
    const theme = THEMES[themeId];
    if (!theme) return;

    // Aplicar todas las variables CSS del tema
    for (const [key, value] of Object.entries(theme.cssVariables)) {
        document.documentElement.style.setProperty(key, value);
    }

    // Convertir color del panel a RGB para usar con opacidad
    const panelBg = theme.cssVariables['--panel-bg'];
    if (panelBg.startsWith('#')) {
        const r = parseInt(panelBg.slice(1, 3), 16);
        const g = parseInt(panelBg.slice(3, 5), 16);
        const b = parseInt(panelBg.slice(5, 7), 16);
        document.documentElement.style.setProperty('--panel-bg-rgb', `${r}, ${g}, ${b}`);
    }

    document.body.style.backgroundImage = theme.background;
    document.body.classList.add('theme-background');
}

export function applyGradient(gradientId) {
    const gradient = GRADIENTS.find(g => g.id === gradientId);
    if (!gradient) return;

    const colors = gradient.cssVariables || DEFAULT_GRADIENT_COLORS;

    // Aplicar todas las variables CSS del degradado (o las por defecto)
    for (const [key, value] of Object.entries(colors)) {
        document.documentElement.style.setProperty(key, value);
    }

    // Convertir color del panel a RGB para usar con opacidad
    const panelBg = colors['--panel-bg'];
    if (panelBg.startsWith('#')) {
        const r = parseInt(panelBg.slice(1, 3), 16);
        const g = parseInt(panelBg.slice(3, 5), 16);
        const b = parseInt(panelBg.slice(5, 7), 16);
        document.documentElement.style.setProperty('--panel-bg-rgb', `${r}, ${g}, ${b}`);
    }

    document.body.style.backgroundImage = gradient.gradient;
}

function handleThemeChange(e) {
    const newTheme = e.target.dataset.theme;
    applyAndSaveBackground({ theme: newTheme, bgUrl: null, bgData: null, gradient: null });
}

function handleBgFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Liberar memoria del Object URL anterior si existe
    if (appState.currentBackgroundValue && appState.currentBackgroundValue.startsWith('blob:')) {
        URL.revokeObjectURL(appState.currentBackgroundValue);
    }
    const reader = new FileReader();
    reader.onload = e => {
        applyAndSaveBackground({ bgData: e.target.result, bgUrl: null, gradient: null, theme: null });
        updateActiveThemeButton(null);
        updateActiveGradientButton(null);
        $('#bgUrl').value = '';
    };
    reader.readAsDataURL(file);
}

function applyAndSaveBackground(settings) {
    const { bgData, bgUrl, gradient, theme } = settings;

    // Liberar memoria del Object URL anterior si estamos cambiando a un fondo que no es un blob
    if (appState.currentBackgroundValue && appState.currentBackgroundValue.startsWith('blob:')) {
        URL.revokeObjectURL(appState.currentBackgroundValue);
    }

    document.body.classList.remove('theme-background');
    document.body.style.backgroundImage = '';

    if (bgData) appState.currentBackgroundValue = `url('${bgData}')`;
    else if (bgUrl) appState.currentBackgroundValue = `url('${bgUrl}')`;
    else if (gradient) {
        appState.currentGradient = gradient;
        applyGradient(gradient);
    } else if (theme) {
        appState.currentTheme = theme;
        applyTheme(theme);
    }

    updateActiveThemeButton(theme);
    updateActiveGradientButton(gradient);
    storageSet(settings).then(showSaveStatus);
}

function handleBackgroundChange(e) {
    const gradientId = e.target.dataset.gradientId;
    applyAndSaveBackground({ gradient: gradientId, bgUrl: null, bgData: null, theme: null });
}

function handleBackgroundHover(e) {
    const target = e.target;
    document.body.setAttribute('data-theme-preview', 'true');
    document.body.classList.remove('theme-background');

    if (target.dataset.type === 'gradient') {
        const gradientId = target.dataset.gradientId;
        const gradient = GRADIENTS.find(g => g.id === gradientId);
        if (!gradient) return;
        applyGradient(gradientId); // Reutilizamos la función para aplicar colores y fondo
    }
}

function handleThemeHover(e) {
    const themeId = e.target.dataset.theme;
    const theme = THEMES[themeId];
    if (!theme) return;

    document.body.setAttribute('data-theme-preview', 'true');
    for (const [key, value] of Object.entries(theme.cssVariables)) {
        document.documentElement.style.setProperty(key, value);
    }
    document.body.style.backgroundImage = theme.background;
}

function handleBackgroundLeave() {
    document.body.removeAttribute('data-theme-preview');
    // Re-apply the saved theme/gradient/background
    if (appState.currentGradient) {
        applyGradient(appState.currentGradient);
    } else if (appState.currentTheme) {
        applyTheme(appState.currentTheme);
    } else {
        // Si no hay tema ni gradiente, podría ser una URL, la reaplicamos
        document.body.style.backgroundImage = appState.currentBackgroundValue;
        // Reseteamos las variables CSS a las por defecto de los gradientes
        applyGradient(GRADIENTS[0].id); // Aplica el primer gradiente como fallback de colores
    }
}

async function exportData() {
    const allData = await storageGet(STORAGE_KEYS);
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tablero-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await storageSet(data);
            if (data.tiles) setTiles(data.tiles);
            if (data.trash) setTrash(data.trash);
            renderTiles();
            renderTrash();
            renderNotes();
            // Update settings
            if (data.userName !== undefined) {
                $('#userName').value = data.userName;
                renderGreeting(data.userName);
            }
            if (data.currentTheme) applyTheme(data.currentTheme);
            if (data.currentGradient) applyGradient(data.currentGradient);
            if (data.panelOpacity) {
                $('#panelOpacity').value = data.panelOpacity;
                document.documentElement.style.setProperty('--panel-opacity', data.panelOpacity);
                updateSliderValueSpans();
            }
            if (data.panelBlur) {
                $('#panelBlur').value = data.panelBlur;
                document.documentElement.style.setProperty('--panel-blur', `${data.panelBlur}px`);
                updateSliderValueSpans();
            }
            showSaveStatus();
            alert('Datos importados correctamente.');
        } catch (err) {
            alert('Error al importar el archivo JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
}
