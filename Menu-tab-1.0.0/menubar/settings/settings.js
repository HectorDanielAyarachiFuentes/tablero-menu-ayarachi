/**
 * Gestiona toda la lógica del panel de configuración.
 * Incluye la inicialización de los listeners para las diferentes pestañas (Fondo, Datos, etc.),
 * y maneja la lógica para cambiar temas, fondos, importar/exportar datos y más.
 */
import { $, $$, storageGet, storageSet } from '../core/utils.js';
import { saveAndSyncSetting } from '../core/utils.js';
import { updateActiveGradientButton, showSaveStatus, updateDataTabUI, renderGreeting, updateBgModeUI } from '../components/ui.js';
import { updateSliderValueSpans, updatePanelRgb } from './settings-panels.js';
import { updateBackground } from '../app.js';
import { tiles, trash, setTiles, setTrash, saveAndRender, renderTiles } from '../core/tiles.js';
import { renderNotes } from '../components/notes.js';
import { renderTrash } from '../components/trash.js';
import { GRADIENTS, DEFAULT_GRADIENT_COLORS } from '../../utils/gradients.js';
import { FileSystem } from '../system/file-system.js';
import { STORAGE_KEYS } from '../core/config.js';

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

    $('#bgFile').addEventListener('change', handleBgFileChange);
    $('#bgUrl').addEventListener('input', (e) => {
        if (e.target.value.trim()) document.body.style.setProperty('--bg-image', `url('${e.target.value.trim()}')`);
    });
    $('#bgUrl').addEventListener('change', async (e) => {
        const url = e.target.value.trim();
        if (!url) return;
        const { bgDisplayMode: currentMode } = await storageGet(['bgDisplayMode']);
        const mode = currentMode || 'cover'; // theme: null is removed
        saveAndSyncSetting({ bgUrl: url, bgData: null, gradient: null, doodle: 'none', bgDisplayMode: mode }, updateBackground);
    });

    $$('#bgModeSelector button').forEach(btn => {
        btn.addEventListener('click', handleBgModeChange);
    });
    updateBgModeUI(initialState.isCustomBg, initialState.bgDisplayMode);
    $('#randomBgToggle').checked = initialState.randomBg || false;
    $('#randomBgToggle').addEventListener('change', (e) => { // CAMBIO: El texto de la etiqueta se cambió en el HTML
        storageSet({ randomBg: e.target.checked }).then(showSaveStatus);
    });

    $$('#tab-fondo .sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToBackgroundSubTab(btn.dataset.subtab));
    });

    // --- Nueva lógica para la pestaña de Datos ---
    $('#selectDirBtn').addEventListener('click', async () => {
        let options = {
            id: 'tablero-data-directory', // Un ID para que el navegador recuerde la última ubicación
            mode: 'readwrite'
        };
        // Comprobamos si estamos renovando un permiso perdido.
        const permissionState = await FileSystem.getPermissionState();
        if (permissionState === 'prompt') {
            // Si es así, obtenemos el handle anterior para sugerirlo al selector de carpetas.
            // Esto hace que el navegador pregunte directamente por esa carpeta en lugar de abrir el explorador.
            const previousHandle = await FileSystem.getDirectoryHandle(false);
            // ¡CORRECCIÓN! Solo asignamos startIn si el handle es válido.
            if (previousHandle) {
                options.startIn = previousHandle;
            }
        }
        const handle = await FileSystem.selectDirectory(options);
        updateDataTabUI();
        // MEJORA: Si se seleccionó un directorio, ocultamos el mensaje de error y mostramos "Guardado!".
        if (handle) {
            showSaveStatus(); // Esto reemplazará el mensaje de error.
        }
        // Disparamos un evento personalizado para notificar que la selección ha terminado.
        const event = new CustomEvent('directorySelected');
        $('#selectDirBtn').dispatchEvent(event);
    });

    $('#autoSyncToggle').checked = initialState.autoSync || false;
    $('#autoSyncToggle').addEventListener('change', (e) => {
        storageSet({ autoSync: e.target.checked }).then(() => {
            showSaveStatus();
            updateDataTabUI();
        });
    });

    $('#hideWarningToggle').checked = initialState.hideWarning || false;
    $('#hideWarningToggle').addEventListener('change', (e) => {
        storageSet({ hideWarning: e.target.checked }).then(showSaveStatus);
    });

    // Listener para el botón de re-seleccionar carpeta en el mensaje de error.
    // Se añade al cuerpo de la configuración para usar delegación de eventos.
    $('.settings-body').addEventListener('click', async (e) => {
        if (e.target.id === 'reselectDirFromError') {
            // Simulamos un clic en el botón principal para que el usuario pueda re-seleccionar la carpeta.
            // Usamos una promesa para saber cuándo termina la selección.
            const dirSelectedPromise = new Promise(resolve => {
                const btn = $('#selectDirBtn');
                btn.addEventListener('directorySelected', resolve, { once: true });
                btn.click();
            });
            await dirSelectedPromise;
        }
    });

    updateDataTabUI();

    // Listeners para los botones de Importar/Exportar
    $('#importJsonBtn').addEventListener('click', () => importInput.click());
    $('#exportJsonBtn').addEventListener('click', exportData);

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

/**
 * Cambia entre las sub-pestañas de la sección "Fondo".
 * @param {string} subTabId - El ID de la sub-pestaña a activar (ej. 'degradados', 'imagen').
 */
function switchToBackgroundSubTab(subTabId) {
    // Ocultar todos los paneles y desactivar todos los botones de la pestaña Fondo
    $$('#tab-fondo .sub-tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    $$('#tab-fondo .sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activar el panel y el botón correctos
    $(`#subtab-${subTabId}`).classList.add('active');
    $(`.sub-tab-btn[data-subtab="${subTabId}"]`).classList.add('active');
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
        gradientListEl.appendChild(btn);
    });
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
        saveAndSyncSetting({ bgData: e.target.result, bgUrl: null, gradient: null, doodle: 'none', bgDisplayMode: mode }, updateBackground); // theme: null is removed
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
    saveAndSyncSetting({ gradient: gradientId, bgUrl: null, bgData: null, doodle: 'none' }, updateBackground); // theme: null is removed
    // Actualizamos el estado de la aplicación para que el hover no lo revierta al anterior.
    appState.currentGradient = gradientId;
    appState.currentBackgroundValue = null;
}

function handleBackgroundHover(e) {
    const target = e.target;
}

/**
 * Importa los marcadores del navegador y los añade al tablero.
 */
async function importBrowserBookmarks() {
    if (!confirm('Esto añadirá todos tus marcadores al inicio de la lista de accesos. ¿Quieres continuar?')) {
        return;
    }
    const { getBookmarks } = await import('../app.js');
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
