// script.js

// --- Firebase Configuration (con tus datos reales) ---
const firebaseConfig = {
    apiKey: "AIzaSyCBcKsnbwOiioFGRviPnWr78fbuBm2S7z0",
    authDomain: "tareasnotas-96957.firebaseapp.com",
    projectId: "tareasnotas-96957",
    storageBucket: "tareasnotas-96957.firebasestorage.app",
    messagingSenderId: "793614445244",
    appId: "1:793614445244:web:32d8c6d83d4cc632b83eb9"
    // Si tienes measurementId, añádelo aquí:
    // measurementId: "G-XXXXXXXXXX"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firebase Cloud Messaging
const messaging = firebase.messaging();

// --- Variables y Referencias del DOM ---
const fabAddNoteBtn = document.getElementById('fab-add-note'); // Botón FAB
const addNoteArea = document.querySelector('.add-note-area'); // Área de añadir nota
const newTaskInput = document.getElementById('new-task-input'); // Campo de texto de la nota
const tagInput = document.getElementById('tag-input'); // NUEVO: Campo de etiquetas
// --- NUEVAS REFERENCIAS PARA EL ICONO (DECLARADAS UNA SOLA VEZ AQUÍ) ---
const iconInput = document.getElementById('icon-input'); // Campo de texto para el icono
const iconPreview = document.getElementById('icon-preview'); // Preview del icono

const saveNoteBtn = document.getElementById('save-note-btn'); // Botón de guardar nota
const colorPalette = document.getElementById('color-palette'); // Paleta de colores
const taskList = document.getElementById('task-list'); // Lista de tareas (UL)
const searchInput = document.getElementById('search-input'); // Campo de búsqueda
const filterAllBtn = document.getElementById('filter-all'); // Botón de filtro "Todas"
const filterPendingBtn = document.getElementById('filter-pending'); // Botón de filtro "Pendientes"
const filterCompletedBtn = document.getElementById('filter-completed'); // Botón de filtro "Completadas"
const pendingTasksCountSpan = document.getElementById('pending-tasks-count'); // Contador de tareas pendientes
const clearCompletedBtn = document.getElementById('clear-completed-btn'); // Botón de limpiar completadas
const darkModeToggle = document.getElementById('dark-mode-toggle'); // Botón de modo oscuro

// Referencias para el modal de alarma
const alarmModal = document.getElementById('alarm-modal');
const alarmNoteText = document.getElementById('alarm-note-text');
const alarmDateInput = document.getElementById('alarm-date');
const alarmTimeInput = document.getElementById('alarm-time');
const setAlarmBtn = document.getElementById('set-alarm-btn');
const cancelAlarmBtn = document.getElementById('cancel-alarm-btn');
const removeAlarmBtn = document.getElementById('remove-alarm-btn');

let notes = []; // Array para almacenar las notas
let currentAlarmNoteId = null; // Para saber qué nota estamos editando para la alarma

// --- Manejo del Modo Oscuro ---
const enableDarkMode = () => {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Cambia a icono de sol
};

const disableDarkMode = () => {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
    darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Cambia a icono de luna
};

// Comprobar el estado del modo oscuro al cargar
if (localStorage.getItem('darkMode') === 'enabled') {
    enableDarkMode();
} else {
    disableDarkMode();
}

darkModeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('dark-mode')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
});

// --- Manejo del Service Worker y Notificaciones ---
if ('serviceWorker' in navigator) {
    // Registra el service worker personalizado
    navigator.serviceWorker.register('./custom-service-worker.js')
        .then(registration => {
            console.log('✅ Service Worker registrado con éxito:', registration);
            // Suscribirse a las notificaciones push
            return requestNotificationPermission();
        })
        .catch(error => {
            console.error('❌ Falló el registro del Service Worker:', error);
        });
}

function requestNotificationPermission() {
    console.log('🔔 Solicitando permiso de notificación...');
    return Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            console.log('✅ Permiso de notificación concedido.');
            // Si el permiso es concedido, suscríbete al FCM token
            return messaging.getToken({
                vapidKey: "BOyKqYp2c3Vf1bFvVl5tW0pX7t4pX7t4pX7t4pX7t4pX7t4pX7t4pX7t4pX7t4pX7t4pX7t4pX7t4" // Reemplaza con tu clave VAPID real
            }).then((token) => {
                console.log('FCM Token:', token);
                // Aquí podrías enviar este token a tu servidor para enviar notificaciones push
            }).catch((err) => {
                console.error('Error al obtener el token de FCM:', err);
            });
        } else if (permission === 'denied') {
            console.log('🔒 Permiso de notificación denegado.');
            // Informa al usuario que las notificaciones están bloqueadas y cómo habilitarlas.
            // Para la advertencia de Chrome: "Notifications permission has been blocked as the user has ignored..."
            // Esta es una advertencia del navegador, no un error de JavaScript,
            // pero el mensaje de consola 'Permiso de notificación denegado' es el resultado de tu código.
        }
    }).catch(error => {
        console.error('Error al solicitar permiso de notificación:', error);
    });
}

