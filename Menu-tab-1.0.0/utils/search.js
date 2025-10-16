/**
 * Gestiona la funcionalidad de la barra de búsqueda.
 * Incluye la lógica para realizar búsquedas y para el selector de motores de búsqueda y favoritos.
 */
import { $, storageGet, storageSet } from '../menubar/core/utils.js';
import { tiles } from '../menubar/core/tiles.js';

export function initSearch() {
    $('#searchGo').addEventListener('click', performSearch);
    $('#searchInput').addEventListener('keypress', e => e.key === 'Enter' && performSearch());

    $('#engineSelectTrigger').addEventListener('click', () => {
        const list = $('#engineSelectList');
        const isHidden = list.hidden;
        list.hidden = !isHidden;
        $('#engineSelectTrigger').setAttribute('aria-expanded', String(isHidden));
        $('.custom-select-wrapper').classList.toggle('open', isHidden);
    });

    $('#engineSelectList').addEventListener('click', handleEngineSelect);

    document.addEventListener('click', (e) => {
        if (!$('.custom-select-wrapper').contains(e.target)) {
            $('#engineSelectList').hidden = true;
            $('#engineSelectTrigger').setAttribute('aria-expanded', 'false');
            $('.custom-select-wrapper').classList.remove('open');
        }
    });
}

async function performSearch() {
    const q = $('#searchInput').value.trim();
    if (q) {
        const { engine } = await storageGet(['engine']);
        window.open(buildSearchUrl(engine || 'google', q));
    }
}

function buildSearchUrl(engine, q) {
    const enc = encodeURIComponent(q);
    const urls = {
        google: 'https://www.google.com/search?q=',
        duck: 'https://duckduckgo.com/?q=',
        bing: 'https://www.bing.com/search?q=',
        youtube: 'https://www.youtube.com/results?search_query=',
        wiki: 'https://es.wikipedia.org/w/index.php?search=',
        ecosia: 'https://www.ecosia.org/search?q='
    };
    return (urls[engine] || urls.google) + enc;
}

function updateSearchIcon(engine) {
    const domains = {
        google: 'google.com', duck: 'duckduckgo.com', bing: 'bing.com',
        youtube: 'youtube.com', wiki: 'wikipedia.org', ecosia: 'ecosia.org'
    };
    if (domains[engine]) {
        $('#selectedEngineIcon').src = `https://www.google.com/s2/favicons?sz=32&domain=${domains[engine]}`;
    }
}

export async function renderFavoritesInSelect() {
    const engineSelectList = $('#engineSelectList');
    engineSelectList.innerHTML = '';
    const { engine: currentEngine } = await storageGet(['engine']);

    const engines = [
        { value: 'google', text: 'Google' }, { value: 'duck', text: 'DuckDuckGo' },
        { value: 'bing', text: 'Bing' }, { value: 'youtube', text: 'YouTube' },
        { value: 'wiki', text: 'Wikipedia' }, { value: 'ecosia', text: 'Ecosia' },
    ];

    const createOption = (item) => {
        const option = document.createElement('div');
        option.className = 'option';
        option.dataset.value = item.value;
        if (item.url) option.dataset.url = item.url;
        const domain = item.url ? new URL(item.url).hostname : `${item.value}.com`;
        option.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=32&domain=${domain}" alt=""><span>${item.text}</span>`;
        engineSelectList.appendChild(option);
    };

    engines.forEach(createOption);
    tiles.filter(t => t.favorite).forEach(tile => createOption({
        value: `favorite-${tile.url}`, text: `⭐ ${tile.name}`, url: tile.url
    }));

    const currentEngineData = engines.find(e => e.value === currentEngine);
    if (currentEngineData) $('#selectedEngineName').textContent = currentEngineData.text;
    updateSearchIcon(currentEngine);
}

async function handleEngineSelect(e) {
    const option = e.target.closest('.option');
    if (!option) return;
    const selectedValue = option.dataset.value;
    if (selectedValue.startsWith('favorite-')) {
        window.open(option.dataset.url);
    } else {
        await storageSet({ engine: selectedValue });
        updateSearchIcon(selectedValue);
        $('#selectedEngineName').textContent = option.querySelector('span').textContent;
    }
    $('#engineSelectList').hidden = true;
    $('#engineSelectTrigger').setAttribute('aria-expanded', 'false');
    $('.custom-select-wrapper').classList.remove('open');
}