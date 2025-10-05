const tilesEl = $('#tiles');
const tpl = document.getElementById('tileTpl');
const settings = $('#settings');
const openSettings = $('#openSettings');
const closeSettings = $('#closeSettings');
const engineSelect = $('#engineSelect');
const searchInput = $('#searchInput');
const searchGo = $('#searchGo');
const searchEngineIcon = $('#searchEngineIcon');
const backBtn = $('#backBtn');
const greetingEl = $('#greeting');
const userNameInput = $('#userName');
const clockEl = $('#clock');
const dateEl = $('#date');
const weatherCityInput = $('#weatherCity');
const defaultEngine = $('#defaultEngine');
const themeButtons = Array.from(document.querySelectorAll('.theme'));
const gradientListEl = $('#gradient-list');
const bgFile = $('#bgFile');
const panelOpacitySlider = $('#panelOpacity');
const panelBlurSlider = $('#panelBlur');
const opacityValueSpan = $('#opacityValue');
const blurValueSpan = $('#blurValue');
const editor = $('#editor');
const addTileBtn = $('#addTile');
const exportBtn = $('#exportBtn');
const importBtn = $('#importBtn');
const importFile = $('#importFile');
const modal = $('#modal');
const modalName = $('#modalName');
const modalUrl = $('#modalUrl');
const modalSave = $('#modalSave');
const modalCancel = $('#modalCancel');
const modalPreviewImg = $('#modalPreviewImg');
const modalEditIcon = $('#modalEditIcon');
const modalResetIcon = $('#modalResetIcon');
const modalIconFile = $('#modalIconFile');
const saveStatus = $('#saveStatus');
const overlay = $('#overlay');
const contextMenu = $('#contextMenu');
let activeMenuIndex = null;

let tiles = [];
let editing = null;
let currentTheme = 'paisaje';
let currentBackgroundValue = ''; // To store current background for hover previews

async function init(){
  const stored = await storageGet(['tiles','engine','theme','bgData','bgUrl', 'userName', 'weatherCity', 'gradient', 'panelOpacity', 'panelBlur']);
  let initialTiles = stored.tiles || [
    {type: 'link', name:'YouTube', url:'https://www.youtube.com/'},
    {type: 'link', name:'Google', url:'https://www.google.com/', favorite: true},
    {type: 'link', name:'Wikipedia', url:'https://es.wikipedia.org/'},
    {type: 'link', name:'GitHub', url:'https://github.com/'}
  ];

  // Backward compatibility: add 'type' if missing
  tiles = initialTiles.map(t => {
    // Ensure basic structure for links
    if (!t.type && t.url) return { ...t, type: 'link' };
    // Handle items that might not have a type or url
    if (!t.type) t.type = 'link';

    if (t.type === 'folder' && !t.children) t.children = [];
    return t;
  });
  const engine = stored.engine || 'google';
  engineSelect.value = engine;
  $('#defaultEngine').value = engine;
  userNameInput.value = stored.userName || '';
  weatherCityInput.value = stored.weatherCity || '';
  renderGreeting(stored.userName);
  renderFavoritesInSelect();

  // Background initialization logic
  if (stored.bgData) {
    currentBackgroundValue = `url('${stored.bgData}')`;
  } else if (stored.bgUrl) {
    currentBackgroundValue = `url('${stored.bgUrl}')`;
  } else if (stored.gradient) {
    currentBackgroundValue = stored.gradient;
  } else {
    // For themes, we don't set a style directly, but use the data-theme attribute
    // We'll set currentBackgroundValue when a theme is clicked or hovered
    currentTheme = stored.theme || 'paisaje';
    document.body.setAttribute('data-theme', currentTheme);
    updateActiveThemeButton(currentTheme);
  }

  // Panel style initialization
  const panelOpacity = stored.panelOpacity ?? 0.05;
  document.body.style.backgroundImage = currentBackgroundValue;
  const panelBlur = stored.panelBlur ?? 6;
  document.documentElement.style.setProperty('--panel-opacity', panelOpacity);
  document.documentElement.style.setProperty('--panel-blur', `${panelBlur}px`);
  panelOpacitySlider.value = panelOpacity;
  panelBlurSlider.value = panelBlur;
  updateSliderValueSpans();

  updateSearchIcon(engine);
  loadGradients(stored.gradient);
  updateClock();
  setInterval(updateClock, 1000); // Clock updates every second
  WeatherManager.init();
  renderTiles();
  renderEditor();
}
init();

