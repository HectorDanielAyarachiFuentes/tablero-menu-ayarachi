import { $, $$ } from './utils.js';
import { saveAndSyncSetting } from './utils.js';
import { updateBackground } from './app.js';
 
export let DOODLES = [];
 
/**
 * Carga los doodles desde el archivo JSON.
 */
async function loadDoodles() {
  if (DOODLES.length > 0) return; // Evitar recargar si ya están cargados
  try {
    const response = await fetch('../json/doodle.json');
    DOODLES = await response.json();
  } catch (error) {
    console.error('Error al cargar los doodles:', error);
  }
}
 
export async function initDoodleSettings(activeDoodleId) {
  await loadDoodles(); // Asegurarse de que los doodles estén cargados
  const doodleList = $('#doodle-list');
  doodleList.innerHTML = ''; // Limpiar la lista
 
  DOODLES.forEach(doodle => {
    const button = document.createElement('button');
    button.className = 'doodle-item';
    button.dataset.doodleId = doodle.id;

    button.innerHTML = `
      <div class="doodle-item-preview ${doodle.id}">
        <css-doodle>${doodle.template || ''}</css-doodle>
      </div>
      <span class="doodle-item-name">${doodle.name}</span>
    `;

    if (doodle.id === 'none') {
      button.querySelector('.doodle-item-preview').classList.add('none');
    }
    button.addEventListener('click', () => handleDoodleSelection(doodle.id));

    // Pausar la animación de la miniatura para mejorar el rendimiento
    const doodleElement = button.querySelector('css-doodle');
    if (doodleElement) {
      // Se añade un pequeño retardo para asegurar que el elemento se haya inicializado
      setTimeout(() => doodleElement.pause(), 100);
    }
    
    doodleList.appendChild(button);
  });

  updateDoodleSelectionUI(activeDoodleId);
}

export function handleDoodleSelection(doodleId) {
  saveAndSyncSetting({ doodle: doodleId });
  updateBackground();
}


export function updateDoodleSelectionUI(doodleId) {
  const doodlePreviewContainer = $('#doodle-preview');
  $$('#doodle-list .doodle-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.doodleId === doodleId);
  });

  const doodle = DOODLES.find(d => d.id === doodleId);
  if (doodle && doodle.id !== 'none' && doodle.template) {
    doodlePreviewContainer.innerHTML = `<css-doodle>${doodle.template}</css-doodle>`;
  } else {
    doodlePreviewContainer.innerHTML = '<span class="placeholder-text">Selecciona un doodle para verlo aquí</span>';
  }
}