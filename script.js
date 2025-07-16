// script.js

// firebaseConfig y la inicialización de Firebase y messaging al principio
// ¡IMPORTANTE! Descomenta este bloque y reemplaza los valores con los de tu proyecto Firebase.
/*
const firebaseConfig = {
  apiKey: "TU_API_KEY", // Reemplaza con tu clave API
  authDomain: "TU_AUTH_DOMAIN", // Reemplaza con tu dominio de autenticación
  projectId: "TU_PROJECT_ID", // Reemplaza con el ID de tu proyecto
  storageBucket: "TU_STORAGE_BUCKET", // Reemplaza con tu bucket de almacenamiento
  messagingSenderId: "TU_MESSAGING_SENDER_ID", // Reemplaza con tu ID de remitente de mensajería
  appId: "TU_APP_ID" // Reemplaza con tu ID de aplicación
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
*/


document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn'); // Este es ahora el botón "Cerrar"
    const saveNoteBtn = document.getElementById('save-note-btn'); // NUEVO: Botón "Añadir Nota"
    const taskList = document.getElementById('task-list');

    const filterAllBtn = document.getElementById('filter-all');
    const filterPendingBtn = document.getElementById('filter-pending');
    const filterCompletedBtn = document.getElementById('filter-completed');

    const pendingTasksCountSpan = document.getElementById('pending-tasks-count');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');

    const addNoteArea = document.querySelector('.add-note-area');
    const colorPalette = document.getElementById('color-palette');
    let selectedNoteColor = 'default';

    const searchInput = document.getElementById('search-input');

    const errorMessageDiv = document.createElement('div');
    errorMessageDiv.classList.add('error-message');
    errorMessageDiv.textContent = '¡Por favor, escribe una nota!';
    addNoteArea.appendChild(errorMessageDiv);

    let currentFilter = 'all';

    // --- Variables y referencias del Modal de Alarma (NUEVO) ---
    const alarmModal = document.getElementById('alarm-modal');
    const alarmNoteText = document.getElementById('alarm-note-text');
    const alarmDateInput = document.getElementById('alarm-date');
    const alarmTimeInput = document.getElementById('alarm-time');
    const setAlarmBtn = document.getElementById('set-alarm-btn');
    const cancelAlarmBtn = document.getElementById('cancel-alarm-btn');
    const removeAlarmBtn = document.getElementById('remove-alarm-btn');
    let currentNoteForAlarm = null; // Para guardar la nota a la que le estamos configurando la alarma

    // --- Funciones para manejar LocalStorage ---
    function saveTasksToLocalStorage() {
        const tasks = [];
        taskList.querySelectorAll('li').forEach(listItem => {
            tasks.push({
                text: listItem.querySelector('.task-content').textContent,
                completed: listItem.classList.contains('completed'),
                color: listItem.dataset.color || 'default',
                pinned: listItem.classList.contains('pinned'),
                alarmTime: listItem.dataset.alarmTime || null // Guardar la hora de la alarma
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updatePendingTasksCount(); // Asegúrate de actualizar el contador después de guardar
    }

    function loadTasksFromLocalStorage() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        
        // Ordenar: primero pinned, luego las no pinned
        tasks.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });

        taskList.innerHTML = '';
        tasks.forEach(task => {
            createTaskElement(task.text, task.completed, task.color, task.pinned, task.alarmTime);
        });
        applyFilter(currentFilter);
        updatePendingTasksCount();
    }

    // --- Funciones de la interfaz ---
    function createTaskElement(taskText, isCompleted = false, color = 'default', isPinned = false, alarmTime = null) {
        const listItem = document.createElement('li');
        listItem.classList.add('note-card', `color-${color}`);
        if (isCompleted) {
            listItem.classList.add('completed');
        }
        if (isPinned) {
            listItem.classList.add('pinned');
        }
        listItem.dataset.color = color; // Guardar el color como data-attribute

        if (alarmTime) { // NUEVO: Añadir clase 'has-alarm' si hay alarma programada
            listItem.classList.add('has-alarm');
            listItem.dataset.alarmTime = alarmTime; // Guardar la hora de la alarma en el dataset
        }

        const taskContent = document.createElement('span');
        taskContent.classList.add('task-content');
        taskContent.textContent = taskText;
        taskContent.contentEditable = true; // Permite editar el texto
        taskContent.spellcheck = false; // Desactivar corrector ortográfico para evitar interrupciones

        // Guardar cambios al salir del foco (blur) o al presionar Enter
        taskContent.addEventListener('blur', () => {
            // Eliminar la tarea si está vacía
            if (taskContent.textContent.trim() === '') {
                listItem.remove();
            }
            saveTasksToLocalStorage();
            applyFilter(currentFilter); // Reaplicar filtro para asegurar la visibilidad
        });
        taskContent.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Evitar salto de línea
                taskContent.blur(); // Perder el foco para guardar
            }
        });

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('note-actions');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isCompleted;
        checkbox.addEventListener('change', () => {
            listItem.classList.toggle('completed');
            saveTasksToLocalStorage();
            applyFilter(currentFilter); // Reaplicar filtro después de cambiar estado
            updatePendingTasksCount();
        });

        const pinBtn = document.createElement('button');
        pinBtn.classList.add('action-icon', 'pin-btn');
        pinBtn.innerHTML = `<i class="${isPinned ? 'fa-solid' : 'fa-regular'} fa-thumbtack"></i>`;
        pinBtn.title = isPinned ? 'Desanclar nota' : 'Anclar nota';
        pinBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Evita que se propague el clic a la tarjeta
            listItem.classList.toggle('pinned');
            isPinned = listItem.classList.contains('pinned'); // Actualiza el estado
            pinBtn.innerHTML = `<i class="${isPinned ? 'fa-solid' : 'fa-regular'} fa-thumbtack"></i>`;
            pinBtn.title = isPinned ? 'Desanclar nota' : 'Anclar nota';
            saveTasksToLocalStorage();
            loadTasksFromLocalStorage(); // Recargar para reordenar
        });

        const alarmBtn = document.createElement('button');
        alarmBtn.classList.add('action-icon', 'alarm-btn');
        alarmBtn.innerHTML = `<i class="fa-regular fa-bell"></i>`; // Icono de campana regular
        alarmBtn.title = 'Establecer alarma';

        // Lógica para abrir el modal de alarma (NUEVO)
        alarmBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            currentNoteForAlarm = listItem; // Guarda la referencia a la nota actual

            alarmNoteText.textContent = `Configurar alarma para: "${taskContent.textContent}"`; // Muestra el texto de la nota

            // Cargar fecha y hora si ya existe una alarma para esta nota
            if (listItem.dataset.alarmTime) {
                const existingAlarm = new Date(listItem.dataset.alarmTime);
                // Ajustar a la zona horaria local para mostrar correctamente
                const localDate = new Date(existingAlarm.getTime() - (existingAlarm.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                const localTime = new Date(existingAlarm.getTime() - (existingAlarm.getTimezoneOffset() * 60000)).toTimeString().split(' ')[0].substring(0, 5);

                alarmDateInput.value = localDate;
                alarmTimeInput.value = localTime;
                removeAlarmBtn.style.display = 'inline-block'; // Mostrar botón de eliminar si hay alarma
            } else {
                alarmDateInput.value = '';
                alarmTimeInput.value = '';
                removeAlarmBtn.style.display = 'none'; // Ocultar botón si no hay alarma
            }

            alarmModal.style.display = 'flex'; // Mostrar el modal
        });


        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('action-icon', 'delete-btn');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Eliminar nota';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Evita que se propague el clic
            listItem.remove();
            saveTasksToLocalStorage();
            applyFilter(currentFilter); // Reaplicar filtro para actualizar la vista
            updatePendingTasksCount();
        });

        actionsDiv.appendChild(checkbox);
        actionsDiv.appendChild(pinBtn);
        actionsDiv.appendChild(alarmBtn); // Añadir el botón de alarma
        actionsDiv.appendChild(deleteBtn);

        listItem.appendChild(taskContent);
        listItem.appendChild(actionsDiv);

        taskList.appendChild(listItem);
        return listItem;
    }

    function addNote() {
        const taskText = newTaskInput.value.trim();
        if (taskText === '') {
            errorMessageDiv.classList.add('show');
            return;
        }
        errorMessageDiv.classList.remove('show');

        createTaskElement(taskText, false, selectedNoteColor);
        newTaskInput.value = '';
        selectedNoteColor = 'default'; // Restablecer color
        updateColorPaletteSelection('default'); // Actualizar UI de paleta
        saveTasksToLocalStorage();
        applyFilter(currentFilter); // Reaplicar filtro para asegurar que la nueva nota es visible
        updatePendingTasksCount();
        collapseAddNoteArea(); // Colapsar el área después de añadir la nota
    }

    function updatePendingTasksCount() {
        const pendingTasks = taskList.querySelectorAll('li:not(.completed)').length;
        pendingTasksCountSpan.textContent = pendingTasks;
        // Ocultar/Mostrar el botón "Limpiar completadas"
        const completedTasksCount = taskList.querySelectorAll('li.completed').length;
        if (completedTasksCount > 0) {
            clearCompletedBtn.style.display = 'inline-block';
        } else {
            clearCompletedBtn.style.display = 'none';
        }
    }

    function clearCompletedTasks() {
        if (confirm('¿Estás seguro de que quieres eliminar todas las tareas completadas?')) {
            taskList.querySelectorAll('li.completed').forEach(listItem => {
                listItem.remove();
            });
            saveTasksToLocalStorage();
            applyFilter(currentFilter); // Reaplicar filtro por si acaso
            updatePendingTasksCount();
        }
    }

    function applyFilter(filterType) {
        currentFilter = filterType;
        const tasks = taskList.querySelectorAll('li');
        const searchTerm = searchInput.value.toLowerCase(); // Obtener el término de búsqueda

        tasks.forEach(task => {
            const isCompleted = task.classList.contains('completed');
            const taskText = task.querySelector('.task-content').textContent.toLowerCase();
            const matchesSearch = taskText.includes(searchTerm);

            let shouldDisplay = false;
            if (filterType === 'all') {
                shouldDisplay = true;
            } else if (filterType === 'pending') {
                shouldDisplay = !isCompleted;
            } else if (filterType === 'completed') {
                shouldDisplay = isCompleted;
            }

            // Combinar con la búsqueda
            if (!matchesSearch) {
                shouldDisplay = false;
            }

            task.style.display = shouldDisplay ? 'block' : 'none';
        });

        // Actualizar la clase activa de los botones de filtro
        filterAllBtn.classList.remove('active');
        filterPendingBtn.classList.remove('active');
        filterCompletedBtn.classList.remove('active');

        if (filterType === 'all') {
            filterAllBtn.classList.add('active');
        } else if (filterType === 'pending') {
            filterPendingBtn.classList.add('active');
        } else if (filterType === 'completed') {
            filterCompletedBtn.classList.add('active');
        }
    }

    function expandAddNoteArea() {
        addNoteArea.classList.add('expanded');
        // Enfocar el textarea después de expandir
        newTaskInput.focus();
    }

    function collapseAddNoteArea() {
        if (newTaskInput.value.trim() === '') { // Solo colapsa si no hay texto
            addNoteArea.classList.remove('expanded');
            selectedNoteColor = 'default';
            updateColorPaletteSelection('default');
            newTaskInput.value = '';
            errorMessageDiv.classList.remove('show');
        } else {
            // Si hay texto, no colapsamos con este botón directamente,
            // sino que esperamos a que el usuario presione "Añadir Nota" o clic fuera.
            // Esto solo se aplica si se presiona el botón "Cerrar" y hay texto.
            // Para evitar confusión, si hay texto, el botón "Cerrar" ahora simplemente colapsa.
            // El guardado se hará con el botón "Añadir Nota" o blur.
            addNoteArea.classList.remove('expanded');
            selectedNoteColor = 'default';
            updateColorPaletteSelection('default');
            errorMessageDiv.classList.remove('show');
            // NO llamar a addNote() aquí para el botón "Cerrar"
        }
    }

    function updateColorPaletteSelection(color) {
        document.querySelectorAll('.color-box').forEach(box => {
            box.classList.remove('active');
        });
        document.querySelector(`.color-box[data-color="${color}"]`).classList.add('active');
        // También actualiza el color de fondo del textarea cuando está expandido
        if (addNoteArea.classList.contains('expanded')) {
            const rootStyles = getComputedStyle(document.documentElement);
            const bgColor = rootStyles.getPropertyValue(`--note-${color}`);
            newTaskInput.style.backgroundColor = bgColor;
        } else {
            newTaskInput.style.backgroundColor = ''; // Restablecer cuando no está expandido
        }
    }


    // --- Event Listeners ---
    addNoteArea.addEventListener('click', expandAddNoteArea);
    newTaskInput.addEventListener('focus', expandAddNoteArea);

    addTaskBtn.addEventListener('click', collapseAddNoteArea); // Botón "Cerrar" ahora solo colapsa
    saveNoteBtn.addEventListener('click', addNote); // NUEVO: El botón "Añadir Nota" llama a addNote

    // Cierra el área si se hace clic fuera de ella (y está expandida)
    document.addEventListener('click', (event) => {
        if (!addNoteArea.contains(event.target) && addNoteArea.classList.contains('expanded')) {
            collapseAddNoteArea();
        }
    });

    colorPalette.addEventListener('click', (event) => {
        const colorBox = event.target.closest('.color-box');
        if (colorBox) {
            selectedNoteColor = colorBox.dataset.color;
            updateColorPaletteSelection(selectedNoteColor);
        }
    });

    filterAllBtn.addEventListener('click', () => applyFilter('all'));
    filterPendingBtn.addEventListener('click', () => applyFilter('pending'));
    filterCompletedBtn.addEventListener('click', () => applyFilter('completed'));
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    searchInput.addEventListener('input', (event) => {
        applyFilter(currentFilter);
    });

    // --- Funciones y Event Listeners del Modal de Alarma (NUEVO) ---
    function closeAlarmModal() {
        alarmModal.style.display = 'none';
        currentNoteForAlarm = null; // Limpiar la referencia
        alarmDateInput.value = '';
        alarmTimeInput.value = '';
        errorMessageDiv.classList.remove('show'); // Ocultar cualquier error
    }

    cancelAlarmBtn.addEventListener('click', closeAlarmModal);

    // Cerrar el modal al hacer clic fuera de él
    alarmModal.addEventListener('click', (event) => {
        if (event.target === alarmModal) {
            closeAlarmModal();
        }
    });

    setAlarmBtn.addEventListener('click', () => {
        const alarmDate = alarmDateInput.value;
        const alarmTime = alarmTimeInput.value;

        if (!alarmDate || !alarmTime) {
            errorMessageDiv.textContent = 'Por favor, selecciona una fecha y hora para la alarma.';
            errorMessageDiv.classList.add('show');
            return;
        }

        // Se crea un objeto Date con la fecha y hora seleccionadas
        // Es importante considerar la zona horaria para evitar desfases.
        // Aquí se asume que los inputs de fecha/hora son en la hora local del usuario.
        const alarmDateTime = new Date(`${alarmDate}T${alarmTime}:00`); // Añadir segundos para formato válido si no está
        
        // Ajustar a la zona horaria local al crear el objeto Date si es necesario
        // const [year, month, day] = alarmDate.split('-');
        // const [hours, minutes] = alarmTime.split(':');
        // const alarmDateTime = new Date(year, month - 1, day, hours, minutes, 0);


        if (isNaN(alarmDateTime.getTime())) { // Validar fecha y hora
            errorMessageDiv.textContent = 'Fecha u hora no válida.';
            errorMessageDiv.classList.add('show');
            return;
        }

        const now = new Date();
        // Asegurarse de que no sea una fecha pasada si no es una tarea completada
        // Permitimos alarmas en el pasado si la tarea ya está completada (quizás para registro)
        if (alarmDateTime < now && !currentNoteForAlarm.classList.contains('completed')) {
            errorMessageDiv.textContent = 'No puedes establecer una alarma en el pasado.';
            errorMessageDiv.classList.add('show');
            return;
        }

        if (currentNoteForAlarm) {
            currentNoteForAlarm.dataset.alarmTime = alarmDateTime.toISOString(); // Guardar como ISO string para consistencia
            currentNoteForAlarm.classList.add('has-alarm'); // Añadir clase visual
            saveTasksToLocalStorage(); // Guardar cambios en LocalStorage
            applyFilter(currentFilter); // Reaplicar filtros para actualizar la vista
            closeAlarmModal(); // Cerrar el modal

            // *** Lógica para programar la notificación local (usando setTimeout) ***
            const timeUntilAlarm = alarmDateTime.getTime() - now.getTime();

            if (timeUntilAlarm > 0) { // Solo si la alarma es en el futuro
                console.log(`Programando alarma en ${timeUntilAlarm / 1000} segundos.`);
                setTimeout(() => {
                    // Verificar si el permiso sigue concedido antes de mostrar la notificación
                    if (Notification.permission === 'granted') {
                        new Notification(`Alarma: ${currentNoteForAlarm.querySelector('.task-content').textContent}`, {
                            body: '¡Es hora de tu nota!',
                            icon: './ICONOS/icon-192x192.png', // Asegúrate de que esta ruta sea correcta
                            vibrate: [200, 100, 200] // Pequeña vibración (opcional)
                        });
                        // Opcional: Podrías hacer que la nota se marque como "completada" o cambie de estilo al dispararse la alarma
                        // if (currentNoteForAlarm && !currentNoteForAlarm.classList.contains('completed')) {
                        //     currentNoteForAlarm.classList.add('completed');
                        //     saveTasksToLocalStorage();
                        //     applyFilter(currentFilter);
                        // }
                    } else {
                        console.warn('Permiso de notificación no concedido, no se pudo mostrar la alarma.');
                    }
                }, timeUntilAlarm);
            } else {
                console.log('Alarma establecida para el pasado o ahora mismo. Notificación inmediata si es pertinente.');
                // Si la alarma es para el pasado o justo ahora, se podría mostrar una notificación inmediata
                if (Notification.permission === 'granted') {
                     new Notification(`Alarma: ${currentNoteForAlarm.querySelector('.task-content').textContent}`, {
                        body: '¡Tu alarma ya está aquí!',
                        icon: './ICONOS/icon-192x192.png',
                        vibrate: [200, 100, 200]
                    });
                }
            }
        }
    });

    removeAlarmBtn.addEventListener('click', () => {
        if (currentNoteForAlarm) {
            delete currentNoteForAlarm.dataset.alarmTime; // Eliminar el dato
            currentNoteForAlarm.classList.remove('has-alarm'); // Quitar la clase visual
            saveTasksToLocalStorage(); // Guardar cambios
            applyFilter(currentFilter); // Reaplicar filtros
            closeAlarmModal(); // Cerrar el modal

            // Opcional: Lógica para cancelar una notificación pendiente si se usara una API que lo permita
            // (setTimeout no tiene una API para cancelar notificaciones ya "disparadas" al sistema)
        }
    });


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
                // Asegúrate de que 'messaging' está inicializado y accesible aquí (descomentando el bloque Firebase de arriba).
                if (typeof messaging !== 'undefined') { // Solo intenta esto si Firebase Messaging está inicializado
                    // ¡Ojo! Este 'TU_VAPID_KEY_AQUI' debe ser la clave pública de tu proyecto Firebase para Web Push.
                    // La encuentras en tu consola de Firebase > Configuración del Proyecto > Cloud Messaging > Claves web push
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
                    console.warn('Firebase Messaging no está inicializado. No se puede obtener el token FCM.');
                }
            } else {
                console.warn('Permiso de notificación denegado.');
            }
        });
    }

    // Nueva función para manejar mensajes en primer plano (cuando la app está abierta y activa)
    // Asegúrate de que 'messaging' está inicializado y accesible aquí (descomentando el bloque Firebase de arriba).
    if (typeof messaging !== 'undefined') { // Solo intenta esto si Firebase Messaging está inicializado
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
    }


    // --- Cargar tareas al iniciar la aplicación ---
    loadTasksFromLocalStorage();
    updateColorPaletteSelection('default');
    updatePendingTasksCount(); // Usar la función correcta que ya tienes
    applyFilter(currentFilter);
});
