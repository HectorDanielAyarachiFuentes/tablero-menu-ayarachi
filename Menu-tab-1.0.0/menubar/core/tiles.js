/**
 * Módulo central para la gestión de los "tiles" (accesos y carpetas).
 * Se encarga del estado principal (tiles, trash), la renderización de la cuadrícula,
 * y la lógica de arrastrar y soltar (drag and drop) en la vista principal.
 */
import { $, $$, storageSet, storageGet } from './utils.js';
import { FolderManager } from './carpetas.js';
import { renderFavoritesInSelect } from '../../utils/search.js';
import { showSaveStatus } from '../components/ui.js';
import { FileSystem } from '../system/file-system.js';
import { initContextMenu, showContextMenu } from '../components/context-menu.js';
import { renderTrash } from '../components/trash.js';
import { initModal, openModal } from '../components/modal.js';
import { initEditor, renderEditor } from '../settings/editor.js';
import { initNotes, renderNotes } from '../components/notes.js';

export let tiles = [];
export let trash = [];
let dragTileSrcEl = null;

export function setTiles(newTiles) {
    tiles = newTiles;
}

export function setTrash(newTrash) {
    trash = newTrash;
}

export function initTiles() {
    const tilesEl = $('#tiles');

    tilesEl.addEventListener('click', handleTileClick);
    tilesEl.addEventListener('dragstart', handleTileDragStart);
    tilesEl.addEventListener('dragover', handleTileDragOver);
    tilesEl.addEventListener('dragleave', handleTileDragLeave);
    tilesEl.addEventListener('drop', handleTileDrop);
    tilesEl.addEventListener('dragend', handleTileDragEnd);

    $('#addTile').addEventListener('click', () => openModal()); // This should already be handled in editor.js or similar

    initContextMenu();
    initModal();
    initEditor();
    initNotes();
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
    // Limpiamos el campo de búsqueda y renderizamos la lista completa
    const searchInput = $('#editorSearchInput');
    if (searchInput) searchInput.value = '';
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