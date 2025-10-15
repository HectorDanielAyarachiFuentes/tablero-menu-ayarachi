import { $, $$, storageSet, storageGet } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderFavoritesInSelect } from '../utils/search.js';
import { showSaveStatus } from './ui.js';
import { FileSystem } from './file-system.js';
import { DOMPurify } from './lib.js';

export let tiles = [];
export let trash = [];
let editing = null;
let activeMenuIndex = null;
let dragTileSrcEl = null;
let dragEditorRowSrcEl = null;
let debounceTimer;

const MAX_NOTE_LENGTH = 10000; // Límite de 10,000 caracteres para el contenido de las notas.
export function setTiles(newTiles) {
    tiles = newTiles;
}

export function setTrash(newTrash) {
    trash = newTrash;
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
    $('#modalIconPreview').addEventListener('click', () => $('#modalIconFile').click());
    $('#addNote').addEventListener('click', () => openModal(null, 'note'));
    $('#modalIconFile').addEventListener('change', handleModalIconFileChange);
    $('#modalResetIcon').addEventListener('click', handleModalResetIcon);

    document.addEventListener('keydown', handleModalKeydown);

    // Listeners para la barra de herramientas del editor de texto enriquecido
    $$('.rich-editor-toolbar button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            document.execCommand(button.dataset.command, false, null);
        });
    });

    // Añadir listener para obtener el título de la página automáticamente
    const urlInput = $('#modalUrl');
    urlInput.addEventListener('paste', (e) => {
        // Esperamos un instante para que el valor pegado se asiente en el input
        setTimeout(() => handleUrlMetadata(e), 100);
    });
    urlInput.addEventListener('change', handleUrlMetadata);
    urlInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => handleUrlMetadata({target: urlInput}), 1000);
    });
}

/**
 * Escapa caracteres HTML para prevenir XSS en campos de texto simple.
 * @param {string} str La cadena a escapar.
 * @returns {string} La cadena escapada.
 */
function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}


export function saveAndRender() {
    // Guardamos en el almacenamiento del navegador y, si está activado, en el archivo local.
    const dataToSave = { tiles, trash };
    storageSet(dataToSave).then(async () => {
        const { autoSync } = await storageGet(['autoSync']);
        if (autoSync) {
            await FileSystem.saveDataToFile(dataToSave);
        }
        showSaveStatus();
    });

    renderFavoritesInSelect();
    renderTiles();
    renderEditor();
    renderNotes();
    renderTrash();
}

export function renderTiles() {
    const tilesEl = $('#tiles');
    const tpl = $('#tileTpl');
    // Comprobación de seguridad: si la plantilla no existe, no podemos renderizar.
    if (!tpl) {
        console.error('El elemento de plantilla #tileTpl no se encontró en el DOM. No se pueden renderizar los accesos.');
        tilesEl.innerHTML = '<p style="text-align: center; opacity: 0.7;">Error: No se pudo cargar la plantilla de accesos.</p>';
        return;
    }
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const displayableTiles = currentTiles.filter(t => t.type !== 'note'); // Filtrar notas
    let skeletonHTML = '';
    tilesEl.innerHTML = ''; // Limpiar antes de añadir

    for (let i = 0; i < displayableTiles.length; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'tile-skeleton';
        skeleton.style.setProperty('--animation-delay', `${i * 50}ms`);
        tilesEl.appendChild(skeleton);
    }

    displayableTiles.forEach((t, i) => {
        const node = FolderManager.renderTile(t, i, tpl, tiles);
        // La animación ya se aplica dentro de renderTile
        if (tilesEl.children[i]) tilesEl.replaceChild(node, tilesEl.children[i]);
    });

    const addNode = document.createElement('div');
    addNode.className = 'tile tile-add';
    addNode.href = '#';
    addNode.innerHTML = `<span>+</span><div>Añadir</div>`;
    addNode.style.setProperty('--animation-delay', `${displayableTiles.length * 50}ms`);
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
        if (tileData?.type === 'folder') {
            e.preventDefault(); // Prevent navigation for folders
        }
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
    if (!targetTile || targetTile === dragTileSrcEl) return;

    // Limpiar clases de otros tiles
    $$('.tile.drag-over, .tile.drag-over-folder').forEach(t => {
        if (t !== targetTile) {
            t.classList.remove('drag-over', 'drag-over-folder');
        }
    });

    const toIndex = Number(targetTile.dataset.idx);
    const currentTiles = FolderManager.getTilesForCurrentView(tiles);
    const targetTileData = currentTiles[toIndex];

    if (targetTileData.type === 'folder') {
        targetTile.classList.add('drag-over-folder');
    } else {
        targetTile.classList.add('drag-over');
    }
}

