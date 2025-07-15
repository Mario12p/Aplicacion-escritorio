// service-worker.js (¡Este es el NUEVO archivo en la carpeta APP/)

// Importa los scripts del SDK de Firebase (debe ser la misma versión que en index.html)
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

// PEGA AQUÍ DE NUEVO EL MISMO OBJETO firebaseConfig QUE COPIASTE
const firebaseConfig = {
    apiKey: "AIzaSyCBcKsnbwOiioFGRv1PnWr78fbuBm2S7z0", // <--- TU VALOR REAL
    authDomain: "tareasnotas-96957.firebaseapp.com", // <--- TU VALOR REAL
    projectId: "tareasnotas-96957", // <--- TU VALOR REAL
    storageBucket: "tareasnotas-96957.firebasestorage.app", // <--- TU VALOR REAL
    messagingSenderId: "793614445244", // <--- TU VALOR REAL
    appId: "1:793614445244:web:ae840ac5205cc326b83eb9" // <--- TU VALOR REAL
};

// Inicializa Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);

// Obtiene la instancia de Firebase Cloud Messaging en el Service Worker
const messaging = firebase.messaging();

// Configura el manejador de mensajes en segundo plano (cuando la app no está en primer plano)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje de fondo recibido:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
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

// IMPORTANTE:
// También asegúrate de que las rutas de los iconos en custom-service-worker.js sean correctas:
// Cambia './icons/icon-192x192.png' a './ICONOS/icon-192x192.png' dentro de custom-service-worker.js
// Si aún no lo has hecho.