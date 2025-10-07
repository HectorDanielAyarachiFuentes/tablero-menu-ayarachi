/**
 * Este script se ejecuta de forma síncrona en el <head> ANTES que bg-loader.
 * Su única misión es rellenar el saludo, la fecha y la hora lo más rápido posible
 * para evitar el "parpadeo" de los placeholders y la animación de carga en esos elementos.
 */
(async () => {
  try {
    const settings = await new Promise(resolve =>
      (chrome.storage.sync || chrome.storage.local).get(['userName', 'weatherCity'], resolve)
    );

    // --- Renderizar Saludo ---
    const hour = new Date().getHours();
    let greetingText = '¡Hola!';
    if (hour < 12) greetingText = 'Buenos días';
    else if (hour < 20) greetingText = 'Buenas tardes';
    else greetingText = 'Buenas noches';
    const namePart = settings.userName ? `, <strong>${settings.userName}</strong>` : '';
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      greetingEl.innerHTML = `${greetingText}${namePart}`;
    }

    // --- Renderizar Reloj y Fecha ---
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) {
      clockEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const dateEl = document.getElementById('date');
    if (dateEl) {
      const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(now);
      dateEl.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    }

  } catch (error) {
    console.error('Error in pre-loader:', error);
    // Si falla, la app principal lo cargará de todas formas.
  }
})();