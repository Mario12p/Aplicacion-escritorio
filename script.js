// script.js

// --- Firebase Configuration (asegúrate de reemplazar con tus datos reales) ---
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID",
    measurementId: "TU_MEASUREMENT_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firebase Cloud Messaging
const messaging = firebase.messaging();

// Esperar a que el DOM cargue
document.addEventListener('DOMContentLoaded', () => {

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => {
                    console.log('✅ Service Worker registrado con éxito:', reg);
                    requestNotificationPermission();
                })
                .catch(err => console.error('❌ Error al registrar el Service Worker:', err));
        });
    }

    // Solicitar permiso de notificación y obtener token FCM
    function requestNotificationPermission() {
        console.log('🔔 Solicitando permiso de notificación...');
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('🔓 Permiso concedido.');
                messaging.getToken({ vapidKey: 'TU_VAPID_KEY_AQUI' })
                    .then((currentToken) => {
                        if (currentToken) {
                            console.log('📲 Token FCM obtenido:', currentToken);
                            // Aquí puedes enviarlo a tu base de datos si quieres usarlo
                        } else {
                            console.warn('⚠️ No se obtuvo token FCM.');
                        }
                    })
                    .catch((err) => {
                        console.error('❌ Error al obtener token FCM:', err);
                    });
            } else {
                console.warn('🔒 Permiso de notificación denegado.');
            }
        });
    }

    // Recibir mensajes cuando la app está en primer plano
    messaging.onMessage((payload) => {
        console.log('📩 Mensaje recibido en primer plano:', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: payload.notification.icon || './ICONOS/icon-192x192.png'
        };
        new Notification(notificationTitle, notificationOptions);
    });

    // Inicializar la app
    loadTasksFromLocalStorage();
    updateColorPaletteSelection('default');
    updateTaskCount();
    applyFilter(currentFilter);
});
