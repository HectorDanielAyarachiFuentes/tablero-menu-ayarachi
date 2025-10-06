import { renderTiles, saveAndRender } from './tiles.js';

let viewPath = []; // Private state for folder path

export const FolderManager = {

    // Gets the array of tiles for the current folder view
    getTilesForCurrentView(rootTiles) {
        let currentLevel = rootTiles;
        for (const index of viewPath) {
            // Ensure we are traversing into a valid folder
            if (currentLevel[index] && currentLevel[index].type === 'folder') {
                currentLevel = currentLevel[index].children;
            } else {
                viewPath = []; // Reset path if invalid
                return rootTiles;
            }
        }
        return currentLevel;
    },

    // Renders a single tile (link or folder)
    renderTile(tile, index, tpl, rootTiles) {
        let node = tpl.content.firstElementChild.cloneNode(true);
        node.dataset.idx = index;
        node.querySelector('.title').textContent = tile.name;
        node.style.animationDelay = `${index * 50}ms`;

        if (tile.type === 'folder') {
            node.classList.add('folder');
            node.querySelector('.url').textContent = `${tile.children.length} elemento(s)`;
            node.setAttribute('aria-label', `${tile.name}, carpeta`);
            node.removeAttribute('target');
            node.removeAttribute('rel');
            node.addEventListener('click', (e) => {
                e.preventDefault();
                viewPath.push(index);
                renderTiles(); // Assumes renderTiles is a global function
            });
        } else { // link (default)
            // For links, we wrap the div from the template in an <a> tag
            const linkNode = document.createElement('a');
            linkNode.href = tile.url;
            linkNode.rel = 'noopener noreferrer';
            // Copy all attributes and classes from the div to the new <a>
            for (const attr of node.attributes) {
                linkNode.setAttribute(attr.name, attr.value);
            }
            linkNode.innerHTML = node.innerHTML;
            node = linkNode;

            try {
                const url = new URL(tile.url);
                node.querySelector('.url').textContent = url.hostname.replace('www.', '');
                if (url.hostname && url.hostname.includes('.')) node.querySelector('.thumb').src = `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
            } catch (e) {
                node.querySelector('.url').textContent = tile.url;
                node.querySelector('.thumb').src = '';
            }

            // Use custom icon if it exists, overwriting the default favicon
            if (tile.customIcon) {
                node.querySelector('.thumb').src = tile.customIcon;
            }
        }

        // Drag/drop listeners
        node.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', index));
        node.addEventListener('dragover', ev => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; });
        node.addEventListener('dragenter', () => { if (tile.type === 'folder') node.classList.add('drag-over-folder'); });
        node.addEventListener('dragleave', () => node.classList.remove('drag-over-folder'));
        node.addEventListener('drop', ev => {
            ev.preventDefault();
            ev.currentTarget.classList.remove('drag-over-folder');
            const fromIndex = Number(ev.dataTransfer.getData('text/plain'));
            const toIndex = index;
            const currentLevel = FolderManager.getTilesForCurrentView(rootTiles);
            const item = currentLevel.splice(fromIndex, 1)[0];

            if (tile.type === 'folder' && item.type === 'link') {
                tile.children.unshift(item);
            } else {
                currentLevel.splice(toIndex, 0, item);
            }
            saveAndRender(); // Assumes global function
        });

        return node;
    },

    goBack() {
        if (viewPath.length > 0) {
            viewPath.pop();
            return true; // Indicate that the view changed
        }
        return false;
    },

    isRootView() {
        return viewPath.length === 0;
    },

    getCurrentPath() {
        return viewPath;
    }
};