function renderGreeting(name) {
    const hour = new Date().getHours();
    let greetingText = '¡Hola!';
    if (hour < 12) {
        greetingText = 'Buenos días';
    } else if (hour < 20) {
        greetingText = 'Buenas tardes';
    } else {
        greetingText = 'Buenas noches';
    }

    const namePart = name ? `, <strong>${name}</strong>` : '';
    greetingEl.innerHTML = `${greetingText}${namePart}`;
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hours}:${minutes}`;

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(now);
    dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

function renderTiles(){
  tilesEl.innerHTML = '';
  const currentTiles = FolderManager.getTilesForCurrentView(tiles);
  currentTiles.forEach((t, i) => {
    const node = FolderManager.renderTile(t, i, tpl);
    tilesEl.appendChild(node);
  });

  // Create and append the "Add new" tile
  const addNode = document.createElement('a');
  addNode.className = 'tile tile-add';
  addNode.href = '#';
  addNode.innerHTML = `<span>+</span><div>Añadir</div>`; // Keep this simple
  addNode.style.animationDelay = `${currentTiles.length * 50}ms`;
  addNode.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });
  tilesEl.appendChild(addNode);

  backBtn.hidden = FolderManager.isRootView();
}

// Event Delegation for tiles
tilesEl.addEventListener('click', e => {
    const tile = e.target.closest('.tile');
    if (!tile) return;

    const idx = Number(tile.dataset.idx);

    if (e.target.closest('.more-btn')) {
        e.preventDefault();
        e.stopPropagation(); // Evita que se cierre inmediatamente
        showContextMenu(e.target, idx);
    } else {
        const tileData = FolderManager.getTilesForCurrentView(tiles)[idx];
        // Regular click on a folder tile is handled inside renderTile
        if (tileData && tileData.type === 'folder') {
            e.preventDefault();
        }
        // Regular click on a link tile navigates
        if (tileData && tileData.type === 'link') {
            window.location.href = tile.href;
        }
    }
});

function showContextMenu(button, index) {
    activeMenuIndex = index;
    const tileData = FolderManager.getTilesForCurrentView(tiles)[index];

    // Update menu state
    const favOption = contextMenu.querySelector('[data-action="favorite"]');
    favOption.textContent = tileData.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos';
    favOption.classList.toggle('is-fav', !!tileData.favorite);

    // Hide/show options based on tile type
    const isFolder = tileData.type === 'folder';
    contextMenu.querySelector('[data-action="favorite"]').hidden = isFolder;
    contextMenu.querySelector('[data-action="open-tab"]').hidden = isFolder;
    contextMenu.querySelector('[data-action="open-window"]').hidden = isFolder;
    contextMenu.querySelector('[data-action="open-private"]').hidden = isFolder;

    // Position and show menu
    const rect = button.getBoundingClientRect();
    contextMenu.style.left = `${rect.left}px`;
    contextMenu.style.top = `${rect.bottom + 5}px`;
    contextMenu.hidden = false;
}

// Hide context menu on click anywhere
document.addEventListener('click', () => {
    if (!contextMenu.hidden) { contextMenu.hidden = true; }
});

contextMenu.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (!action || activeMenuIndex === null) return;

    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const tile = currentTiles[activeMenuIndex];

    switch (action) {
        case 'favorite':
            tile.favorite = !tile.favorite;
            renderFavoritesInSelect();
            saveAndRender();
            break;
        case 'open-tab':
            window.open(tile.url, '_blank');
            break;
        case 'open-window':
            window.open(tile.url, '_blank', 'noopener,noreferrer');
            break;
        case 'open-private':
            if (window.chrome && chrome.windows) {
                chrome.windows.create({ url: tile.url, incognito: true });
            }
            break;
        case 'edit':
            openModal(activeMenuIndex);
            break;
        case 'delete':
            currentTiles.splice(activeMenuIndex, 1);
            saveAndRender();
            break;
    }
    contextMenu.hidden = true; // Hide after action
});


function renderEditor(){
  editor.innerHTML = '';
  tiles.forEach((t,i)=>{
    // For now, editor only works on root level. This could be improved later.
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.idx = i;
    row.draggable = true;
    row.innerHTML = `<span style="cursor:grab">⠿</span><input class="e-name" data-idx="${i}" value="${t.name}"/><input class="e-url" data-idx="${i}" value="${t.url}"/><button class="e-save btn" data-idx="${i}">Guardar</button>`;
    editor.appendChild(row);
  });
}

// Event delegation for editor
editor.addEventListener('click', e => {
    if (e.target.classList.contains('e-save')) {
        const i = Number(e.target.dataset.idx);
        const row = e.target.closest('.row');
        const name = row.querySelector('.e-name').value;
        const url = row.querySelector('.e-url').value;
        if (name && url) {
            tiles[i] = { ...tiles[i], name, url };
            saveAndRender();
        }
    }
});

// Drag and drop for editor rows
let dragSrcEl = null;

editor.addEventListener('dragstart', e => {
    if (e.target.classList.contains('row')) {
        dragSrcEl = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
        e.target.classList.add('dragging');
    }
});

editor.addEventListener('dragover', e => {
    e.preventDefault();
    const targetRow = e.target.closest('.row');
    if (targetRow && targetRow !== dragSrcEl) {
        $$('#editor .row').forEach(r => r.classList.remove('drag-over'));
        targetRow.classList.add('drag-over');
    }
});

editor.addEventListener('drop', e => {
    e.preventDefault();
    const dropTarget = e.target.closest('.row');
    if (dragSrcEl && dropTarget && dragSrcEl !== dropTarget) {
        const from = Number(dragSrcEl.dataset.idx);
        const to = Number(dropTarget.dataset.idx);
        const item = tiles.splice(from, 1)[0];
        tiles.splice(to, 0, item);
        saveAndRender();
    }
    $$('#editor .row').forEach(r => {
        r.classList.remove('dragging', 'drag-over');
    });
});

function openModal(index = null) {
    editing = index;
    modal.dataset.editingIndex = index; // Store index on the modal
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const modalUrlLabel = $('#modalUrlLabel');
    const tile = (index !== null) ? currentTiles[index] : null;

    // Hide elements not relevant for folders
    const isFolder = tile?.type === 'folder';
    $('.modal-preview').hidden = isFolder;
    modalUrlLabel.hidden = isFolder;
    $('#modalUrl').hidden = isFolder;

    if (index !== null) {
        modal.querySelector('#modalTitle').textContent = 'Editar Acceso';
        modalName.value = tile.name;
        if (tile.type === 'link') {
            modalUrl.value = tile.url;
            // Set preview image
            if (tile.customIcon) {
                modalPreviewImg.src = tile.customIcon;
            } else {
                try {
                    modalPreviewImg.src = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(tile.url).hostname}`;
                } catch {
                    modalPreviewImg.src = ''; // Placeholder/empty
                }
            }
        }
    } else {
        modal.querySelector('#modalTitle').textContent = 'Añadir Nuevo Acceso';
        modalName.value = '';
        modalUrl.value = 'https://';
        modalPreviewImg.src = ''; // Placeholder
    }
    modal.hidden = false;
    modalName.focus();
}

