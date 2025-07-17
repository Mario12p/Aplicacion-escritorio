const CACHE_NAME = 'Tareas'; // *** ¡CAMBIA ESTO! Debe ser un nuevo nombre cada vez que modifiques el SW ***
const urlsToCache = [ // Lista de archivos que quieres cachear
    './', // Esto cachea el index.html principal
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    // ASEGÚRATE de que las rutas a tus iconos sean correctas
    // CORREGIDO: Cambiado de './icons/' a './ICONOS/' para coincidir con tu estructura de carpeta
    './ICONOS/icon-192x192.png', //
    './ICONOS/icon-512x512.png', //
    // *** NUEVO: Añadir la CDN de Font Awesome para los iconos ***
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Evento 'install': se dispara cuando el Service Worker se instala
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME) // Abre la caché con el nombre definido
            .then(cache => {
                console.log('Service Worker: Cacheando archivos estáticos:', CACHE_NAME);
                return cache.addAll(urlsToCache); // Añade todos los archivos a la caché
            })
            .catch(error => {
                console.error('Service Worker: Falló el cacheo durante la instalación:', error);
                // Si falla uno, puede que no se cachee nada. Considera añadir solo los críticos aquí.
            })
    );
});

// Evento 'fetch': se dispara cada vez que el navegador hace una petición de un recurso
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request) // Intenta encontrar la petición en la caché
            .then(response => {
                // Si la encuentra, devuelve la respuesta cacheada
                if (response) {
                    return response;
                }
                // Si no, hace la petición a la red y luego cachea la respuesta
                return fetch(event.request).then(
                    response => {
                        // Clonar la respuesta porque el stream del cuerpo se consume al usarlo.
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                ).catch(() => {
                    // Si la red también falla (offline) y no está en caché, puedes servir una página offline
                    // Esto es útil para una experiencia 100% offline.
                    // console.warn('Service Worker: Petición fallida desde caché y red. URL:', event.request.url);
                    // Aquí podrías retornar un caches.match('/offline.html') si tuvieras una página offline
                });
            })
    );
});

// Evento 'activate': se dispara cuando el Service Worker se activa (después de la instalación)
// Útil para limpiar cachés antiguas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                }).filter(Boolean) // Filtrar nulos para Promise.all
            );
        })
    );
});

// --- NUEVO: Manejo de Notificaciones Push Persistentes ---
// Este evento se dispara cuando el service worker recibe un mensaje push del servidor.
// Para que esto funcione, necesitas un servidor que envíe notificaciones push (usando la API Web Push).
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Recordatorio de Tarea';
    const options = {
        body: data.body || '¡Es hora de tu nota!',
        icon: data.icon || './ICONOS/icon-192x192.png', // Icono para la notificación
        badge: data.badge || './ICONOS/icon-192x192.png', // Icono más pequeño para el estado de la barra
        vibrate: [200, 100, 200], // Patrón de vibración
        data: {
            url: data.url || '/' // URL a abrir al hacer clic en la notificación
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Evento 'notificationclick': se dispara cuando el usuario hace clic en una notificación
self.addEventListener('notificationclick', event => {
    event.notification.close(); // Cierra la notificación

    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/') // Abre la URL asociada a la notificación
    );
});