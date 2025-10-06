import { $, $$, storageSet } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderFavoritesInSelect } from './search.js';
import { showSaveStatus } from './ui.js';

export let tiles = [];
let editing = null;
let activeMenuIndex = null;
let dragTileSrcEl = null;
let dragEditorRowSrcEl = null;

export function setTiles(newTiles) {
    tiles = newTiles;
}

export function initTiles() {
    const tilesEl = $('#tiles');
    const editor = $('#editor');
    const contextMenu = $('#contextMenu');

    tilesEl.addEventListener('click', handleTileClick);
    tilesEl.addEventListener('dragstart', handleTileDragStart);
    tilesEl.addEventListener('dragover', handleTileDragOver);
    tilesEl.addEventListener('dragleave', handleTileDragLeave);
    tilesEl.addEventListener('drop', handleTileDrop);
    tilesEl.addEventListener('dragend', handleTileDragEnd);

    document.addEventListener('click', (e) => {
        if (!contextMenu.hidden && !e.target.closest('.context-menu')) {
            contextMenu.classList.remove('is-open');
            resetDeleteConfirmation();
            setTimeout(() => { contextMenu.hidden = true; }, 200); // Wait for animation
        }
    });

    contextMenu.addEventListener('click', handleContextMenuClick);

    editor.addEventListener('click', handleEditorClick);
    editor.addEventListener('dragstart', handleEditorDragStart);
    editor.addEventListener('dragover', handleEditorDragOver);
    editor.addEventListener('drop', handleEditorDrop);
    editor.addEventListener('dragend', handleEditorDragEnd);

    $('#addTile').addEventListener('click', () => openModal());
    $('#modalSave').addEventListener('click', handleModalSave);
    $('#modalCancel').addEventListener('click', closeModal);
    $('#closeModal')?.addEventListener('click', closeModal);
    $('#modalEditIcon').addEventListener('click', () => $('#modalIconFile').click());
    $('#modalIconFile').addEventListener('change', handleModalIconFileChange);
    $('#modalResetIcon').addEventListener('click', handleModalResetIcon);

    document.addEventListener('keydown', handleModalKeydown);
}

export function saveAndRender() {
    storageSet({ tiles });
    renderFavoritesInSelect();
    renderTiles();
    renderEditor();
    showSaveStatus();
}

export function renderTiles() {
    const tilesEl = $('#tiles');
    const tpl = $('#tileTpl');
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);

    let skeletonHTML = '';
    for (let i = 0; i < currentTiles.length; i++) {
        skeletonHTML += `<div class="tile-skeleton" style="animation-delay: ${i * 50}ms"></div>`;
    }
    tilesEl.innerHTML = skeletonHTML;

    currentTiles.forEach((t, i) => {
        const node = FolderManager.renderTile(t, i, tpl);
        node.style.animationDelay = `${i * 50}ms`;
        if (tilesEl.children[i]) tilesEl.replaceChild(node, tilesEl.children[i]);
    });

    const addNode = document.createElement('a');
    addNode.className = 'tile tile-add';
    addNode.href = '#';
    addNode.innerHTML = `<span>+</span><div>Añadir</div>`;
    addNode.style.animationDelay = `${currentTiles.length * 50}ms`;
    addNode.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
    tilesEl.appendChild(addNode);

    $('#backBtn').hidden = FolderManager.isRootView();
}

function handleTileClick(e) {
    const tile = e.target.closest('.tile');
    if (!tile) return;

    const idx = Number(tile.dataset.idx);

    if (e.target.closest('.more-btn')) {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.target, idx);
    } else {
        const tileData = FolderManager.getTilesForCurrentView(tiles)[idx];
        if (tileData?.type === 'folder') e.preventDefault();
        if (tileData?.type === 'link') window.location.href = tile.href;
    }
}

function handleTileDragStart(e) {
    const tile = e.target.closest('.tile:not(.tile-add)');
    if (tile) {
        dragTileSrcEl = tile;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tile.dataset.idx);
        setTimeout(() => tile.classList.add('dragging'), 0);
    }
}

