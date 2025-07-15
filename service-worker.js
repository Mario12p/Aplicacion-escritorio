const CACHE_NAME = 'mini-task-app-cache-v1'; // Nombre de la caché
const urlsToCache = [ // Lista de archivos que quieres cachear
    './', // Esto cachea el index.html principal
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    // Asegúrate de que las rutas a tus iconos sean correctas
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// Evento 'install': se dispara cuando el Service Worker se instala
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME) // Abre la caché con el nombre definido
            .then(cache => {
                console.log('Service Worker: Cacheando archivos estáticos');
                return cache.addAll(urlsToCache); // Añade todos los archivos a la caché
            })
    );
});

// Evento 'fetch': se dispara cada vez que la app intenta hacer una petición de red
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request) // Intenta encontrar la petición en la caché
            .then(response => {
                // Si la encuentra, devuelve la respuesta cacheada
                // Si no, hace la petición a la red (fetch)
                return response || fetch(event.request);
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
                })
            );
        })
    );
});