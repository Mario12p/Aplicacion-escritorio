// script.js
// ... (código existente, incluyendo firebaseConfig y la inicialización de Firebase y messaging al principio) ...

document.addEventListener('DOMContentLoaded', () => {
    // ... (Tu código existente del DOMContentLoaded) ...

    // --- Configuración del Service Worker (y ahora Firebase Messaging) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Registra tu Service Worker principal (el nuevo service-worker.js)
            // Dada tu estructura de carpetas (APP/ contiene index.html, script.js y service-worker.js)
            // la ruta relativa '/service-worker.js' debería ser correcta si APP/ es la raíz de tu despliegue.
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => {
                    console.log('Service Worker registrado con éxito:', reg);
                    // Una vez que el Service Worker está registrado, podemos pedir permiso para notificaciones
                    requestNotificationPermission();
                })
                .catch(err => console.error('Error al registrar el Service Worker:', err));
        });
    }

    // Nueva función para solicitar permiso de notificación y obtener el token
    function requestNotificationPermission() {
        console.log('Solicitando permiso para notificaciones...');
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Permiso de notificación concedido.');
                // Obtener el token de registro para este navegador
                // ¡IMPORTANTE! Reemplaza 'TU_VAPID_KEY_AQUI' con la clave VAPID pública de tu proyecto Firebase
                messaging.getToken({ vapidKey: 'TU_VAPID_KEY_AQUI' }).then((currentToken) => {
                    if (currentToken) {
                        console.log('Token de registro FCM:', currentToken);
                        // ESTE ES EL TOKEN QUE NECESITAS.
                        // En una aplicación real, enviarías este `currentToken` a tu propio servidor
                        // (o a una Firebase Cloud Function) para almacenarlo en una base de datos.
                        // Este token es lo que usarás para enviar notificaciones push a este navegador específico.
                        // Por ahora, solo lo mostramos en consola para verificar que funciona.
                    } else {
                        console.warn('No se obtuvo el token de registro de FCM. ¿Tienes permiso?');
                    }
                }).catch((err) => {
                    console.error('Error al recuperar el token de registro:', err);
                });
            } else {
                console.warn('Permiso de notificación denegado.');
            }
        });
    }

    // Nueva función para manejar mensajes en primer plano (cuando la app está abierta y activa)
    messaging.onMessage((payload) => {
        console.log('[script.js] Mensaje en primer plano recibido:', payload);
        // Aquí puedes mostrar una notificación diferente o actualizar la UI directamente
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: payload.notification.icon || './ICONOS/icon-192x192.png' // Asegúrate de que esta ruta sea correcta
        };
        new Notification(notificationTitle, notificationOptions); // Muestra la notificación en el navegador
    });

    // --- Cargar tareas al iniciar la aplicación ---
    loadTasksFromLocalStorage();
    updateColorPaletteSelection('default');
    updateTaskCount();
    applyFilter(currentFilter);
});