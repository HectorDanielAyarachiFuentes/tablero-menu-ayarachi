/**
 * Web Worker para manejar operaciones del sistema de archivos en segundo plano.
 */

const FILE_NAME = 'tablero-data.json';

self.onmessage = async (event) => {
    const { action, payload } = event.data;

    try {
        switch (action) {
            case 'loadData': {
                const data = await loadDataFromFile(payload.handle);
                self.postMessage({ action: 'loadDataResult', success: true, data });
                break;
            }
            case 'saveData': {
                await saveDataToFile(payload.handle, payload.data);
                self.postMessage({ action: 'saveDataResult', success: true });
                break;
            }
        }
    } catch (error) {
        console.error(`Error en el worker de archivos (${action}):`, error);
        self.postMessage({ action: `${action}Result`, success: false, error: error.message });
    }
};

async function loadDataFromFile(handle) {
    if (!handle) return null;

    try {
        const fileHandle = await handle.getFileHandle(FILE_NAME, { create: false });
        const file = await fileHandle.getFile();
        const content = await file.text();
        const data = JSON.parse(content);
        console.log('Datos cargados desde el archivo local (worker).');
        return data;
    } catch (err) {
        if (err.name === 'NotFoundError') {
            console.log('El archivo de datos no existe aún en el directorio seleccionado (worker).');
        } else {
            console.error('Error al cargar datos desde el archivo (worker):', err);
        }
        return null;
    }
}

/**
 * Función de utilidad para esperar un tiempo determinado.
 * @param {number} ms - Milisegundos a esperar.
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Intenta ejecutar una función asíncrona con reintentos y backoff exponencial.
 * @param {Function} asyncFn - La función asíncrona a ejecutar.
 * @param {number} maxRetries - Número máximo de reintentos.
 */
async function withRetries(asyncFn, maxRetries = 3) {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await asyncFn();
        } catch (error) {
            if (i === maxRetries) throw error; // Lanza el error en el último intento
            const delay = Math.pow(2, i) * 100; // 100ms, 200ms, 400ms...
            await wait(delay);
        }
    }
}

async function saveDataToFile(handle, dataToSave) {
    if (!handle) return;

    try {
        await withRetries(async () => {
            // Cambiamos 'create: true' a 'create: false'.
            // El archivo ahora SIEMPRE debe ser creado por el hilo principal en `selectDirectory`.
            // El worker solo debe leerlo y escribir sobre él, no crearlo desde cero.
            const fileHandle = await handle.getFileHandle(FILE_NAME, { create: false });
            const writable = await fileHandle.createWritable();
            // El objeto dataToSave ya viene completo desde el hilo principal.
            await writable.write(JSON.stringify(dataToSave, null, 2));
            await writable.close();
            console.log('Datos guardados en el archivo local (worker).');
        });
    } catch (err) {
        console.error('Error al guardar datos en el archivo (worker):', err);
        throw err; // Re-lanzamos para que el hilo principal sepa del error.
    }
}