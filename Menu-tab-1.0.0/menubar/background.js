// background service worker (minimal)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Tablero de Accesos - installed');
});

/**
 * Escucha la creación de nuevos marcadores en el navegador.
 * Cuando un usuario añade un marcador, este se agrega automáticamente
 * como un nuevo acceso en el tablero.
 */
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  // Nos aseguramos de que el marcador tenga una URL (es decir, no es una carpeta)
  if (!bookmark.url) {
    return;
  }

  console.log('Nuevo marcador detectado:', bookmark.title, bookmark.url);

  // Obtenemos los accesos actuales desde el almacenamiento local
  const data = await chrome.storage.local.get('tiles');
  const tiles = data.tiles || [];

  // Creamos el nuevo acceso con el formato de la aplicación
  const newTile = {
    type: 'link',
    name: bookmark.title || new URL(bookmark.url).hostname, // Usar el título o el nombre del sitio
    url: bookmark.url,
    favorite: false, // Por defecto no es favorito en el tablero
    customIcon: null
  };

  // Añadimos el nuevo acceso al principio de la lista y guardamos
  await chrome.storage.local.set({ tiles: [newTile, ...tiles] });

  // Enviamos un mensaje a las pestañas de la extensión para que se actualicen
  chrome.runtime.sendMessage({ type: 'BOOKMARK_ADDED' }, (response) => {
    // El 'catch' evita un error si no hay pestañas de la extensión abiertas para recibir el mensaje.
    if (chrome.runtime.lastError) { /* No hay receptor, no hacer nada. */ }
  });
  console.log('Nuevo acceso guardado y mensaje de actualización enviado.');
});