function closeModal() {
    modal.hidden = true;
    editing = null;
    modalIconFile.value = ''; // Reset file input
}

function handleModalSave() {
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const name = modalName.value.trim();
    const url = modalUrl.value.trim();
    const isEditingFolder = (editing !== null && currentTiles[editing]?.type === 'folder');

    if (!name || (!isEditingFolder && !url)) return;

    const newItem = {
        name,
        url: isEditingFolder ? undefined : url, // Keep url undefined for folders
        customIcon: modalPreviewImg.src.startsWith('data:image') ? modalPreviewImg.src : (currentTiles[editing]?.customIcon || null)
    };

    if (editing !== null) { // Editing existing tile
        const originalItem = currentTiles[editing];
        currentTiles[editing] = { ...originalItem, ...newItem };
    } else { // Adding new tile
        currentTiles.unshift({ type: 'link', name, url, favorite: false });
    }
    // No need to call renderFavoritesInSelect here, saveAndRender will do it.
    saveAndRender();
    closeModal();
}

function openEdit(i) { openModal(i); }

// --- Search ---
function performSearch() { const q = searchInput.value.trim(); if (q) window.open(buildSearchUrl(engineSelect.value, q), '_blank'); }

function buildSearchUrl(engine, q){
  const enc = encodeURIComponent(q);
  switch(engine){
    case 'google': return 'https://www.google.com/search?q='+enc;
    case 'duck': return 'https://duckduckgo.com/?q='+enc;
    case 'bing': return 'https://www.bing.com/search?q='+enc;
    case 'youtube': return 'https://www.youtube.com/results?search_query='+enc;
    case 'wiki': return 'https://es.wikipedia.org/w/index.php?search='+enc;
    case 'ecosia': return 'https://www.ecosia.org/search?q='+enc;
    default: return 'https://www.google.com/search?q='+enc;
  }
}

