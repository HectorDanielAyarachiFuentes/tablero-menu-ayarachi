import { $, $$, saveAndSyncSetting, storageGet } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderTiles, saveAndRender, tiles, trash, closeModal, setTiles, setTrash } from './tiles.js';
import { FileSystem } from './file-system.js';

export function initUI() {
    updateClock();
    setInterval(updateClock, 1000);

    $('#openSettings').addEventListener('click', () => toggleSettings(true));
    $('#closeSettings').addEventListener('click', () => toggleSettings(false));
    $('#openNotes').addEventListener('click', () => toggleNotesPanel(true));
    $('#closeNotes').addEventListener('click', () => toggleNotesPanel(false));

    document.addEventListener('click', (e) => {
        if (e.target === $('#overlay')) {
            toggleSettings(false);
            closeModal();
            toggleNotesPanel(false);
        }
    });


    $('#backBtn').addEventListener('click', () => {
        if (FolderManager.goBack()) {
            renderTiles();
        }
    });

    const tabButtons = $$('.tab-btn');
    const tabPanes = $$('.tab-pane');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                pane.style.display = 'none'; // Ocultar para la animación
            });

            btn.classList.add('active');
            const activePane = $(`#tab-${btn.dataset.tab}`);
            activePane.style.display = 'block';
            setTimeout(() => activePane.classList.add('active'), 10); // Permitir que se aplique display:block
        });
    });

    $('#userName').addEventListener('input', (e) => {
        const name = e.target.value;
        renderGreeting(name);
        saveAndSyncSetting({ userName: name });
    });

    // --- Lógica para Paneles ---
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

    $('#manualSaveBtn').addEventListener('click', async () => {
        await FileSystem.saveDataToFile({ tiles, trash });
        showSaveStatus();
    });

    $('#emptyTrashBtn').addEventListener('click', () => {
        if (trash.length === 0) return;
        if (confirm('¿Estás seguro de que quieres vaciar la papelera? Todos los elementos se eliminarán permanentemente.')) {
            trash.length = 0; // Vacía el array
            saveAndRender();
        }
    });

    $('#resetPanelsBtn').addEventListener('click', async () => {
        await resetPanelSettings();
    });
}

export function renderGreeting(name) {
    const hour = new Date().getHours();
    let greetingText = '¡Hola!';
    if (hour < 12) greetingText = 'Buenos días';
    else if (hour < 20) greetingText = 'Buenas tardes';
    else greetingText = 'Buenas noches';

    const namePart = name ? `, <strong>${name}</strong>` : '';
    $('#greeting').innerHTML = `${greetingText}${namePart}`;
}

