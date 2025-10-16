/**
 * Gestiona las interacciones generales de la interfaz de usuario (UI).
 * Se encarga de abrir/cerrar paneles (configuración, notas), actualizar el reloj y el saludo,
 * y manejar los controles de apariencia de los paneles como color, opacidad y desenfoque.
 */
import { $, $$, saveAndSyncSetting, storageGet } from '../core/utils.js';
import { FolderManager } from '../core/carpetas.js';
import { renderTiles, saveAndRender, tiles, trash, setTiles, setTrash } from '../core/tiles.js';
import { closeModal } from './modal.js';
import { FileSystem } from '../system/file-system.js';
import { initPanelSettings } from '../settings/settings-panels.js';

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

    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
    });

    $('#userName').addEventListener('input', (e) => {
        const name = e.target.value;
        renderGreeting(name);
        saveAndSyncSetting({ userName: name });
    });

    initPanelSettings();

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

    // Listener para el botón en el banner de advertencia
    $('#renewPermissionBtn').addEventListener('click', () => {
        toggleSettings(true);
        switchToTab('datos');
    });
}

/**
 * Cambia a una pestaña específica en el panel de configuración.
 * @param {string} tabId - El ID de la pestaña a activar (ej. 'datos', 'general').
 */
export function switchToTab(tabId) {
    const tabButtons = $$('.tab-btn');
    const tabPanes = $$('.tab-pane');
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none'; // Ocultar para la animación
    });
    const btnToActivate = $(`.tab-btn[data-tab="${tabId}"]`);
    const paneToActivate = $(`#tab-${tabId}`);
    if (btnToActivate) btnToActivate.classList.add('active');
    if (paneToActivate) paneToActivate.style.display = 'block';
    setTimeout(() => paneToActivate?.classList.add('active'), 10); // Permitir que se aplique display:block
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

/**
 * Muestra u oculta el banner de advertencia de permisos.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
export function showPermissionWarningBanner(show) {
    const banner = $('#permission-banner');
    if (show) {
        banner.hidden = false;
        banner.classList.add('visible');
    } else {
        banner.classList.remove('visible');
        banner.hidden = true;
    }
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

    // Añadimos un ícono de cerrar para que el usuario pueda descartar el mensaje si lo desea.
    // Esto es útil si el usuario no quiere re-seleccionar la carpeta en ese momento.
    const closeIconHTML = `<img src="images/cerrar.svg" alt="Ícono de cerrar" style="width: 16px; height: 16px; cursor: pointer; vertical-align: middle; margin-left: 8px;" onclick="this.parentElement.style.opacity = '0'; setTimeout(() => this.parentElement.classList.remove('visible', 'error'), 300);">`;

    finalMessage += closeIconHTML;

    saveStatus.innerHTML = finalMessage;
    saveStatus.classList.add('error');
    saveStatus.style.opacity = '1';
}
export async function updateDataTabUI() {
    const dataStatusEl = $('#data-status');
    const handle = await FileSystem.getDirectoryHandle(false); // No solicitar permiso, solo consultar
    const permissionState = await FileSystem.getPermissionState();
    const { autoSync, hideWarning } = await storageGet(['autoSync', 'hideWarning']);
    const dirPathEl = $('#dirPath');
    const selectDirBtn = $('#selectDirBtn');

    // Ocultar el contenedor de estado por defecto
    dataStatusEl.classList.remove('visible', 'error');

    if (handle) {
        dirPathEl.hidden = false;
        dirPathEl.classList.remove('warning');
        selectDirBtn.textContent = 'Cambiar Carpeta';

        if (permissionState === 'prompt') {
            showDataTabError('Permiso de acceso a carpeta denegado.', true);
            selectDirBtn.textContent = 'Renovar Permiso';
            if (!hideWarning) {
                showPermissionWarningBanner(true); // Asegurarse de que el banner se muestre si no está desactivado
            }
        } else {
            dirPathEl.innerHTML = `<span>Carpeta activa: <b>${handle.name}</b></span>`;
            showPermissionWarningBanner(false); // Ocultar el banner si el permiso está bien
        }

        $('#autoSyncToggle').disabled = false;
        $('#autoSyncToggle').checked = autoSync || false;
        $('#manualSaveBtn').hidden = autoSync || false;
    } else {
        dirPathEl.hidden = true;
        selectDirBtn.textContent = 'Elegir Carpeta de Datos';
        $('#autoSyncToggle').disabled = true;
        $('#autoSyncToggle').checked = false;
        $('#manualSaveBtn').hidden = true;
    }
    $('#hideWarningToggle').checked = hideWarning || false;
}

/**
 * Muestra un mensaje de error dentro de la pestaña de Datos.
 * @param {string} message - El mensaje de error a mostrar.
 * @param {boolean} isPermissionError - Si es true, añade un botón para re-seleccionar el directorio.
 */
function showDataTabError(message, isPermissionError = false) {
    const dataStatusEl = $('#data-status');
    if (!dataStatusEl) return;

    let finalMessage = message;
    if (isPermissionError) {
        finalMessage = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span>${message}</span>
        <button id="reselectDirFromError" class="btn-link" style="text-decoration: underline; background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: inherit; margin-left: auto;">Re-seleccionar</button>`;
    }

    dataStatusEl.innerHTML = finalMessage;
    dataStatusEl.classList.add('visible', 'error');
}