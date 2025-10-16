/**
 * Gestiona el modal para crear y editar accesos y notas.
 * Se encarga de abrir, cerrar, rellenar los datos y guardar los cambios del modal.
 */
import { $, $$, storageSet, storageGet } from '../core/utils.js';
import { tiles, saveAndRender } from '../core/tiles.js';
import { FolderManager } from '../core/carpetas.js';
import { DOMPurify } from '../lib/lib.js';

let editing = null;
let debounceTimer;
const MAX_NOTE_LENGTH = 10000; // Límite de 10,000 caracteres para el contenido de las notas.

export function initModal() {
    $('#modalSave').addEventListener('click', handleModalSave);
    $('#modalCancel').addEventListener('click', () => closeModal());
    $('#closeModal')?.addEventListener('click', () => closeModal());
    $('#modalIconPreview').addEventListener('click', () => $('#modalIconFile').click());
    $('#addFolder')?.addEventListener('click', () => openModal(null, 'folder'));
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
        setTimeout(() => handleUrlMetadata(e), 100);
    });
    urlInput.addEventListener('change', handleUrlMetadata);
    urlInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => handleUrlMetadata({ target: urlInput }), 1000);
    });
}

export function openModal(index = null, forceType = null) {
    editing = index;
    const modal = $('#modal');
    modal.dataset.editingIndex = index;

    $('#overlay').setAttribute('aria-hidden', 'false');
    const tile = (index !== null) ? tiles[index] : null;
    const type = forceType || tile?.type || 'link';

    // Reset state
    $('#modalUrlGroup').hidden = true;
    $('#modalContentGroup').hidden = true;
    $('#modalName').placeholder = '';
    $('#modalUrl').placeholder = ' ';
    $('#modalContent').dataset.placeholder = ' ';
    $('#modalIconContainer').hidden = true;
    $('#modalPreviewImg').hidden = true;
    $('#modalUrl').required = true;
    $('#modalIconPlaceholder').hidden = false;

    if (tile) {
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
                updateIconPreview('', false);
            }
        } else if (tile.type === 'note') {
            $('#modalContentGroup').hidden = false;
            $('#modalContent').innerHTML = tile.content || '';
        } else if (tile.type === 'folder') {
            // No hay campos adicionales para una carpeta, solo el nombre.
            // El modal ya muestra el nombre por defecto.
            $('#modalIconContainer').hidden = true;
        }
    } else {
        $('#modalName').value = '';
        $('#modalUrl').value = '';
        $('#modalContent').innerHTML = '';
        updateIconPreview('', false);

        if (type === 'note') {
            $('#modalTitle').textContent = 'Añadir Nueva Nota';
            $('#modalContentGroup').hidden = false;
        } else if (type === 'folder') {
            $('#modalTitle').textContent = 'Añadir Nueva Carpeta';
            $('#modalIconContainer').hidden = true;
            $('#modalUrl').required = false; // La URL no es necesaria para una carpeta
            $('#modalUrlGroup').hidden = true;
        } else {
            $('#modalTitle').textContent = 'Añadir Nuevo Acceso';
            $('#modalUrlGroup').hidden = false;
            $('#modalIconContainer').hidden = false;
        }
    }
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.classList.add('is-open'), 10);
    $('#modalName').focus();
}

export function closeModal() {
    const modal = $('#modal');
    modal.classList.remove('is-open');
    editing = null;
    // Solo ocultar el overlay si no hay otros paneles abiertos
    if ($('#settings').getAttribute('aria-hidden') === 'true' && $('#notes-panel').getAttribute('aria-hidden') === 'true') {
        $('#overlay').setAttribute('aria-hidden', 'true');
    }
    $('#modalIconFile').value = '';
    setTimeout(() => { modal.setAttribute('aria-hidden', 'true'); }, 300);
}

