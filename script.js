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
// --- NUEVAS REFERENCIAS PARA EL ICONO ---
const iconInput = document.getElementById('icon-input'); // Campo de texto para el icono
const iconPreview = document.getElementById('icon-preview'); // Icono de previsualización
// --- FIN NUEVAS REFERENCIAS ---
const saveNoteBtn = document.getElementById('save-note-btn'); // Botón de guardar nota
const colorPalette = document.getElementById('color-palette'); // Paleta de colores
const taskList = document.getElementById('task-list'); // Lista donde se muestran las notas
const pendingTasksCountSpan = document.getElementById('pending-tasks-count');
const filterAllBtn = document.getElementById('filter-all');
const filterPendingBtn = document.getElementById('filter-pending');
const filterCompletedBtn = document.getElementById('filter-completed');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const alarmModal = document.getElementById('alarm-modal');
const setAlarmBtn = document.getElementById('set-alarm-btn');
const cancelAlarmBtn = document.getElementById('cancel-alarm-btn');
const removeAlarmBtn = document.getElementById('remove-alarm-btn');

let currentFilter = 'all'; // Estado inicial del filtro
let selectedNoteColor = 'default'; // Color por defecto de la nota
let notes = []; // Array que almacenará todas nuestras notas
let currentAlarmNoteId = null; // Para manejar el ID de la nota al configurar alarmas

// --- Funciones para la Lógica de la Aplicación ---

// Guarda el array de notas en localStorage
function saveNotesToLocalStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
    console.log("Notas guardadas en localStorage.");
}

// Crea un elemento HTML para una nota y lo añade a la lista
function createTaskElement(note) {
    const li = document.createElement('li');
    li.dataset.id = note.id; // Almacena el ID para referencia futura
    li.classList.add('note-item');
    if (note.completed) {
        li.classList.add('completed');
    }
    if (note.pinned) {
        li.classList.add('pinned');
    }
    // Añade la clase 'has-alarm' si la nota tiene una alarma configurada
    if (note.alarm) {
        li.classList.add('has-alarm');
    }
    li.style.backgroundColor = `var(--note-${note.color})`; // Aplica el color

    // --- LÓGICA PARA AÑADIR EL ICONO PERSONALIZADO Y EL CONTENIDO ---
    let iconHtml = '';
    if (note.icon) {
        // Asegúrate de que la clase "fas" o "far", "fab" (estilo de Font Awesome) esté presente
        // Esto asume que el usuario introducirá solo el nombre del icono, como "fa-home"
        // Si no se introduce "fas", por defecto usamos "fas" (solid)
        const iconClass = note.icon.startsWith('fa-') ? `fas ${note.icon}` : `fas fa-${note.icon}`;
        iconHtml = `<i class="${iconClass} note-user-icon" style="margin-right: 10px;"></i>`; 
    }
    // ***************************************************************

    li.innerHTML = `
        <div class="note-header">
            <button class="pin-btn action-icon" aria-label="Anclar nota">
                <i class="fas fa-thumbtack"></i>
            </button>
            <div class="note-actions">
                <button class="alarm-btn action-icon" aria-label="Configurar alarma">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="edit-btn action-icon" aria-label="Editar nota">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn action-icon" aria-label="Eliminar nota">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <p class="note-content">${iconHtml}${note.content}</p> <div class="note-tags">
            ${note.tags && note.tags.length > 0 ? note.tags.map(tag => `<span class="note-tag">${tag}</span>`).join('') : ''}
        </div>
        <div class="note-footer">
            <input type="checkbox" class="complete-checkbox" ${note.completed ? 'checked' : ''} aria-label="Marcar como completada">
            <span>${new Date(note.id).toLocaleDateString()}</span>
        </div>
    `;

    // Añadir manejadores de eventos a los botones dentro de la nota
    li.querySelector('.complete-checkbox').addEventListener('change', (e) => toggleComplete(note.id, e.target.checked));
    li.querySelector('.delete-btn').addEventListener('click', () => deleteNote(note.id));
    li.querySelector('.pin-btn').addEventListener('click', () => togglePin(note.id));
    li.querySelector('.alarm-btn').addEventListener('click', () => showAlarmModal(note.id, note.content));
    li.querySelector('.edit-btn').addEventListener('click', () => editNote(note.id));

    // Lógica de inserción para mantener el orden (ancladas, no completadas, completadas)
    let added = false;
    // Insertar ancladas al principio
    if (note.pinned) {
        // Encontrar la primera nota NO anclada y NO completada para insertar antes de ella
        const firstUnpinnedUncompleted = Array.from(taskList.children).find(item => {
            const existingNote = notes.find(n => n.id == item.dataset.id);
            return existingNote && !existingNote.pinned && !existingNote.completed;
        });
        if (firstUnpinnedUncompleted) {
            taskList.insertBefore(li, firstUnpinnedUncompleted);
        } else {
            // Si no hay notas no ancladas y no completadas, intenta insertar antes de la primera completada
            const firstCompleted = Array.from(taskList.children).find(item => {
                const existingNote = notes.find(n => n.id == item.dataset.id);
                return existingNote && existingNote.completed;
            });
            if (firstCompleted) {
                taskList.insertBefore(li, firstCompleted);
            } else {
                taskList.prepend(li); // Si no hay completadas, simplemente al principio
            }
        }
        added = true;
    } else if (!note.completed) {
        // Insertar notas no ancladas y no completadas después de las ancladas y antes de las completadas
        const firstCompleted = Array.from(taskList.children).find(item => {
            const existingNote = notes.find(n => n.id == item.dataset.id);
            return existingNote && existingNote.completed;
        });
        if (firstCompleted) {
            taskList.insertBefore(li, firstCompleted);
        } else {
            taskList.append(li); // Si no hay completadas, al final
        }
        added = true;
    }

    if (!added) {
        taskList.append(li); // Si no cumple ninguna de las condiciones anteriores (ej. si es completada)
    }
}