function handleTileDragLeave(e) {
    e.target.closest('.tile')?.classList.remove('drag-over', 'drag-over-folder');
}

function handleTileDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.tile:not(.tile-add)');
    if (!dragTileSrcEl || !dropTarget) return;

    const fromIndex = Number(dragTileSrcEl.dataset.idx);
    const toIndex = Number(dropTarget.dataset.idx);
    const currentTileList = FolderManager.getTilesForCurrentView(tiles);
    const targetTileData = currentTileList[toIndex];

    // Si soltamos sobre una carpeta
    if (targetTileData.type === 'folder' && dragTileSrcEl !== dropTarget) {
        const itemToMove = currentTileList.splice(fromIndex, 1)[0];
        // Asegurarse de que la carpeta tiene un array de hijos
        if (!targetTileData.children) {
            targetTileData.children = [];
        }
        targetTileData.children.unshift(itemToMove); // Añadir al principio de la carpeta
        saveAndRender();
    } 
    // Si soltamos sobre otro acceso (para reordenar)
    else if (dragTileSrcEl !== dropTarget) {
        const fromIndex = Number(dragTileSrcEl.dataset.idx);
        const toIndex = Number(dropTarget.dataset.idx);
        const currentTiles = FolderManager.getTilesForCurrentView(tiles);
        const item = currentTiles.splice(fromIndex, 1)[0];
        currentTiles.splice(toIndex, 0, item);
        saveAndRender();
    }
}

function handleTileDragEnd() {
    $$('.tile').forEach(t => t.classList.remove('dragging', 'drag-over', 'drag-over-folder'));
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
    contextMenu.style.setProperty('--menu-left', `${rect.left}px`);
    contextMenu.style.setProperty('--menu-top', `${rect.bottom + 5}px`);
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
                // Mover el elemento a la papelera en lugar de borrarlo
                const itemToTrash = currentTiles.splice(activeMenuIndex, 1)[0];
                itemToTrash.deletedAt = new Date().toISOString();
                trash.unshift(itemToTrash); // Añadir al principio de la papelera
                saveAndRender();
                resetDeleteConfirmation();
                hideContextMenu();
            } else {
                resetDeleteConfirmation();
                deleteOption.classList.add('confirm-delete'); 
                deleteOption.querySelector('span').textContent = '¿Confirmar envío?';
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

export function renderTrash() {
    const trashListEl = $('#trash-list');
    if (!trashListEl) return;

    // Habilitar o deshabilitar el botón de vaciar papelera
    const emptyTrashBtn = $('#emptyTrashBtn');
    if (emptyTrashBtn) {
        emptyTrashBtn.disabled = trash.length === 0;
    }

    trashListEl.innerHTML = '';
    trash.forEach((item, index) => {
        const trashItemEl = document.createElement('div');
        trashItemEl.className = 'trash-item';

        let iconSrc = 'icons/icon16.png'; // Default icon
        if (item.type === 'note') {
            iconSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z'%3E%3C/path%3E%3Cpolyline points='15 3 15 8 20 8'%3E%3C/polyline%3E%3C/svg%3E";
        } else if (item.customIcon) {
            iconSrc = item.customIcon;
        } else if (item.url && (item.url.startsWith('http:') || item.url.startsWith('https:'))) {
            try {
                iconSrc = `https://www.google.com/s2/favicons?sz=32&domain=${new URL(item.url).hostname}`;
            } catch (e) { /* URL inválida, se usa el ícono por defecto */ }
        }

        trashItemEl.innerHTML = `
            <div class="trash-item-info">
                <img src="${iconSrc}" alt="" onerror="this.style.display='none'">
                <span>${item.name}</span>
            </div>
            <div class="trash-actions">
                <button class="restore-btn" data-idx="${index}" title="Restaurar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
                <button class="delete-perm-btn" data-idx="${index}" title="Eliminar permanentemente">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        trashListEl.appendChild(trashItemEl);
    });

    // Añadir listeners a los nuevos botones
    $$('.restore-btn').forEach(btn => btn.addEventListener('click', handleRestoreTrash));
    $$('.delete-perm-btn').forEach(btn => btn.addEventListener('click', handleDeletePermanent));
}

function handleRestoreTrash(e) {
    const index = parseInt(e.currentTarget.dataset.idx, 10);
    const itemToRestore = trash.splice(index, 1)[0];
    delete itemToRestore.deletedAt; // Limpiamos la fecha de borrado
    tiles.unshift(itemToRestore); // Lo añadimos al principio de la lista principal
    saveAndRender();
}

function handleDeletePermanent(e) {
    const index = parseInt(e.currentTarget.dataset.idx, 10);
    if (confirm(`¿Estás seguro de que quieres eliminar "${trash[index].name}" permanentemente? Esta acción no se puede deshacer.`)) {
        trash.splice(index, 1);
        saveAndRender();
    }
}

export function renderNotes() {
    const notesListEl = $('#notes-list');
    if (!notesListEl) return;

    const allNotes = tiles.map((tile, index) => ({ ...tile, originalIndex: index }))
                         .filter(tile => tile.type === 'note');

    notesListEl.innerHTML = '';

    if (allNotes.length === 0) {
        notesListEl.innerHTML = `
            <div class="empty-notes">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                <span>Tus notas aparecerán aquí.</span>
            </div>`;
        return;
    }

    allNotes.forEach((note, i) => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-item';
        noteEl.dataset.idx = note.originalIndex;
        noteEl.style.setProperty('--animation-delay', `${i * 60}ms`);

        noteEl.innerHTML = `
            <div class="note-item-header">
                <span class="note-item-title">${note.name}</span>
            </div>
            <div class="note-item-content">${note.content || ''}</div>
            <div class="note-item-actions">
                <button class="note-edit-btn" title="Editar nota">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="note-delete-btn" title="Eliminar nota">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        noteEl.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openModal(note.originalIndex);
            }
        });

        noteEl.querySelector('.note-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal(note.originalIndex);
        });

        noteEl.querySelector('.note-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`¿Estás seguro de que quieres enviar la nota "${note.name}" a la papelera?`)) {
                const itemToTrash = tiles.splice(note.originalIndex, 1)[0];
                itemToTrash.deletedAt = new Date().toISOString();
                trash.unshift(itemToTrash);
                saveAndRender();
            }
        });

        notesListEl.appendChild(noteEl);
    });
}

