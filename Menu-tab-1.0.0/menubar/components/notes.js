/**
 * Gestiona toda la funcionalidad relacionada con el panel de notas.
 * Se encarga de renderizar las notas, y manejar su creación, edición y eliminación.
 */
import { $, $$ } from '../core/utils.js';
import { tiles, trash, saveAndRender } from '../core/tiles.js';
import { openModal } from './modal.js';

export function initNotes() {
    $('#addNote').addEventListener('click', () => openModal(null, 'note'));
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