// Escucha mensajes en primer plano (cuando la app está abierta y activa)
messaging.onMessage((payload) => {
    console.log('[script.js] Mensaje en primer plano recibido:', payload);
    // Puedes mostrar una notificación o una alerta directamente en la UI
    new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon,
        badge: payload.notification.badge
    });
});

// --- Funciones para manejar notas ---
function saveNotesToLocalStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
    updatePendingTasksCount(); // Actualiza el contador cada vez que se guardan las notas
}

function loadNotesFromLocalStorage() {
    const storedNotes = localStorage.getItem('notes');
    if (storedNotes) {
        notes = JSON.parse(storedNotes);
    }
    renderNotes();
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function createTaskElement(note) {
    const listItem = document.createElement('li');
    listItem.classList.add('note-item', `color-${note.color}`);
    if (note.completed) {
        listItem.classList.add('completed');
    }
    if (note.pinned) {
        listItem.classList.add('pinned');
    }
    if (note.alarm) {
        listItem.classList.add('has-alarm');
    }
    listItem.dataset.id = note.id;

    // --- Contenido de la nota ---
    listItem.innerHTML = `
        <div class="note-header">
            <button class="action-icon pin-btn" aria-label="Anclar/Desanclar nota">
                <i class="${note.pinned ? 'fas fa-thumbtack' : 'fas fa-map-pin'}"></i>
            </button>
            <div class="note-actions">
                ${note.alarm ? `
                    <button class="action-icon alarm-btn" aria-label="Ver/Modificar alarma" data-id="${note.id}">
                        <i class="fas fa-bell"></i>
                    </button>
                ` : `
                    <button class="action-icon alarm-btn" aria-label="Configurar alarma" data-id="${note.id}">
                        <i class="far fa-bell"></i>
                    </button>
                `}
                <button class="action-icon edit-btn" aria-label="Editar nota" data-id="${note.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-icon delete-btn" aria-label="Eliminar nota" data-id="${note.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
        <div class="note-content">
            <input type="checkbox" ${note.completed ? 'checked' : ''} />
            ${note.icon ? `<i class="${note.icon.startsWith('fa-') ? 'fas ' + note.icon : 'fas fa-' + note.icon} note-icon"></i>` : ''}
            <p>${note.content}</p>
        </div>
        ${note.tags ? `<div class="note-tags">${note.tags.split(',').map(tag => `<span>#${tag.trim()}</span>`).join('')}</div>` : ''}
        ${note.alarm ? `<div class="note-alarm-info"><i class="fas fa-clock"></i> ${new Date(note.alarm).toLocaleString()}</div>` : ''}
    `;

    // --- Manejadores de eventos para los botones de la nota ---
    const checkbox = listItem.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
        note.completed = checkbox.checked;
        saveNotesToLocalStorage();
        renderNotes(); // Vuelve a renderizar para que el estilo de completado se aplique
    });

    const deleteBtn = listItem.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que el clic en el botón active otros eventos de la nota
        listItem.classList.add('removing'); // Añade clase para animación
        listItem.addEventListener('animationend', () => {
            notes = notes.filter(n => n.id !== note.id);
            saveNotesToLocalStorage();
            renderNotes();
        });
    });

    const pinBtn = listItem.querySelector('.pin-btn');
    pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        note.pinned = !note.pinned;
        saveNotesToLocalStorage();
        renderNotes(); // Para reordenar o actualizar el icono
    });

    const alarmBtn = listItem.querySelector('.alarm-btn');
    alarmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentAlarmNoteId = note.id; // Guarda el ID de la nota actual para la alarma
        showAlarmModal(note);
    });

    const editBtn = listItem.querySelector('.edit-btn');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editNote(note);
    });

    return listItem;
}

