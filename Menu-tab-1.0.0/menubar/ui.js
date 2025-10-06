import { $, $$, saveAndSyncSetting } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderTiles, trash, saveAndRender } from './tiles.js';
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
            btn.classList.add('active');
            tabPanes.forEach(pane => pane.classList.remove('active'));
            $(`#tab-${btn.dataset.tab}`)?.classList.add('active');
        });
    });

    $('#userName').addEventListener('input', (e) => {
        const name = e.target.value;
        renderGreeting(name);
        saveAndSyncSetting({ userName: name });
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

    $('#emptyTrashBtn').addEventListener('click', () => {
        if (trash.length === 0) return;
        if (confirm('¿Estás seguro de que quieres vaciar la papelera? Todos los elementos se eliminarán permanentemente.')) {
            trash.length = 0; // Vacía el array
            saveAndRender();
        }
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

export function toggleSettings(show) {
    const settings = $('#settings');
    const isHidden = show === undefined ? settings.getAttribute('aria-hidden') === 'false' : !show;
    settings.setAttribute('aria-hidden', isHidden);
    $('#overlay').setAttribute('aria-hidden', isHidden && $('#notes-panel').getAttribute('aria-hidden') === 'true');
    $('#openSettings').classList.toggle('active', !isHidden);
    if (!isHidden) toggleNotesPanel(false); // Close notes if opening settings
    updateMainBlur();
}

export function toggleNotesPanel(show) {
    const notesPanel = $('#notes-panel');
    const isHidden = show === undefined ? notesPanel.getAttribute('aria-hidden') === 'false' : !show;
    notesPanel.setAttribute('aria-hidden', isHidden);
    $('#overlay').setAttribute('aria-hidden', isHidden && $('#settings').getAttribute('aria-hidden') === 'true');
    $('#openNotes').classList.toggle('active', !isHidden);
    if (!isHidden) toggleSettings(false); // Close settings if opening notes
    updateMainBlur();
}

function updateMainBlur() { $('.main').style.filter = ($('#settings[aria-hidden="false"]') || $('#notes-panel[aria-hidden="false"]')) ? 'blur(4px)' : 'none'; }

export function showSaveStatus() {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;
    
    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
    saveStatus.textContent = 'Guardado!';
    saveStatus.style.opacity = '1';
    saveStatus.timeout = setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
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