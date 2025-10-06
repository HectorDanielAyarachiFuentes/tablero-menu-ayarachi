import { $, $$, storageSet } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderTiles } from './tiles.js';

export function initUI() {
    updateClock();
    setInterval(updateClock, 1000);

    $('#openSettings').addEventListener('click', () => toggleSettings(true));
    $('#closeSettings').addEventListener('click', () => toggleSettings(false));

    document.addEventListener('click', (e) => {
        if (e.target === $('#overlay')) {
            toggleSettings(false);
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
        storageSet({ userName: name }).then(showSaveStatus);
    });

    $('#panelOpacity').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--panel-opacity', e.target.value);
        updateSliderValueSpans();
    });
    $('#panelOpacity').addEventListener('change', (e) => {
        storageSet({ panelOpacity: e.target.value }).then(showSaveStatus);
    });

    $('#panelBlur').addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--panel-blur', `${e.target.value}px`);
        updateSliderValueSpans();
    });
    $('#panelBlur').addEventListener('change', (e) => {
        storageSet({ panelBlur: e.target.value }).then(showSaveStatus);
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
    $('#clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
        btn.classList.toggle('active', btn.dataset.gradient === gradient);
    });
}

export function toggleSettings(show) {
    const settings = $('#settings');
    const isHidden = show === undefined ? settings.getAttribute('aria-hidden') === 'false' : !show;
    settings.setAttribute('aria-hidden', isHidden);
    $('#overlay').setAttribute('aria-hidden', isHidden);
    $('#openSettings').classList.toggle('active', !isHidden);
    $('.main').style.filter = isHidden ? 'none' : 'blur(4px)';
}

export function showSaveStatus() {
    const saveStatus = $('#saveStatus');
    if (!saveStatus) return;
    
    if (saveStatus.timeout) clearTimeout(saveStatus.timeout);
    saveStatus.textContent = 'Guardado!';
    saveStatus.style.opacity = '1';
    saveStatus.timeout = setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
}