const FolderManager = (() => {
    let viewPath = []; // Private state for folder path

    // Gets the array of tiles for the current folder view
    function getTilesForCurrentView(rootTiles) {
        let currentLevel = rootTiles;
        for (const index of viewPath) {
            if (currentLevel[index] && currentLevel[index].type === 'folder') {
                currentLevel = currentLevel[index].children;
            } else {
                viewPath = []; // Reset path if invalid
                return rootTiles;
            }
        }
        return currentLevel;
    }

    // Renders a single tile (link or folder)
    function renderTile(tile, index, tpl) {
        const node = tpl.content.firstElementChild.cloneNode(true);
        node.dataset.idx = index;
        node.querySelector('.title').textContent = tile.name;
        node.style.animationDelay = `${index * 50}ms`;

        if (tile.type === 'folder') {
            node.classList.add('folder');
            node.querySelector('.url').textContent = `${tile.children.length} elemento(s)`;
            node.removeAttribute('target');
            node.removeAttribute('rel');
            node.href = '#';
            node.addEventListener('click', (e) => {
                e.preventDefault();
                viewPath.push(index);
                renderTiles(); // Assumes renderTiles is a global function
            });
        } else { // link
            node.href = tile.url;
            try {
                const url = new URL(tile.url);
                node.querySelector('.url').textContent = url.hostname.replace('www.', '');
                node.querySelector('.thumb').src = `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`;
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
            node.classList.remove('drag-over-folder');
            const fromIndex = Number(ev.dataTransfer.getData('text/plain'));
            const toIndex = index;
            const currentLevel = getTilesForCurrentView(window.tiles); // Assumes global tiles
            const item = currentLevel.splice(fromIndex, 1)[0];

            if (tile.type === 'folder' && item.type === 'link') {
                tile.children.unshift(item);
            } else {
                currentLevel.splice(toIndex, 0, item);
            }
            saveAndRender(); // Assumes global function
        });

        return node;
    }

    function goBack() {
        if (viewPath.length > 0) {
            viewPath.pop();
            renderTiles();
        }
    }

    function isRootView() {
        return viewPath.length === 0;
    }

    function getCurrentPath(){
        return viewPath;
    }

    // Public API
    return {
        getTilesForCurrentView,
        renderTile,
        goBack,
        isRootView,
        getCurrentPath
    };
})();