function handleTileDragOver(e) {
    e.preventDefault();
    const targetTile = e.target.closest('.tile:not(.tile-add)');
    if (targetTile && targetTile !== dragTileSrcEl) {
        targetTile.classList.add('drag-over');
    }
}

function handleTileDragLeave(e) {
    e.target.closest('.tile:not(.tile-add)')?.classList.remove('drag-over');
}

function handleTileDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.tile:not(.tile-add)');
    if (dragTileSrcEl && dropTarget && dragTileSrcEl !== dropTarget) {
        const fromIndex = Number(dragTileSrcEl.dataset.idx);
        const toIndex = Number(dropTarget.dataset.idx);
        const currentTiles = FolderManager.getTilesForCurrentView(tiles);
        const item = currentTiles.splice(fromIndex, 1)[0];
        currentTiles.splice(toIndex, 0, item);
        saveAndRender();
    }
}

function handleTileDragEnd() {
    $$('.tile').forEach(t => t.classList.remove('dragging', 'drag-over'));
    dragTileSrcEl = null;
}

function showContextMenu(button, index) {
    const contextMenu = $('#contextMenu');
    activeMenuIndex = index;
    const tileData = FolderManager.getTilesForCurrentView(tiles)[index];
    if (!tileData) return;

    const favOption = contextMenu.querySelector('[data-action="favorite"]');
    favOption.querySelector('span').textContent = tileData.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos';
    favOption.classList.toggle('is-fav', !!tileData.favorite);

    const isFolder = tileData.type === 'folder';
    contextMenu.querySelector('[data-action="favorite"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-tab"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-window"]').parentElement.hidden = isFolder;
    contextMenu.querySelector('[data-action="open-private"]').parentElement.hidden = isFolder;

    const rect = button.getBoundingClientRect();
    contextMenu.style.left = `${rect.left}px`;
    contextMenu.style.top = `${rect.bottom + 5}px`;
    contextMenu.hidden = false;
    setTimeout(() => contextMenu.classList.add('is-open'), 10);
}

function handleContextMenuClick(e) {
    e.stopPropagation();
    const targetButton = e.target.closest('button');
    if (!targetButton) return;

    const action = targetButton.dataset.action;
    if (!action || activeMenuIndex === null) return;

    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const tile = currentTiles[activeMenuIndex];

    switch (action) {
        case 'favorite':
            tile.favorite = !tile.favorite;
            saveAndRender();
            break;
        case 'open-tab': window.open(tile.url); break;
        case 'open-window': window.open(tile.url, '_blank', 'noopener,noreferrer'); break;
        case 'open-private': chrome.windows?.create({ url: tile.url, incognito: true }); break;
        case 'edit': openModal(activeMenuIndex); break;
        case 'delete':
            const deleteOption = targetButton;
            if (deleteOption.classList.contains('confirm-delete')) {
                currentTiles.splice(activeMenuIndex, 1);
                saveAndRender();
                resetDeleteConfirmation();
                hideContextMenu();
            } else {
                resetDeleteConfirmation();
                deleteOption.classList.add('confirm-delete'); 
                deleteOption.querySelector('span').textContent = '¿Confirmar eliminación?';
                $('#tiles').querySelector(`.tile[data-idx="${activeMenuIndex}"]`)?.classList.add('pending-delete');
            }
            break;
    }
    if (action !== 'delete') {
        hideContextMenu();
    }
}

function hideContextMenu() {
    const contextMenu = $('#contextMenu');
    contextMenu.classList.remove('is-open');
    setTimeout(() => { contextMenu.hidden = true; }, 200); // Wait for animation
}

function resetDeleteConfirmation() {
    const confirmItem = $('#contextMenu .confirm-delete');
    if (confirmItem) {
        confirmItem.classList.remove('confirm-delete');
        confirmItem.querySelector('span').textContent = 'Enviar a la papelera';
    }
    $('#tiles .pending-delete')?.classList.remove('pending-delete');
}

export function renderEditor() {
    const editor = $('#editor');
    editor.innerHTML = '';
    tiles.forEach((t, i) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.dataset.idx = i;
        row.draggable = true;
        row.innerHTML = `<span style="cursor:grab">⠿</span><input class="e-name" data-idx="${i}" value="${t.name}"/><input class="e-url" data-idx="${i}" value="${t.url || ''}"/><button class="e-save btn" data-idx="${i}">Guardar</button>`;
        editor.appendChild(row);
    });
}