function updateSearchIcon(engine) {
    let domain = '';
    switch(engine) {
        case 'google': domain = 'google.com'; break;
        case 'duck': domain = 'duckduckgo.com'; break;
        case 'bing': domain = 'bing.com'; break;
        case 'youtube': domain = 'youtube.com'; break;
        case 'wiki': domain = 'wikipedia.org'; break;
        case 'ecosia': domain = 'ecosia.org'; break;
    }
    if (domain) {
        searchEngineIcon.src = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
        searchEngineIcon.hidden = false;
    } else {
        searchEngineIcon.hidden = true;
    }
}
// --- Settings & Data ---

let saveTimeout;
function saveAndRender() {
    storageSet({ tiles }); // Only save tiles, other things are saved on their own events
    renderFavoritesInSelect();
    renderTiles();
    renderEditor();
    if (saveStatus) {
        clearTimeout(saveTimeout);
        saveStatus.textContent = 'Guardado!';
        saveStatus.style.opacity = '1';
        saveTimeout = setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
    }
}

function getSelectedEngine() {
    const firstOptgroup = engineSelect.querySelector('optgroup');
    return firstOptgroup ? engineSelect.value : (engineSelect.options[engineSelect.selectedIndex]?.value || 'google');
}

function renderFavoritesInSelect() {
    // Clear only favorites
    const favGroup = engineSelect.querySelector('optgroup[label="Favoritos"]');
    if (favGroup) {
        favGroup.remove();
    }

    const favoriteTiles = tiles.filter(t => t.favorite);

    if (favoriteTiles.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Favoritos';

        favoriteTiles.forEach(tile => {
            const option = document.createElement('option');
            option.value = tile.url;
            option.textContent = `⭐ ${tile.name}`;
            optgroup.appendChild(option);
        });

        engineSelect.appendChild(optgroup);
    }
    // Restore selected engine from the initial load or last selection
    storageGet(['engine']).then(stored => {
        const savedEngine = stored.engine || 'google';
        engineSelect.value = savedEngine;
        updateSearchIcon(savedEngine);
    });
}

function handleThemeChange(e) {
    currentTheme = e.target.dataset.theme;
    // Clear custom background when applying a theme
    document.body.removeAttribute('style'); // Clear inline styles like backgroundImage
    document.body.style.backgroundImage = '';
    document.body.setAttribute('data-theme', currentTheme);
    updateActiveThemeButton(currentTheme);
    updateActiveGradientButton(null);
    storageSet({ theme: currentTheme, bgUrl: null, bgData: null, gradient: null });
}