// Alterna el estado de completado de una nota
function toggleComplete(id, isCompleted) {
    const noteIndex = notes.findIndex(note => note.id === id);
    if (noteIndex > -1) {
        notes[noteIndex].completed = isCompleted;
        saveNotesToLocalStorage();
        renderTasks(); // Volver a renderizar para aplicar filtros y orden
    }
}

// Elimina una nota
function deleteNote(id) {
    if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
        notes = notes.filter(note => note.id !== id);
        saveNotesToLocalStorage();
        renderTasks(); // Volver a renderizar
    }
}

// Ancla/desancla una nota
function togglePin(id) {
    const noteIndex = notes.findIndex(note => note.id === id);
    if (noteIndex > -1) {
        notes[noteIndex].pinned = !notes[noteIndex].pinned;
        saveNotesToLocalStorage();
        renderTasks(); // Volver a renderizar para reordenar
    }
}

// --- Función para Editar una Nota ---
function editNote(id) {
    const noteIndex = notes.findIndex(note => note.id === id);
    if (noteIndex === -1) return; // Si la nota no se encuentra, salimos

    const noteElement = document.querySelector(`li[data-id="${id}"]`);
    if (!noteElement) return; // Si el elemento HTML no se encuentra, salimos

    // CORRECCIÓN: Seleccionamos el párrafo con el contenido (donde insertamos el icono)
    const noteContentP = noteElement.querySelector('.note-content');

    // Crea un textarea para la edición
    const textarea = document.createElement('textarea');
    textarea.classList.add('edit-note-textarea');
    // Para la edición, solo queremos el texto, no el HTML del icono
    textarea.value = notes[noteIndex].content; // Carga el contenido de la nota (texto plano)
    textarea.rows = 3; // Establece un número de filas por defecto, puedes ajustarlo con CSS

    // Reemplaza el párrafo con el textarea
    noteContentP.replaceWith(textarea);
    textarea.focus(); // Enfoca el textarea para que el usuario pueda empezar a escribir de inmediato

    // Función para guardar los cambios
    const saveChanges = () => {
        const newContent = textarea.value.trim();
        if (newContent) {
            notes[noteIndex].content = newContent; // Actualiza el contenido en el array
            saveNotesToLocalStorage(); // Guarda los cambios en localStorage
            renderTasks(); // Vuelve a renderizar todas las notas para mostrar el cambio y el estado original (P)
        } else {
            // Si el usuario borra todo el contenido, le pedimos que escriba algo o eliminamos la nota
            if (confirm('La nota está vacía. ¿Quieres eliminarla?')) {
                deleteNote(id); // Usa tu función existente para eliminar la nota
            } else {
                // Si no quiere eliminarla, restauramos el contenido original
                textarea.value = notes[noteIndex].content;
                renderTasks();
            }
        }
    };

    // Escucha cuando el textarea pierde el foco (blur) o cuando se presiona Enter
    textarea.addEventListener('blur', saveChanges); // Guarda cuando el textarea pierde el foco
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Guarda si se presiona Enter, pero no Shift+Enter
            e.preventDefault(); // Evita un salto de línea adicional en el textarea
            saveChanges();
        }
    });
}