function openModal(index = null, forceType = null) {
    editing = index;
    const modal = $('#modal');
    modal.dataset.editingIndex = index;
    
    $('#overlay').setAttribute('aria-hidden', 'false');
    // When editing, we get the tile from the main `tiles` array using its absolute index.
    const tile = (index !== null) ? tiles[index] : null;
    const type = forceType || tile?.type || 'link';

    // Reset state
    $('#modalUrlGroup').hidden = true;
    $('#modalContentGroup').hidden = true;
    $('#modalName').placeholder = '';
    $('#modalUrl').placeholder = ' '; // Required for :placeholder-shown selector to work
    $('#modalContent').dataset.placeholder = ' '; // For floating label on contenteditable
    $('#modalIconContainer').hidden = true;
    $('#modalPreviewImg').hidden = true;
    $('#modalIconPlaceholder').hidden = false;

    if (tile) {
        // Editing existing item
        $('#modalTitle').textContent = `Editar ${type === 'note' ? 'Nota' : 'Acceso'}`;
        $('#modalName').value = tile.name;

        if (tile.type === 'link') {
            $('#modalUrlGroup').hidden = false;
            $('#modalIconContainer').hidden = false;
            $('#modalUrl').value = tile.url;
            try {
                const iconSrc = tile.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${new URL(tile.url).hostname}`;
                updateIconPreview(iconSrc, !!tile.customIcon);
            } catch (e) {
                updateIconPreview('', false); // URL inválida, no mostrar ícono
            }
        } else if (tile.type === 'note') {
            $('#modalContentGroup').hidden = false;
            $('#modalContent').innerHTML = tile.content || '';
        }
    } else {
        // Adding new item
        $('#modalName').value = '';
        $('#modalUrl').value = '';
        $('#modalContent').innerHTML = '';
        updateIconPreview('', false);

        if (type === 'note') {
            $('#modalTitle').textContent = 'Añadir Nueva Nota';
            $('#modalContentGroup').hidden = false;
        } else {
            $('#modalTitle').textContent = 'Añadir Nuevo Acceso';
            $('#modalUrlGroup').hidden = false;
            $('#modalIconContainer').hidden = false;
        }

        // Show type selector only when creating a new item from the main board
        // The type selector is no longer needed for adding from the main board.
    }
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.classList.add('is-open'), 10);
    $('#modalName').focus();
}

export function closeModal() {
    const modal = $('#modal');
    modal.classList.remove('is-open');
    editing = null;
    $('#overlay').setAttribute('aria-hidden', 'true');
    $('#modalIconFile').value = '';
    setTimeout(() => { modal.setAttribute('aria-hidden', 'true'); }, 300);
}

function handleModalSave() {
    const rawName = $('#modalName').value.trim();
    if (!rawName) return;
    const name = escapeHTML(rawName); // Sanitizar el nombre

    const originalItem = editing !== null ? tiles[editing] : null;
    
    // Determinar el tipo de elemento.
    // Si estamos editando, usamos el tipo del elemento original.
    // Si estamos creando uno nuevo, verificamos qué grupo de campos está visible en el modal.
    let type;
    if (originalItem) {
        type = originalItem.type;
    } else {
        type = $('#modalContentGroup').hidden ? 'link' : 'note';
    }

    if (editing !== null) {
        tiles[editing].name = name;
        if (tiles[editing].type === 'link') {
            const url = $('#modalUrl').value.trim();
            if (!url) {
                alert('Por favor, introduce una URL.');
                return;
            }
            try {
                new URL(url); // Valida que la URL tenga un formato correcto.
            } catch (e) {
                alert('La URL introducida no es válida. Asegúrate de que el formato sea correcto (ej: https://www.google.com).');
                return;
            }
            tiles[editing].url = url;
            if ($('#modalPreviewImg').src.startsWith('data:image')) {
                tiles[editing].customIcon = $('#modalPreviewImg').src;
            }
        } else if (tiles[editing].type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) {
                alert(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`);
                return;
            }
            tiles[editing].content = DOMPurify.sanitize(content);
        }
    } else {
        // Creando un nuevo elemento
        if (type === 'link') {
            const url = $('#modalUrl').value.trim();
            if (!url) {
                alert('Por favor, introduce una URL.');
                return;
            }
            try {
                new URL(url);
            } catch (e) {
                alert('La URL introducida no es válida. Asegúrate de que el formato sea correcto (ej: https://www.google.com).');
                return;
            }
            const newLink = {
                type: 'link',
                name,
                url: $('#modalUrl').value.trim(),
                favorite: false,
                customIcon: null
            };
            if ($('#modalPreviewImg').src.startsWith('data:image')) {
                newLink.customIcon = $('#modalPreviewImg').src;
            }
            // Añadir el nuevo enlace al inicio de la vista actual (sea la raíz o una carpeta)
            const currentFolder = FolderManager.getTilesForCurrentView(tiles);
            currentFolder.unshift(newLink);
        } else if (type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) {
                alert(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`);
                return;
            }
            // Añadir la nueva nota siempre al inicio del listado principal de `tiles`
            tiles.unshift({ type: 'note', name, content: DOMPurify.sanitize(content) });
        }
    }
    saveAndRender();
    closeModal();
}

function handleUrlMetadata(e) {
    const urlInput = e.target;
    const nameInput = $('#modalName');
    const url = urlInput.value.trim();

    // Solo proceder si el campo de nombre está vacío y la URL es válida
    if (nameInput.value.trim() !== '') {
        return;
    }

    try {
        const parsedUrl = new URL(url);
        let hostname = parsedUrl.hostname;
        // Limpiar el nombre del host (quitar 'www.' y extensiones comunes)
        hostname = hostname.replace(/^www\./, '');
        const domainParts = hostname.split('.');
        if (domainParts.length > 1) {
            // Capitalizar el nombre principal del dominio (ej. 'google' de 'google.com')
            nameInput.value = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
        }

        // Actualizar también la vista previa del icono
        const previewImg = $('#modalPreviewImg');
        if (!previewImg.dataset.isCustom) {
             updateIconPreview(`https://www.google.com/s2/favicons?sz=128&domain=${hostname}`, false);
        }
    } catch (error) {
        // La URL puede ser inválida mientras el usuario escribe, ignoramos el error.
    }
}

function handleModalIconFileChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            updateIconPreview(event.target.result, true);
        };
        reader.readAsDataURL(file);
    }
}

function handleModalResetIcon() {
    const index = $('#modal').dataset.editingIndex;
    const url = $('#modalUrl').value;
    
    // Si estamos editando, usamos la URL del tile original si no hay una en el input
    const tile = (index !== null && index !== 'null') ? tiles[index] : null;
    const finalUrl = url || tile?.url;

    if (finalUrl) {
        try {
            const newIconSrc = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(finalUrl).hostname}`;
            updateIconPreview(newIconSrc, false);
        } catch (e) {
            updateIconPreview('', false); // URL inválida, no mostrar ícono
        }
    }
    if (tile) tile.customIcon = null;
}

function updateIconPreview(src, isCustom) {
    const previewImg = $('#modalPreviewImg');
    previewImg.src = src;
    previewImg.hidden = !src;
    previewImg.dataset.isCustom = isCustom;
    $('#modalIconPlaceholder').hidden = !!src;
    $('#modalResetIcon').hidden = !isCustom;
}

function handleModalKeydown(e) {
    if ($('#modal').getAttribute('aria-hidden') === 'true') return;
    // La tecla Escape ahora se gestiona en ui.js para cerrar cualquier panel abierto.
    // if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter' && e.ctrlKey) { handleModalSave(); }
    else if (e.key === 'Tab') {
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