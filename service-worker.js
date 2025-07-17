// service-worker.js (Este es el Service Worker principal para Firebase Messaging)

// Importa los scripts del SDK de Firebase (debe ser la misma versión que en index.html)
// Usamos las versiones "compat" para compatibilidad con navegadores antiguos, aunque los módulos son preferibles en script.js
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// TU CONFIGURACIÓN DE FIREBASE REAL Y ÚNICA (¡ESTA ES LA QUE COPIASTE DE TU CONSOLA!)
// Asegúrate de que estos valores son los que obtuviste de tu proyecto "tareasnotas-96957"
const firebaseConfig = {
    apiKey: "AIzaSyCBcKsnbwOiioFGRviPnWr78fbuBm2S7z0",
    authDomain: "tareasnotas-96957.firebaseapp.com",
    projectId: "tareasnotas-96957",
    storageBucket: "tareasnotas-96957.firebasestorage.app",
    messagingSenderId: "793614445244",
    appId: "1:793614445244:web:32d8c6d83d4cc632b83eb9"
};

// Inicializa Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);

// Obtiene la instancia de Firebase Cloud Messaging en el Service Worker
const messaging = firebase.messaging();

// Configura el manejador de mensajes en segundo plano (cuando la app no está en primer plano)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje de fondo recibido:', payload);
    const notificationTitle = payload.notification.title || 'Recordatorio de Tarea';
    const notificationOptions = {
        body: payload.notification.body || '¡Es hora de tu nota!',
        icon: payload.notification.icon || './ICONOS/icon-192x192.png', // Asegúrate de que esta ruta sea correcta
        badge: payload.badge || './ICONOS/icon-192x192.png', // Un icono más pequeño para la barra de estado
        vibrate: [200, 100, 200], // Patrón de vibración
        data: payload.data // Datos adicionales que puedes enviar
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Importa tu Service Worker de caché personalizado
// Asegúrate de que la ruta sea correcta. Si lo renombraste a custom-service-worker.js y está en la misma carpeta:
importScripts('./custom-service-worker.js');