// Renderiza todas las notas en el DOM, aplicando el filtro y orden
function renderTasks() {
    taskList.innerHTML = ''; // Limpiar la lista actual
    const filteredAndSortedNotes = notes
        .filter(note => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'pending') return !note.completed;
            if (currentFilter === 'completed') return note.completed;
            return true;
        })
        .sort((a, b) => {
            // Prioriza las notas ancladas
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            // Luego, prioriza las notas no completadas sobre las completadas (dentro de ancladas o no ancladas)
            if (!a.completed && b.completed) return -1;
            if (a.completed && !b.completed) return 1;
            // Si todo lo demás es igual, ordena por ID (fecha de creación)
            return b.id - a.id;
        });

    filteredAndSortedNotes.forEach(note => createTaskElement(note));
    updateTaskCount(); // Asegurarse de que el contador se actualice después de renderizar
}

// Carga las tareas desde localStorage y las renderiza
function loadTasksFromLocalStorage() {
    const storedNotes = JSON.parse(localStorage.getItem('notes')) || [];
    notes = storedNotes; // Asigna las notas cargadas a nuestro array global
    renderTasks(); // Renderiza todas las notas cargadas
    console.log("Tareas cargadas desde localStorage.");
}

// Actualiza la selección visual en la paleta de colores
function updateColorPaletteSelection(color) {
    document.querySelectorAll('.color-box').forEach(box => {
        box.classList.remove('active');
    });
    const selectedBox = document.querySelector(`.color-box[data-color="${color}"]`);
    if (selectedBox) {
        selectedBox.classList.add('active');
    }
    selectedNoteColor = color; // Almacena el color seleccionado
    console.log(`Color de nota seleccionado: ${selectedNoteColor}`);
}

// Actualiza el contador de tareas pendientes
function updateTaskCount() {
    const pendingTasks = notes.filter(note => !note.completed && currentFilter !== 'completed').length;
    pendingTasksCountSpan.textContent = pendingTasks;
    console.log(`Contador de tareas pendientes actualizado: ${pendingTasks}`);
}

// Aplica el filtro de tareas
function applyFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`filter-${filter}`).classList.add('active');
    renderTasks(); // Volver a renderizar con el nuevo filtro
    console.log(`Filtro aplicado: ${filter}`);
}