function updateActiveThemeButton(theme) {
    themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function handleBgFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        applyAndSaveBackground({ bgData: e.target.result, bgUrl: null, gradient: null, theme: null });
        updateActiveThemeButton(null); // Deselect theme button
        updateActiveGradientButton(null);
        $('#bgUrl').value = '';
    };
    reader.readAsDataURL(file);
}

async function loadGradients(activeGradient) {
    try {
        const res = await fetch('gradients.json');
        const gradients = await res.json();
        gradientListEl.innerHTML = '';
        gradients.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'gradient-btn';
            btn.textContent = g.name.trim();
            btn.style.backgroundImage = g.gradient;
            btn.dataset.gradient = g.gradient;
            btn.dataset.type = 'gradient';
            if (g.gradient === activeGradient) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', handleGradientChange);
            btn.addEventListener('mouseenter', handleBackgroundHover);
            btn.addEventListener('mouseleave', handleBackgroundLeave);
            gradientListEl.appendChild(btn);
        });
    } catch (e) {
        console.error("Could not load gradients.json", e);
    }
}

function applyAndSaveBackground(settings) {
    const { bgData, bgUrl, gradient, theme } = settings;
    
    document.body.removeAttribute('data-theme');
    document.body.style.backgroundImage = '';

    if (bgData) currentBackgroundValue = `url('${bgData}')`;
    else if (bgUrl) currentBackgroundValue = `url('${bgUrl}')`;
    else if (gradient) currentBackgroundValue = gradient;
    else if (theme) {
        document.body.setAttribute('data-theme', theme);
        currentBackgroundValue = ''; // Themes use classes, not inline styles
    }

    document.body.style.backgroundImage = currentBackgroundValue;
    storageSet(settings);
}

function handleGradientChange(e) {
    const gradient = e.target.dataset.gradient;
    applyAndSaveBackground({ gradient: gradient, bgUrl: null, bgData: null, theme: null });
    updateActiveGradientButton(gradient);
    updateActiveThemeButton(null); // Deselect theme
}

function updateActiveGradientButton(gradient) {
    $$('.gradient-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gradient === gradient);
    });
}

function handleBackgroundHover(e) {
    const target = e.target;
    const type = target.dataset.type;
    
    document.body.setAttribute('data-theme-preview', 'true');

    if (type === 'theme') {
        document.body.setAttribute('data-theme', target.dataset.theme);
        document.body.style.backgroundImage = '';
    } else if (type === 'gradient') {
        document.body.setAttribute('data-theme', '');
        document.body.style.backgroundImage = target.dataset.gradient;
    }
}

function handleBackgroundLeave() {
    document.body.removeAttribute('data-theme-preview');
    document.body.setAttribute('data-theme', currentTheme || '');
    document.body.style.backgroundImage = currentBackgroundValue;
}

function handleExport() {
  const data = { tiles, theme: currentTheme, engine: engineSelect.value };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tablero-export.json'; a.click();
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.tiles) tiles = data.tiles;
            if (data.theme) {
                currentTheme = data.theme;
                document.body.setAttribute('data-theme', currentTheme);
            }
            if (data.engine) {
                engineSelect.value = data.engine;
                $('#defaultEngine').value = data.engine;
            }
            saveAndRender();
            alert('¡Configuración importada con éxito!');
        } catch (err) {
            console.error("Error al importar:", err);
            alert('Error: El archivo de importación parece ser inválido.');
        }
    };
    reader.readAsText(file);
}

// --- Event Listeners Initialization ---

function toggleSettings(show) {
    const isHidden = show === undefined ? settings.getAttribute('aria-hidden') === 'false' : !show;
    settings.setAttribute('aria-hidden', isHidden);
    overlay.setAttribute('aria-hidden', isHidden);
    openSettings.classList.toggle('active', !isHidden);
    $('.main').style.filter = isHidden ? 'none' : 'blur(4px)';
}

openSettings.addEventListener('click', () => toggleSettings(true));
closeSettings.addEventListener('click', () => toggleSettings(false));

// Close settings when clicking outside
document.addEventListener('click', (e) => {
    if (e.target === overlay) {
        toggleSettings(false);
    }
});