function handleEditorClick(e) {
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
}

function handleEditorDragStart(e) {
    if (e.target.classList.contains('row')) {
        dragEditorRowSrcEl = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }
}

function handleEditorDragOver(e) {
    e.preventDefault();
    const targetRow = e.target.closest('.row');
    if (targetRow && targetRow !== dragEditorRowSrcEl) {
        $$('#editor .row').forEach(r => r.classList.remove('drag-over'));
        targetRow.classList.add('drag-over');
    }
}

function handleEditorDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.row');
    if (dragEditorRowSrcEl && dropTarget && dragEditorRowSrcEl !== dropTarget) {
        const from = Number(dragEditorRowSrcEl.dataset.idx);
        const to = Number(dropTarget.dataset.idx);
        const item = tiles.splice(from, 1)[0];
        tiles.splice(to, 0, item);
        saveAndRender();
    }
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
}

function handleEditorDragEnd() {
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
    dragEditorRowSrcEl = null;
}

function openModal(index = null) {
    editing = index;
    const modal = $('#modal');
    modal.dataset.editingIndex = index;
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const tile = (index !== null) ? currentTiles[index] : null;
    const isFolder = tile?.type === 'folder';

    $('.modal-preview').hidden = isFolder;
    $('#modalUrlLabel').hidden = isFolder;
    $('#modalUrl').hidden = isFolder;

    if (tile) {
        $('#modalTitle').textContent = 'Editar Acceso';
        $('#modalName').value = tile.name;
        if (tile.type === 'link') {
            $('#modalUrl').value = tile.url;
            try {
                $('#modalPreviewImg').src = tile.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${new URL(tile.url).hostname}`;
            } catch (e) {
                $('#modalPreviewImg').src = ''; // URL inválida, no mostrar ícono
            }
        }
    } else {
        $('#modalTitle').textContent = 'Añadir Nuevo Acceso';
        $('#modalName').value = '';
        $('#modalUrl').value = 'https://';
        $('#modalPreviewImg').src = '';
    }
    document.body.style.overflow = 'hidden';
    modal.hidden = false;
    setTimeout(() => modal.classList.add('is-open'), 10);
    $('#modalName').focus();
}

function closeModal() {
    const modal = $('#modal');
    modal.classList.remove('is-open');
    editing = null;
    $('#modalIconFile').value = '';
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 300);
}

function handleModalSave() {
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const name = $('#modalName').value.trim();
    const url = $('#modalUrl').value.trim();
    const isEditingFolder = (editing !== null && currentTiles[editing]?.type === 'folder');

    if (!name || (!isEditingFolder && !url)) return;

    const newItem = {
        name,
        url: isEditingFolder ? undefined : url,
        customIcon: $('#modalPreviewImg').src.startsWith('data:image') ? $('#modalPreviewImg').src : (currentTiles[editing]?.customIcon || null)
    };

    if (editing !== null) {
        const originalItem = currentTiles[editing];
        currentTiles[editing] = { ...originalItem, ...newItem };
    } else {
        currentTiles.unshift({ type: 'link', name, url, favorite: false });
    }
    saveAndRender();
    closeModal();
}

function handleModalIconFileChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => { $('#modalPreviewImg').src = event.target.result; };
        reader.readAsDataURL(file);
    }
}

function handleModalResetIcon() {
    const index = $('#modal').dataset.editingIndex;
    if (index === null) return;
    const tile = FolderManager.getTilesForCurrentView(tiles)[index];
    if (tile?.url) {
        try {
            $('#modalPreviewImg').src = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(tile.url).hostname}`;
        } catch (e) {
            $('#modalPreviewImg').src = ''; // URL inválida, no mostrar ícono
        }
    }
    tile.customIcon = null;
}

function handleModalKeydown(e) {
    if ($('#modal').hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
        const focusable = $$('#modal button, #modal input').filter(el => !el.hidden && !el.disabled);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
        }
    }
}