// Lógica del modal de alarma
function showAlarmModal(noteId, noteText) {
    currentAlarmNoteId = noteId; // Guarda el ID de la nota
    alarmModal.style.display = 'flex';
    document.getElementById('alarm-note-text').textContent = noteText;

    const note = notes.find(n => n.id === noteId);
    if (note && note.alarm) {
        const alarmDate = new Date(note.alarm);
        document.getElementById('alarm-date').value = alarmDate.toISOString().split('T')[0];
        document.getElementById('alarm-time').value = alarmDate.toTimeString().split(' ')[0].substring(0, 5);
        removeAlarmBtn.style.display = 'inline-block'; // Muestra el botón de eliminar si ya hay alarma
    } else {
        document.getElementById('alarm-date').value = '';
        document.getElementById('alarm-time').value = '';
        removeAlarmBtn.style.display = 'none'; // Oculta el botón de eliminar si no hay alarma
    }
}

function hideAlarmModal() {
    alarmModal.style.display = 'none';
    currentAlarmNoteId = null; // Limpia el ID de la nota
}


// --- Event Listeners ---

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
                // NOTA: Para vapidKey, Firebase recomienda generar una clave específica.
                // Si la que estás usando (messagingSenderId) no funciona, busca en tu consola de Firebase
                // (Configuración del proyecto > Cloud Messaging > Claves de identificación de servidor web).
                messaging.getToken({ vapidKey: 'BM-2D4cWkYJt2rF5j_J3qB8l8eQ0n5g5d5b7z0_j_1v4p0Q0p0R0t0v0w0x0y0z0' || firebaseConfig.messagingSenderId })
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

    // --- Lógica específica para el botón FAB y añadir notas ---

    // 1. Manejar clic en el botón FAB para mostrar/ocultar el área de añadir nota
    fabAddNoteBtn.addEventListener('click', () => {
        addNoteArea.classList.toggle('expanded'); // Toggle la clase 'expanded'
        if (addNoteArea.classList.contains('expanded')) {
            newTaskInput.focus(); // Enfocar el input cuando se expande
        }
    });

    // 2. Manejar clic en el botón 'Guardar Nota'
    saveNoteBtn.addEventListener('click', () => {
        const noteContent = newTaskInput.value.trim();
        // NUEVO: Obtener y procesar etiquetas
        const tags = tagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        // --- NUEVO: Obtener el valor del campo de icono ---
        const iconClass = iconInput.value.trim();
        // --- FIN NUEVO ---

        if (noteContent) {
            const newNote = {
                id: Date.now(), // Un ID simple basado en el tiempo
                content: noteContent,
                color: selectedNoteColor,
                completed: false,
                pinned: false,
                alarm: null, // Para la futura funcionalidad de alarma
                tags: tags, // NUEVO: Guardar las etiquetas
                icon: iconClass // --- NUEVO: Guardar el icono ---
            };
            console.log("Nueva nota creada:", newNote);

            notes.push(newNote); // Añadir la nueva nota al array
            saveNotesToLocalStorage(); // Guardar en localStorage

            newTaskInput.value = '';
            tagInput.value = ''; // NUEVO: Limpiar el campo de etiquetas
            iconInput.value = ''; // --- NUEVO: Limpiar el campo del icono ---
            iconPreview.className = 'fas fa-question-circle'; // --- NUEVO: Restablecer el icono de previsualización ---
            updateColorPaletteSelection('default');
            addNoteArea.classList.remove('expanded'); // Ocultar el área después de añadir
            renderTasks(); // Renderizar de nuevo para mostrar la nueva nota y actualizar el conteo/filtro
        } else {
            alert('Por favor, escribe algo en la nota.');
        }
    });

    // 3. Manejar selección de color en la paleta
    colorPalette.addEventListener('click', (event) => {
        const colorBox = event.target.closest('.color-box');
        if (colorBox) {
            const color = colorBox.dataset.color;
            updateColorPaletteSelection(color);
        }
    });

    // 4. Manejar el click en el textarea o tag input para expandir el área de añadir nota
    newTaskInput.addEventListener('focus', () => {
        addNoteArea.classList.add('expanded');
    });
    tagInput.addEventListener('focus', () => { // NUEVO: Expandir también al enfocar el campo de etiquetas
        addNoteArea.classList.add('expanded');
    });
    // --- NUEVO: Expandir también al enfocar el campo de icono ---
    iconInput.addEventListener('focus', () => {
        addNoteArea.classList.add('expanded');
    });
    // --- FIN NUEVO ---


    // 5. Inicializar la app (llamadas a tus funciones que necesitan implementación)
    loadTasksFromLocalStorage(); // Cargar y renderizar notas al inicio
    updateColorPaletteSelection('default'); // Asegurar que el color por defecto esté seleccionado
    updateTaskCount(); // Actualizar el conteo inicial
    applyFilter(currentFilter); // Aplicar el filtro inicial (todos)

    // Eventos para los botones de filtro
    filterAllBtn.addEventListener('click', () => applyFilter('all'));
    filterPendingBtn.addEventListener('click', () => applyFilter('pending'));
    filterCompletedBtn.addEventListener('click', () => applyFilter('completed'));

    // Evento para limpiar completadas
    clearCompletedBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar todas las tareas completadas?')) {
            notes = notes.filter(note => !note.completed); // Filtra y deja solo las no completadas
            saveNotesToLocalStorage(); // Guarda los cambios
            renderTasks(); // Renderiza de nuevo
        }
    });

    // Evento para la búsqueda
    document.getElementById('search-input').addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        taskList.querySelectorAll('.note-item').forEach(noteElement => {
            const noteContent = noteElement.querySelector('.note-content').textContent.toLowerCase();
            // NUEVO: Buscar también en las etiquetas
            const noteTags = Array.from(noteElement.querySelectorAll('.note-tag')).map(tagSpan => tagSpan.textContent.toLowerCase()).join(' ');

            if (noteContent.includes(searchTerm) || noteTags.includes(searchTerm)) {
                noteElement.style.display = 'block';
            } else {
                noteElement.style.display = 'none';
            }
        });
        // Si quieres que la búsqueda afecte el contador o los filtros, tendrías que re-renderizar
        // o adaptar updateTaskCount y applyFilter para considerar el término de búsqueda.
    });

    // Lógica del modal de alarma (mostrar/ocultar, establecer alarma)
    cancelAlarmBtn.addEventListener('click', () => { hideAlarmModal(); });

    setAlarmBtn.addEventListener('click', () => {
        const dateInput = document.getElementById('alarm-date');
        const timeInput = document.getElementById('alarm-time');
        const noteId = currentAlarmNoteId; // Usamos la variable global

        if (noteId && dateInput.value && timeInput.value) {
            const alarmDateTime = new Date(`${dateInput.value}T${timeInput.value}`);
            const now = new Date();

            if (alarmDateTime <= now) {
                alert('La fecha y hora de la alarma deben ser en el futuro.');
                return;
            }

            const noteIndex = notes.findIndex(note => note.id === noteId);
            if (noteIndex > -1) {
                notes[noteIndex].alarm = alarmDateTime.getTime(); // Guardar como timestamp
                saveNotesToLocalStorage();
                alert(`Alarma establecida para: ${notes[noteIndex].content} el ${alarmDateTime.toLocaleString()}`);

                // --- Lógica para Notificación Local (cuando la app está abierta) ---
                // Si quieres que una notificación aparezca cuando la app está abierta y llegue la hora
                setTimeout(() => {
                    if (Notification.permission === 'granted') {
                        // Asegúrate de que la nota no haya sido completada o eliminada
                        const updatedNote = notes.find(n => n.id === noteId);
                        if (updatedNote && !updatedNote.completed) {
                            new Notification('¡Recordatorio de Tarea!', {
                                body: updatedNote.content,
                                icon: './ICONOS/icon-192x192.png',
                                badge: './ICONOS/icon-192x192.png'
                            });
                        }
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
    const iconInput = document.getElementById('icon-input');
    const iconPreview = document.getElementById('icon-preview');

    if (iconInput && iconPreview) {
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