function renderNotes(filter = 'all', searchTerm = '') {
    taskList.innerHTML = ''; // Limpia la lista actual

    let filteredNotes = [...notes]; // Haz una copia para no modificar el array original

    // Aplicar filtro de búsqueda
    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredNotes = filteredNotes.filter(note =>
            note.content.toLowerCase().includes(lowerCaseSearchTerm) ||
            (note.tags && note.tags.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }

    // Ordenar notas: ancladas primero, luego por completado (pendientes primero)
    // Las notas ancladas se ordenan por su estado de completado, luego las no ancladas
    filteredNotes.sort((a, b) => {
        // Pinned notes come first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // Within pinned or unpinned, pending come before completed
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
        return 0; // Maintain original order if same pin/completed status
    });


    // Aplicar filtro de estado (Todas, Pendientes, Completadas)
    if (filter === 'pending') {
        filteredNotes = filteredNotes.filter(note => !note.completed);
    } else if (filter === 'completed') {
        filteredNotes = filteredNotes.filter(note => note.completed);
    }

    filteredNotes.forEach(note => {
        taskList.appendChild(createTaskElement(note));
    });

    updatePendingTasksCount();
}


function updatePendingTasksCount() {
    const pendingCount = notes.filter(note => !note.completed).length;
    pendingTasksCountSpan.textContent = pendingCount;
}

function clearAddNoteArea() {
    newTaskInput.value = '';
    tagInput.value = '';
    iconInput.value = ''; // Limpia el campo de icono
    iconPreview.className = 'fas fa-question-circle'; // Vuelve al icono por defecto
    // Asegura que el color por defecto esté seleccionado
    const currentActiveColor = colorPalette.querySelector('.color-box.active');
    if (currentActiveColor) {
        currentActiveColor.classList.remove('active');
    }
    colorPalette.querySelector('[data-color="default"]').classList.add('active');
    addNoteArea.classList.remove('expanded'); // Oculta opciones si está expandida
}

function editNote(noteToEdit) {
    // Expande el área de añadir nota
    addNoteArea.classList.add('expanded');

    // Rellena los campos con los datos de la nota
    newTaskInput.value = noteToEdit.content;
    tagInput.value = noteToEdit.tags || '';
    iconInput.value = noteToEdit.icon ? noteToEdit.icon.replace(/fas fa-|far fa-|fab fa-/g, '') : ''; // Limpia el prefijo para mostrar solo el nombre
    iconPreview.className = noteToEdit.icon || 'fas fa-question-circle'; // Muestra el icono o el de pregunta

    // Selecciona el color de la nota
    colorPalette.querySelectorAll('.color-box').forEach(box => {
        box.classList.remove('active');
        if (box.dataset.color === noteToEdit.color) {
            box.classList.add('active');
        }
    });

    // Cambia el botón de "Guardar Nota" a "Actualizar Nota"
    saveNoteBtn.textContent = 'Actualizar Nota';

    // Guarda el ID de la nota que se está editando
    saveNoteBtn.dataset.editingId = noteToEdit.id;

    // Scroll hasta el área de añadir nota
    addNoteArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// --- Manejo del modal de Alarma ---
function showAlarmModal(note) {
    alarmNoteText.textContent = `Alarma para: "${note.content}"`;
    alarmModal.style.display = 'flex'; // Mostrar el modal

    // Pre-rellenar si ya tiene una alarma
    if (note.alarm) {
        const alarmDateTime = new Date(note.alarm);
        alarmDateInput.value = alarmDateTime.toISOString().split('T')[0];
        alarmTimeInput.value = alarmDateTime.toTimeString().split(' ')[0].substring(0, 5);
    } else {
        // Limpiar campos si no hay alarma
        alarmDateInput.value = '';
        alarmTimeInput.value = '';
    }
}

function hideAlarmModal() {
    alarmModal.style.display = 'none'; // Ocultar el modal
    currentAlarmNoteId = null; // Limpiar el ID de la nota
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    loadNotesFromLocalStorage();

    fabAddNoteBtn.addEventListener('click', () => {
        addNoteArea.classList.toggle('expanded');
        newTaskInput.focus();
        clearAddNoteArea(); // Limpia y resetea cuando se abre
        saveNoteBtn.textContent = 'Guardar Nota'; // Restablece el texto del botón
        delete saveNoteBtn.dataset.editingId; // Elimina el ID de edición
    });

    newTaskInput.addEventListener('focus', () => {
        addNoteArea.classList.add('expanded');
    });

    colorPalette.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-box')) {
            // Remueve 'active' de todos y lo añade al clicado
            colorPalette.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    saveNoteBtn.addEventListener('click', () => {
        const content = newTaskInput.value.trim();
        const tags = tagInput.value.trim();
        const selectedColor = colorPalette.querySelector('.color-box.active').dataset.color;
        const icon = iconInput.value.trim(); // Obtener el valor del campo de icono

        if (content) {
            const editingId = saveNoteBtn.dataset.editingId;
            if (editingId) {
                // Actualizar nota existente
                const noteIndex = notes.findIndex(note => note.id === editingId);
                if (noteIndex > -1) {
                    notes[noteIndex].content = content;
                    notes[noteIndex].tags = tags;
                    notes[noteIndex].color = selectedColor;
                    notes[noteIndex].icon = icon; // Actualiza el icono
                }
            } else {
                // Crear nueva nota
                notes.unshift({ // Añadir al principio para que las nuevas aparezcan primero
                    id: generateId(),
                    content,
                    tags,
                    color: selectedColor,
                    icon, // Guardar el icono
                    completed: false,
                    pinned: false,
                    createdAt: new Date().toISOString(),
                    alarm: null
                });
            }
            saveNotesToLocalStorage();
            clearAddNoteArea();
            renderNotes(); // Vuelve a renderizar con las notas actualizadas
            saveNoteBtn.textContent = 'Guardar Nota'; // Restablece el texto del botón
            delete saveNoteBtn.dataset.editingId; // Elimina el ID de edición

        } else {
            alert('Por favor, escribe una nota antes de guardar.');
        }
    });

    searchInput.addEventListener('input', (e) => renderNotes(getCurrentFilter(), e.target.value));

    // Event listeners para los botones de filtro
    filterAllBtn.addEventListener('click', () => {
        setActiveFilter(filterAllBtn);
        renderNotes('all', searchInput.value);
    });

    filterPendingBtn.addEventListener('click', () => {
        setActiveFilter(filterPendingBtn);
        renderNotes('pending', searchInput.value);
    });

    filterCompletedBtn.addEventListener('click', () => {
        setActiveFilter(filterCompletedBtn);
        renderNotes('completed', searchInput.value);
    });

    function setActiveFilter(activeButton) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }

    function getCurrentFilter() {
        if (filterPendingBtn.classList.contains('active')) return 'pending';
        if (filterCompletedBtn.classList.contains('active')) return 'completed';
        return 'all';
    }


    clearCompletedBtn.addEventListener('click', () => {
        notes = notes.filter(note => !note.completed);
        saveNotesToLocalStorage();
        renderNotes();
    });

    // --- Eventos del modal de alarma ---
    cancelAlarmBtn.addEventListener('click', hideAlarmModal);

    setAlarmBtn.addEventListener('click', () => {
        const noteId = currentAlarmNoteId;
        const alarmDate = alarmDateInput.value;
        const alarmTime = alarmTimeInput.value;

        if (noteId && alarmDate && alarmTime) {
            const alarmDateTime = new Date(`${alarmDate}T${alarmTime}`);

            const now = new Date();
            if (alarmDateTime <= now) {
                alert('La fecha y hora de la alarma deben ser en el futuro.');
                return;
            }

            const noteIndex = notes.findIndex(note => note.id === noteId);
            if (noteIndex > -1) {
                notes[noteIndex].alarm = alarmDateTime.toISOString();
                saveNotesToLocalStorage();
                alert('Alarma establecida con éxito.');

                // Programar notificación local (solo cuando la app está abierta)
                setTimeout(() => {
                    // Asegúrate de que la nota no haya sido completada o eliminada
                    const updatedNote = notes.find(n => n.id === noteId);
                    if (updatedNote && !updatedNote.completed) {
                        new Notification('¡Recordatorio de Tarea!', {
                            body: updatedNote.content,
                            icon: './ICONOS/icon-192x192.png',
                            badge: './ICONOS/icon-192x192.png'
                        });
                    }
                }, alarmDateTime.getTime() - now.getTime());

                // Para notificaciones push reales (cuando la app está cerrada), necesitarías un servidor
                // que envíe el mensaje de Firebase Cloud Messaging al Service Worker en la fecha/hora programada.
            }
            hideAlarmModal();
        } else {
            alert('Por favor, selecciona una fecha y hora para la alarma.');
        }
    });

    removeAlarmBtn.addEventListener('click', () => {
        const noteId = currentAlarmNoteId;
        if (noteId) {
            const noteIndex = notes.findIndex(note => note.id === noteId);
            if (noteIndex > -1) {
                notes[noteIndex].alarm = null; // Elimina la alarma
                saveNotesToLocalStorage();
                alert('Alarma eliminada.');
            }
        }
        hideAlarmModal();
    });

    // --- NUEVO: Previsualización de icono en tiempo real ---
    // NO ES NECESARIO VOLVER A DECLARAR iconInput e iconPreview AQUÍ
    // YA ESTÁN DECLARADAS AL PRINCIPIO DEL ARCHIVO.

    if (iconInput && iconPreview) { // Usamos las variables ya declaradas
        iconInput.addEventListener('input', () => {
            const inputValue = iconInput.value.trim();
            if (inputValue) {
                iconPreview.className = ''; // Elimina todas las clases actuales
                // Añade la clase 'fas' por defecto y la clase ingresada por el usuario
                // Asume 'fas' si el usuario no especifica 'far', 'fab', etc.
                const iconClass = inputValue.startsWith('fa-') ? `fas ${inputValue}` : `fas fa-${inputValue}`;
                iconPreview.classList.add(...iconClass.split(' '));
            } else {
                // Si el campo está vacío, vuelve al icono de pregunta por defecto
                iconPreview.className = 'fas fa-question-circle';
            }
        });
    }
    // --- FIN NUEVO: Previsualización de icono ---

}); // Fin de DOMContentLoaded