backBtn.addEventListener('click', FolderManager.goBack);

const tabButtons = $$('.tab-btn');
const tabPanes = $$('.tab-pane');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabPanes.forEach(pane => pane.classList.remove('active'));
        const targetPane = $(`#tab-${btn.dataset.tab}`);
        if (targetPane) targetPane.classList.add('active');
    });
});

modalSave.addEventListener('click', handleModalSave);
modalCancel.addEventListener('click', closeModal);
$('#closeModal')?.addEventListener('click', closeModal);

modalEditIcon.addEventListener('click', () => modalIconFile.click());

modalIconFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            modalPreviewImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

modalResetIcon.addEventListener('click', () => {
    const index = modal.dataset.editingIndex;
    if (index === null) return;
    const tile = FolderManager.getTilesForCurrentView(tiles)[index];
    if (tile && tile.url) {
        try {
            modalPreviewImg.src = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(tile.url).hostname}`;
        } catch { modalPreviewImg.src = ''; }
    }
    // Also clear the customIcon from the object on save
    tile.customIcon = null;
});
// Close modal on Escape key press
document.addEventListener('keydown', (e) => {
    if (modal.hidden) return; // Do nothing if modal is not open

    if (e.key === 'Escape') {
        closeModal();
    }

    // Focus trap logic
    if (e.key === 'Tab') {
        const focusableElements = $$('#modal button, #modal input').filter(el => !el.hidden && !el.disabled);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // if shift key pressed for shift + tab combination
            if (document.activeElement === firstElement) {
                lastElement.focus(); // move focus to the last focusable element
                e.preventDefault();
            }
        } else { // if tab key is pressed
            if (document.activeElement === lastElement) {
                firstElement.focus(); // move focus to the first focusable element
                e.preventDefault();
            }
        }
    }
});

searchGo.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', e => e.key === 'Enter' && performSearch());
engineSelect.addEventListener('change', (e) => {
    const selectedValue = e.target.value;
    if (selectedValue.startsWith('http')) {
        window.open(selectedValue, '_blank');
        // Re-render to restore previous selection
        renderFavoritesInSelect();
    } else {
        updateSearchIcon(selectedValue);
        storageSet({ engine: selectedValue }); // Persist engine selection
    }
});

themeButtons.forEach(b => {
    b.dataset.type = 'theme';
    b.addEventListener('click', handleThemeChange);
    b.addEventListener('mouseenter', handleBackgroundHover);
    b.addEventListener('mouseleave', handleBackgroundLeave);
});
// Gradient buttons are added dynamically, listener is attached in loadGradients

bgFile.addEventListener('change', handleBgFileChange);

bgUrl.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
        document.body.style.backgroundImage = `url('${url}')`;
    }
});
bgUrl.addEventListener('change', (e) => {
    const url = e.target.value.trim();
    applyAndSaveBackground({ bgUrl: url, bgData: null, gradient: null, theme: null });
});

addTileBtn.addEventListener('click', () => openModal());

exportBtn?.addEventListener('click', handleExport);
importBtn?.addEventListener('click', () => importFile.click());
importFile?.addEventListener('change', handleImport);

userNameInput.addEventListener('input', (e) => {
    const name = e.target.value;
    renderGreeting(name);
    storageSet({ userName: name });
});

function updateSliderValueSpans() {
    opacityValueSpan.textContent = `${Math.round(panelOpacitySlider.value * 100)}%`;
    blurValueSpan.textContent = `${panelBlurSlider.value}px`;
}

panelOpacitySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    document.documentElement.style.setProperty('--panel-opacity', value);
    updateSliderValueSpans();
});
panelOpacitySlider.addEventListener('change', (e) => storageSet({ panelOpacity: e.target.value }));

panelBlurSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    document.documentElement.style.setProperty('--panel-blur', `${value}px`);
    updateSliderValueSpans();
});
panelBlurSlider.addEventListener('change', (e) => storageSet({ panelBlur: e.target.value }));

addTileBtn.addEventListener('click', () => openModal());
