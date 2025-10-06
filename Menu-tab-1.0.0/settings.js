import { $, $$, storageGet, storageSet } from './utils.js';
import { updateActiveThemeButton, updateActiveGradientButton, showSaveStatus } from './ui.js';
import { tiles, setTiles, saveAndRender } from './tiles.js';

let appState = {};

export function initSettings(initialState) {
    appState = initialState;

    $$('.theme').forEach(b => {
        b.dataset.type = 'theme';
        b.addEventListener('click', handleThemeChange);
        b.addEventListener('mouseenter', handleBackgroundHover);
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

    $('#exportBtn')?.addEventListener('click', handleExport);
    $('#importBtn')?.addEventListener('click', () => $('#importFile').click());
    $('#importFile')?.addEventListener('change', handleImport);
}

export async function loadGradients(activeGradient) {
    try {
        const res = await fetch('gradients.json');
        const gradients = await res.json();
        const gradientListEl = $('#gradient-list');
        gradientListEl.innerHTML = '';
        gradients.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'gradient-btn';
            btn.textContent = g.name.trim();
            btn.style.backgroundImage = g.gradient;
            btn.dataset.gradient = g.gradient;
            btn.dataset.type = 'gradient';
            if (g.gradient === activeGradient) btn.classList.add('active');
            btn.addEventListener('click', handleGradientChange);
            btn.addEventListener('mouseenter', handleBackgroundHover);
            btn.addEventListener('mouseleave', handleBackgroundLeave);
            gradientListEl.appendChild(btn);
        });
    } catch (e) {
        console.error("Could not load gradients.json", e);
    }
}

function handleThemeChange(e) {
    const newTheme = e.target.dataset.theme;
    appState.currentTheme = newTheme;
    document.body.style.backgroundImage = `url('images/${newTheme}.jpg')`;
    document.body.classList.add('theme-background');

    updateActiveThemeButton(newTheme);
    updateActiveGradientButton(null);
    storageSet({ theme: newTheme, bgUrl: null, bgData: null, gradient: null }).then(showSaveStatus);
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
    else if (gradient) appState.currentBackgroundValue = gradient;
    else if (theme) {
        document.body.classList.add('theme-background');
        appState.currentBackgroundValue = `url('images/${theme}.jpg')`;
    }

    document.body.style.backgroundImage = appState.currentBackgroundValue;
    storageSet(settings).then(showSaveStatus);
}

function handleGradientChange(e) {
    const gradient = e.target.dataset.gradient;
    applyAndSaveBackground({ gradient: gradient, bgUrl: null, bgData: null, theme: null });
    updateActiveGradientButton(gradient);
    updateActiveThemeButton(null);
}

function handleBackgroundHover(e) {
    const target = e.target;
    document.body.setAttribute('data-theme-preview', 'true');
    document.body.classList.remove('theme-background');

    if (target.dataset.type === 'theme') {
        document.body.style.backgroundImage = `url('images/${target.dataset.theme}.jpg')`;
        document.body.classList.add('theme-background');
    } else if (target.dataset.type === 'gradient') {
        document.body.style.backgroundImage = target.dataset.gradient;
    }
}

function handleBackgroundLeave() {
    document.body.removeAttribute('data-theme-preview');
    document.body.style.backgroundImage = appState.currentBackgroundValue;
    if (appState.currentTheme) document.body.classList.add('theme-background');
}

async function handleExport() {
    const { engine } = await storageGet(['engine']);
    const data = { tiles, theme: appState.currentTheme, engine: engine || 'google' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tablero-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.tiles) setTiles(data.tiles);
            if (data.theme) appState.currentTheme = data.theme;
            if (data.engine) storageSet({ engine: data.engine });
            saveAndRender();
            showSaveStatus();
        } catch (err) {
            console.error("Error al importar:", err);
        }
    };
    reader.readAsText(file);
}