function handleModalSave() {
    const rawName = $('#modalName').value.trim();
    if (!rawName) return;
    const name = escapeHTML(rawName);

    const originalItem = editing !== null ? tiles[editing] : null;
    let type;
    if (originalItem) {
        type = originalItem.type;
    } else { // Nuevo elemento: determinar el tipo basándose en los campos visibles
        if (!$('#modalContentGroup').hidden) {
            type = 'note';
        } else if (!$('#modalUrlGroup').hidden) {
            type = 'link';
        } else { // Ni el grupo de URL ni el de contenido están visibles, implica carpeta
            type = 'folder';
        }
    }
    if (editing !== null) {
        tiles[editing].name = name;
        if (tiles[editing].type === 'link') {
            const url = $('#modalUrl').value.trim(); if (!url) { alert('Por favor, introduce una URL.'); return; } try { new URL(url); } catch (e) { alert('La URL introducida no es válida. Asegúrate de que el formato sea correcto (ej: https://www.google.com).'); return; } tiles[editing].url = url;
            if ($('#modalPreviewImg').src.startsWith('data:image')) {
                tiles[editing].customIcon = $('#modalPreviewImg').src;
            }
        } else if (tiles[editing].type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) { alert(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`); return; }
            tiles[editing].content = DOMPurify.sanitize(content);
        } else if (tiles[editing].type === 'folder') {
            // El nombre ya se actualizó, no hay más que hacer.
        }
    } else {
        if (type === 'link') {
            const url = $('#modalUrl').value.trim();
            if (!url) { alert('Por favor, introduce una URL.'); return; }
            try { new URL(url); } catch (e) { alert('La URL introducida no es válida. Asegúrate de que el formato sea correcto (ej: https://www.google.com).'); return; }
            const newLink = { type: 'link', name, url, favorite: false, customIcon: null };
            if ($('#modalPreviewImg').src.startsWith('data:image')) {
                newLink.customIcon = $('#modalPreviewImg').src;
            }
            const currentFolder = FolderManager.getTilesForCurrentView(tiles);
            currentFolder.unshift(newLink);
        } else if (type === 'note') {
            const content = $('#modalContent').innerHTML;
            if (content.length > MAX_NOTE_LENGTH) { alert(`El contenido de la nota excede el límite de ${MAX_NOTE_LENGTH} caracteres.`); return; }
            tiles.unshift({ type: 'note', name, content: DOMPurify.sanitize(content) });
        } else if (type === 'folder') {
            const newFolder = { type: 'folder', name, children: [] };
            const currentFolder = FolderManager.getTilesForCurrentView(tiles);
            currentFolder.unshift(newFolder);
        }
    }
    saveAndRender();
    closeModal();
}

function handleUrlMetadata(e) {
    const urlInput = e.target;
    const nameInput = $('#modalName');
    const url = urlInput.value.trim();

    if (nameInput.value.trim() !== '') return;

    try {
        const parsedUrl = new URL(url);
        let hostname = parsedUrl.hostname.replace(/^www\./, '');
        const domainParts = hostname.split('.');
        if (domainParts.length > 1) {
            nameInput.value = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
        }
        if (!$('#modalPreviewImg').dataset.isCustom) {
            updateIconPreview(`https://www.google.com/s2/favicons?sz=128&domain=${hostname}`, false);
        }
    } catch (error) { /* Ignorar errores de URL inválida mientras se escribe */ }
}

function handleModalIconFileChange(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => updateIconPreview(event.target.result, true);
        reader.readAsDataURL(file);
    }
}

function handleModalResetIcon() {
    const index = $('#modal').dataset.editingIndex;
    const url = $('#modalUrl').value;
    const tile = (index !== null && index !== 'null') ? tiles[index] : null;
    const finalUrl = url || tile?.url;

    if (finalUrl) {
        try {
            const newIconSrc = `https://www.google.com/s2/favicons?sz=128&domain=${new URL(finalUrl).hostname}`;
            updateIconPreview(newIconSrc, false);
        } catch (e) {
            updateIconPreview('', false);
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

function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}