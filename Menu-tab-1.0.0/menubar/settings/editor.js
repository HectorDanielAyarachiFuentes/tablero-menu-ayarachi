/**
 * Gestiona el panel "Gestionar Accesos" dentro de la configuración.
 * Se encarga de renderizar la lista de accesos y manejar su reordenamiento mediante drag-and-drop.
 */
import { $, $$ } from '../core/utils.js';
import { tiles, saveAndRender } from '../core/tiles.js';

let dragEditorRowSrcEl = null;

export function initEditor() {
    const editor = $('#editor');
    editor.addEventListener('click', handleEditorClick);
    editor.addEventListener('dragstart', handleEditorDragStart);
    editor.addEventListener('dragover', handleEditorDragOver);
    editor.addEventListener('drop', handleEditorDrop);
    editor.addEventListener('dragend', handleEditorDragEnd);

    const searchInput = $('#editorSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderEditor());
    }
}

export function renderEditor() {
    const editor = $('#editor');
    const searchInput = $('#editorSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Función recursiva para aplanar y buscar en todos los niveles
    const findTilesRecursive = (items, parentPath = []) => {
        let results = [];
        items.forEach((tile, index) => {
            const currentPath = [...parentPath, tile.name];
            const isMatch = !searchTerm || 
                            tile.name.toLowerCase().includes(searchTerm) || 
                            (tile.url && tile.url.toLowerCase().includes(searchTerm));

            if (isMatch) {
                results.push({
                    ...tile,
                    originalItemRef: tile, // Referencia directa al objeto original para poder guardarlo
                    displayPath: parentPath.length > 0 ? `${parentPath.join(' > ')}` : ''
                });
            }

            if (tile.type === 'folder' && tile.children) {
                // Si la carpeta misma no coincidió, aún buscamos dentro
                if (!isMatch) {
                    results = results.concat(findTilesRecursive(tile.children, currentPath));
                }
            }
        });
        return results;
    };

    const tilesToRender = findTilesRecursive(tiles);

    editor.innerHTML = ''; // Limpiar la lista actual
    tilesToRender.forEach((t) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.draggable = false; // Deshabilitamos el drag-and-drop en los resultados de búsqueda para evitar complejidad
        row.innerHTML = `<span class="e-path">${t.displayPath}</span><input class="e-name" value="${t.name}"/><input class="e-url" value="${t.url || ''}" ${t.type === 'folder' ? 'disabled' : ''}/><button class="e-save btn">Guardar</button>`;
        row.querySelector('.e-save').addEventListener('click', () => handleEditorSave(t.originalItemRef, row));
        editor.appendChild(row);
    });
}

function handleEditorSave(originalItem, row) {
    const name = row.querySelector('.e-name').value.trim();
    const url = row.querySelector('.e-url').value.trim();

    if (name) {
        originalItem.name = name;
        if (originalItem.type === 'link' && url) {
            originalItem.url = url;
        }
        saveAndRender();
    }
}

function handleEditorClick(e) {
    // La lógica de guardado ahora se maneja por el listener individual de cada botón.
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
    // Solo permitir reordenar si no hay una búsqueda activa
    if ($('#editorSearchInput').value.trim()) return;

    if (dragEditorRowSrcEl && dropTarget && dragEditorRowSrcEl !== dropTarget) {
        // La lógica de reordenación necesita el índice real, que ahora no tenemos directamente en el elemento
        // Para simplificar, la reordenación solo funcionará cuando no se esté buscando.
        const fromIndex = Array.from(dragEditorRowSrcEl.parentNode.children).indexOf(dragEditorRowSrcEl);
        const toIndex = Array.from(dropTarget.parentNode.children).indexOf(dropTarget);
        const item = tiles.splice(fromIndex, 1)[0];
        tiles.splice(toIndex, 0, item);
        saveAndRender();
    }
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
}

function handleEditorDragEnd() {
    $$('#editor .row').forEach(r => r.classList.remove('dragging', 'drag-over'));
    dragEditorRowSrcEl = null;
}