export function updateClock() {
    const now = new Date();
    $('#clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // Targets .clock-header
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(now);
    $('#date').textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

export function updateSliderValueSpans() {
    $('#opacityValue').textContent = `${Math.round($('#panelOpacity').value * 100)}%`;
    $('#blurValue').textContent = `${$('#panelBlur').value}px`;
    $('#radiusValue').textContent = `${$('#panelRadius').value}px`;
}

export function updateActiveThemeButton(theme) {
    $$('.theme').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

export function updateActiveGradientButton(gradient) {
    $$('.gradient-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gradientId === gradient);
    });
}

export function updateBgModeUI(isCustomBg, activeMode) {
    const displayModeContainer = $('#bgDisplayMode');
    if (displayModeContainer) {
        displayModeContainer.hidden = !isCustomBg;
    }
    $$('#bgModeSelector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === activeMode);
    });
}
export function toggleSettings(show) {
    const settings = $('#settings');
    const isHidden = show === undefined ? settings.getAttribute('aria-hidden') === 'false' : !show;
    settings.setAttribute('aria-hidden', isHidden);
    $('#overlay').setAttribute('aria-hidden', isHidden && $('#notes-panel').getAttribute('aria-hidden') === 'true');
    document.body.classList.toggle('no-scroll', !isHidden);
    $('#openSettings').classList.toggle('active', !isHidden);
    if (!isHidden) toggleNotesPanel(false); // Close notes if opening settings
    updateMainBlur();
}

export function toggleNotesPanel(show) {
    const notesPanel = $('#notes-panel');
    const isHidden = show === undefined ? notesPanel.getAttribute('aria-hidden') === 'false' : !show;
    notesPanel.setAttribute('aria-hidden', isHidden);
    $('#overlay').setAttribute('aria-hidden', isHidden && $('#settings').getAttribute('aria-hidden') === 'true');
    document.body.classList.toggle('no-scroll', !isHidden);
    $('#openNotes').classList.toggle('active', !isHidden);
    if (!isHidden) toggleSettings(false); // Close settings if opening notes
    updateMainBlur();
}

function updateMainBlur() {
    $('.main').classList.toggle('blurred', !!($('#settings[aria-hidden="false"]') || $('#notes-panel[aria-hidden="false"]')));
}

export function showSaveStatus() {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;
    
    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
    saveStatus.textContent = 'Guardado!';
    saveStatus.classList.remove('error');
    saveStatus.classList.add('visible');
    saveStatus.timeout = setTimeout(() => {
        saveStatus.classList.remove('visible');
    }, 2000);
}

/**
 * Muestra un mensaje de error temporal en el panel de configuración.
 * @param {string} message El mensaje de error a mostrar.
 */
export function showSettingError(message) {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;

    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
    saveStatus.textContent = message;
    saveStatus.classList.add('error');
    saveStatus.classList.add('visible');
    saveStatus.timeout = setTimeout(() => {
        saveStatus.classList.remove('visible');
        // La clase de error se limpia la próxima vez que se muestre un estado normal.
    }, 3000);
}

/**
 * Muestra un mensaje de error persistente relacionado con operaciones de archivo.
 * @param {string} message - El mensaje de error a mostrar.
 * @param {boolean} isPermissionError - Si es true, añade un botón para re-seleccionar el directorio.
 */
export function showFileError(message, isPermissionError = false) {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;

    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
    
    let finalMessage = message;
    if (isPermissionError) {
        finalMessage += ` <button id="reselectDirFromError" class="btn-link" style="text-decoration: underline; background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: inherit;">Re-seleccionar carpeta</button>`;
    }

    saveStatus.innerHTML = finalMessage;
    saveStatus.classList.add('error');
    saveStatus.style.opacity = '1';
}
export async function updateDataTabUI() {
    const handle = await FileSystem.getDirectoryHandle();
    const { autoSync } = await storageGet(['autoSync']);

    if (handle) {
        $('#dirPath').textContent = `Carpeta seleccionada: ${handle.name}`;
        $('#dirInfo').hidden = true;
        $('#dirPath').hidden = false;
        $('#autoSyncToggle').disabled = false;
        $('#autoSyncToggle').checked = autoSync || false;
        $('#manualSaveBtn').hidden = autoSync || false;
    } else {
        $('#dirPath').hidden = true;
        // Si hay un handle guardado pero no tenemos permiso, mostramos un mensaje de ayuda.
        $('#dirInfo').hidden = !(await storageGet('dirHandle')).dirHandle;
        $('#autoSyncToggle').disabled = true;
        $('#autoSyncToggle').checked = false;
        $('#manualSaveBtn').hidden = true;
    }
}

/**
 * Convierte un color hexadecimal a formato RGB y lo establece como una variable CSS.
 * @param {string} hex - El color en formato hexadecimal (ej. #RRGGBB).
 */
export function updatePanelRgb(hex) {
    if (!hex || !hex.startsWith('#')) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        document.documentElement.style.setProperty('--panel-bg-rgb', `${r}, ${g}, ${b}`);
    }
}

/**
 * Restablece la configuración de los paneles a sus valores predeterminados.
 */
async function resetPanelSettings() {
    const defaults = {
        panelBg: '#0e193a',
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