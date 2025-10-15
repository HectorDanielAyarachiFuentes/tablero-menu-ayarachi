import { $, $$, storageGet, storageSet } from './utils.js';
import { saveAndSyncSetting } from './utils.js';
import { updateActiveGradientButton, showSaveStatus, updateDataTabUI, renderGreeting, updateSliderValueSpans, updateBgModeUI, updatePanelRgb } from './ui.js';
import { updateBackground } from './app.js';
import { tiles, trash, setTiles, setTrash, saveAndRender, renderTiles, renderTrash, renderNotes } from './tiles.js';
import { THEMES } from './themes-config.js';
import { GRADIENTS, DEFAULT_GRADIENT_COLORS } from '../utils/gradients.js';
import { FileSystem } from './file-system.js';
import { STORAGE_KEYS } from './config.js';

let appState = {};
let importInput;

const DEFAULT_PANEL_SETTINGS = {
    panelBg: '#0e193a',
    panelOpacity: 0.05,
    panelBlur: 6,
    panelRadius: 12
};

export function initSettings(initialState) {
    appState = initialState;

    $$('.theme-btn').forEach(b => {
        const themeId = b.dataset.theme;
        const theme = THEMES[themeId];
        if (!theme) return;
        b.style.setProperty('--theme-bg-preview', theme.background);
        b.querySelector('.theme-name').textContent = theme.name;
        b.dataset.type = 'theme';
        b.addEventListener('click', handleThemeChange);
        b.addEventListener('mouseenter', handleThemeHover);
        b.addEventListener('mouseleave', handleBackgroundLeave);
    });

    $('#bgFile').addEventListener('change', handleBgFileChange);
    $('#bgUrl').addEventListener('input', (e) => {
        if (e.target.value.trim()) document.body.style.setProperty('--bg-image', `url('${e.target.value.trim()}')`);
    });
    $('#bgUrl').addEventListener('change', async (e) => {
        const url = e.target.value.trim();
        if (!url) return;
        const { bgDisplayMode: currentMode } = await storageGet(['bgDisplayMode']);
        const mode = currentMode || 'cover';
        saveAndSyncSetting({ bgUrl: url, bgData: null, gradient: null, theme: null, doodle: 'none', bgDisplayMode: mode }, updateBackground);
    });

    $$('#bgModeSelector button').forEach(btn => {
        btn.addEventListener('click', handleBgModeChange);
    });
    updateBgModeUI(initialState.isCustomBg, initialState.bgDisplayMode);
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

    // Listener para el botón de re-seleccionar carpeta en el mensaje de error.
    // Se añade al cuerpo de la configuración para usar delegación de eventos.
    $('.settings-body').addEventListener('click', async (e) => {
        if (e.target.id === 'reselectDirFromError') {
            const handle = await FileSystem.getDirectoryHandle(true); // true para forzar la solicitud de permiso
            updateDataTabUI();
            if (handle) showSaveStatus(); // Oculta el mensaje de error si se obtiene el permiso
        }
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
        btn.style.setProperty('--gradient-bg-preview', g.gradient);
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

    // Si no hay un color de panel personalizado, usar el del tema.
    storageGet(['panelBg']).then(({ panelBg }) => {
        if (!panelBg) updatePanelRgb(theme.cssVariables['--panel-bg']);
    });

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

    // Si no hay un color de panel personalizado, usar el del degradado.
    storageGet(['panelBg']).then(({ panelBg }) => {
        if (!panelBg) updatePanelRgb(colors['--panel-bg']);
    });

    document.body.style.backgroundImage = gradient.gradient;
}

export function applyBackgroundStyles(mode = 'cover') {
    const style = document.body.style;

    if (mode === 'contain') {
        style.backgroundSize = 'contain';
        style.backgroundPosition = 'center center';
        style.backgroundRepeat = 'no-repeat';
    } else if (mode === 'stretch') {
        style.backgroundSize = '100% 100%';
        style.backgroundPosition = 'center center';
        style.backgroundRepeat = 'no-repeat';
    } else if (mode === 'center') {
        style.backgroundSize = 'auto';
        style.backgroundPosition = 'center center'; // Asegurar que esté centrado
        style.backgroundRepeat = 'no-repeat';
    } else { // 'cover' is the default
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center center';
        style.backgroundRepeat = 'no-repeat';
    }
    document.documentElement.style.setProperty('--panel-radius', `${appState.panelRadius || DEFAULT_PANEL_SETTINGS.panelRadius}px`);
    document.body.classList.remove('theme-background');
}

function handleBgFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Liberar memoria del Object URL anterior si existe
    if (appState.currentBackgroundValue && appState.currentBackgroundValue.startsWith('blob:')) {
        URL.revokeObjectURL(appState.currentBackgroundValue);
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const { bgDisplayMode } = await storageGet(['bgDisplayMode']);
        const mode = bgDisplayMode || 'cover';
        // Guardamos y sincronizamos, asegurándonos de desactivar el doodle
        saveAndSyncSetting({ bgData: e.target.result, bgUrl: null, gradient: null, doodle: 'none', bgDisplayMode: mode }, updateBackground);
        // Actualizamos la UI después de guardar
        $('#bgUrl').value = '';
    };
    reader.readAsDataURL(file);
}

function handleBgModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    saveAndSyncSetting({ bgDisplayMode: mode }, updateBackground);
    updateBgModeUI(true, mode);
}

function handleBackgroundChange(e) {
    const gradientId = e.target.dataset.gradientId;
    saveAndSyncSetting({ gradient: gradientId, bgUrl: null, bgData: null, doodle: 'none' }, updateBackground);
    // Actualizamos el estado de la aplicación para que el hover no lo revierta al anterior.
    appState.currentGradient = gradientId;
    appState.currentBackgroundValue = null;
    appState.currentTheme = null;
}

function handleBackgroundHover(e) {
    const target = e.target;
    if (target.dataset.type === 'gradient') {
        const gradientId = target.dataset.gradientId;
        const gradient = GRADIENTS.find(g => g.id === gradientId);
        if (!gradient) return;
        document.body.style.backgroundImage = gradient.gradient;
    }
}

function handleBackgroundLeave() {
    // Restaura el fondo a la configuración guardada
    let backgroundToRestore;

    if (appState.currentGradient) {
        const gradient = GRADIENTS.find(g => g.id === appState.currentGradient);
        backgroundToRestore = gradient ? gradient.gradient : 'none';
    } else {
        backgroundToRestore = appState.currentBackgroundValue || 'none';
    }

    document.body.style.backgroundImage = backgroundToRestore;
}

/**
 * Importa los marcadores del navegador y los añade al tablero.
 */
async function importBrowserBookmarks() {
    if (!confirm('Esto añadirá todos tus marcadores al inicio de la lista de accesos. ¿Quieres continuar?')) {
        return;
    }
    const { getBookmarks } = await import('./app.js');
    const bookmarks = await getBookmarks();
    if (bookmarks.length > 0) {
        setTiles([...bookmarks, ...tiles]);
        saveAndRender();
        alert(`${bookmarks.length} marcadores han sido importados y añadidos a tu tablero.`);
    } else {
        alert('No se encontraron marcadores para importar.');
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
