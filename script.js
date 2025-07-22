document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const noteTitleInput = document.getElementById('note-title');
    const noteTextInput = document.getElementById('note-text');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const searchInput = document.getElementById('search-input');
    const fabAddNote = document.getElementById('fab-add-note');
    const addNoteArea = document.querySelector('.add-note-area');
    const colorPalette = document.getElementById('color-palette');
    const errorMessage = document.getElementById('error-message');
    const pendingTasksCountSpan = document.getElementById('pending-tasks-count');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    const emptyTasksMessage = document.getElementById('empty-tasks-message');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Elementos del modal de alarma
    const alarmModal = document.getElementById('alarm-modal');
    const alarmNoteText = document.getElementById('alarm-note-text');
    const alarmDatetimeInput = document.getElementById('alarm-datetime');
    const cancelAlarmBtn = document.getElementById('cancel-alarm-btn');
    const setAlarmBtn = document.getElementById('set-alarm-btn');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let selectedColor = 'default';
    let currentAlarmTaskId = null; // Para saber qué tarea está configurando la alarma

    // --- Funciones de Utilidad ---

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks();
        updatePendingTasksCount();
        updateEmptyState();
    }

    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function updateEmptyState() {
        const hasTasks = tasks.length > 0;
        emptyTasksMessage.classList.toggle('hidden', hasTasks);
        taskList.classList.toggle('hidden', !hasTasks); // Oculta la lista si no hay tareas
    }

    function updatePendingTasksCount() {
        const pendingTasks = tasks.filter(task => !task.completed).length;
        pendingTasksCountSpan.textContent = pendingTasks;
    }

    // --- Renderizado de Tareas ---

    function renderTasks(filter = 'all', searchTerm = '') {
        taskList.innerHTML = ''; // Limpiar la lista antes de renderizar

        let filteredTasks = tasks;

        // Aplicar búsqueda
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredTasks = filteredTasks.filter(task =>
                (task.title && task.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
                task.text.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        // Aplicar filtro
        if (filter === 'pending') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (filter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (filter === 'pinned') {
            filteredTasks = filteredTasks.filter(task => task.pinned);
        }

        // Ordenar: Fijadas primero, luego por fecha (más reciente primero)
        filteredTasks.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        if (filteredTasks.length === 0 && (searchTerm || filter !== 'all')) {
            emptyTasksMessage.classList.remove('hidden');
            emptyTasksMessage.innerHTML = `
                <i class="fas fa-clipboard-check"></i>
                <p>No se encontraron notas para la búsqueda/filtro.</p>
            `;
            taskList.classList.add('hidden');
            return;
        } else if (filteredTasks.length === 0 && !searchTerm && filter === 'all') {
            updateEmptyState(); // Mostrar mensaje de "no hay notas" general
            return;
        }


        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${task.pinned ? 'pinned' : ''}`;
            li.dataset.id = task.id;
            li.dataset.color = task.color || 'default'; // Asegura un color por defecto
            li.style.backgroundColor = `var(--note-${task.color || 'default'})`;

            li.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-text-group">
                        ${task.title ? `<h3 class="task-title">${task.title}</h3>` : ''}
                        <p class="task-description">${task.text}</p>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="pin-btn ${task.pinned ? 'active' : ''}" aria-label="Fijar nota">
                        <i class="fas fa-thumbtack"></i>
                    </button>
                    <button class="alarm-btn ${task.alarm ? 'active' : ''}" aria-label="Establecer alarma">
                        <i class="fas fa-bell"></i>
                    </button>
                    <button class="edit-btn" aria-label="Editar nota">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" aria-label="Eliminar nota">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <span class="task-timestamp">${new Date(task.timestamp).toLocaleString()}</span>
                ${task.alarm ? `<span class="task-alarm-time" style="font-size: 0.8em; color: #007bff; margin-left: 10px;">Alarma: ${new Date(task.alarm.time).toLocaleString()}</span>` : ''}
            `;
            taskList.appendChild(li);
        });

        // Reaplicar el modo oscuro a los elementos de la lista si es necesario
        if (document.body.classList.contains('dark-mode')) {
            taskList.querySelectorAll('.task-item').forEach(item => {
                // Solo cambia el fondo si no tiene un color específico que deba mantenerse claro
                if (item.dataset.color === 'default') {
                    item.style.backgroundColor = 'var(--dark-mode-card-background)';
                }
                item.querySelectorAll('.task-title, .task-description').forEach(el => {
                    el.style.color = 'var(--dark-mode-text-color)';
                });
                item.querySelectorAll('.task-id, .task-timestamp').forEach(el => {
                    el.style.color = 'var(--dark-mode-placeholder-color)';
                });
                item.querySelectorAll('.task-actions button').forEach(el => {
                    el.style.color = 'var(--dark-mode-placeholder-color)';
                });
            });
        }
    }


    // --- Manejo de Eventos ---

    // Toggle para mostrar/ocultar el área de añadir nota
    fabAddNote.addEventListener('click', () => {
        addNoteArea.classList.toggle('hidden');
        fabAddNote.classList.toggle('active'); // Para rotar el ícono
        // Si se abre, enfocar el textarea
        if (!addNoteArea.classList.contains('hidden')) {
            noteTextInput.focus();
        }
        // Ocultar mensaje de error al cerrar/abrir
        errorMessage.style.display = 'none';
        noteTextInput.classList.remove('error-border');
    });

    // Expandir el área de añadir nota al enfocar el textarea
    noteTextInput.addEventListener('focus', () => {
        noteTitleInput.classList.remove('hidden');
        document.querySelector('.color-picker-and-save').classList.remove('hidden');
        noteTextInput.rows = 3; // Ajusta el tamaño del textarea
    });

    // Validar y añadir tarea
    addTaskBtn.addEventListener('click', () => {
        const text = noteTextInput.value.trim();
        const title = noteTitleInput.value.trim();

        if (text === '') {
            errorMessage.style.display = 'block';
            noteTextInput.classList.add('error-border');
            return;
        }

        errorMessage.style.display = 'none';
        noteTextInput.classList.remove('error-border');

        const newTask = {
            id: generateUniqueId(),
            title: title,
            text: text,
            completed: false,
            pinned: false,
            timestamp: new Date().toISOString(),
            color: selectedColor,
            alarm: null // No hay alarma por defecto
        };

        tasks.unshift(newTask); // Añadir al principio para que las nuevas salgan arriba
        saveTasks();

        noteTitleInput.value = '';
        noteTextInput.value = '';
        noteTitleInput.classList.add('hidden'); // Ocultar título
        document.querySelector('.color-picker-and-save').classList.add('hidden'); // Ocultar paleta
        noteTextInput.rows = 1; // Restablecer tamaño del textarea
        selectedColor = 'default'; // Resetear color seleccionado
        document.querySelector('.color-box.active').classList.remove('active');
        document.querySelector('.color-box[data-color="default"]').classList.add('active');
        addNoteArea.classList.add('hidden'); // Ocultar el área de añadir
        fabAddNote.classList.remove('active'); // Restaurar icono del FAB
    });

    // Selección de color
    colorPalette.addEventListener('click', (event) => {
        if (event.target.classList.contains('color-box')) {
            document.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
            event.target.classList.add('active');
            selectedColor = event.target.dataset.color;
        }
    });

    // Delegación de eventos para los botones de las tareas (borrar, completar, fijar, editar, alarma)
    taskList.addEventListener('click', (event) => {
        const target = event.target;
        const listItem = target.closest('.task-item');
        if (!listItem) return;

        const taskId = listItem.dataset.id;
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (target.classList.contains('task-checkbox') || target.closest('.task-checkbox')) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            saveTasks();
        } else if (target.closest('.delete-btn')) {
            if (confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
                tasks.splice(taskIndex, 1);
                saveTasks();
            }
        } else if (target.closest('.pin-btn')) {
            tasks[taskIndex].pinned = !tasks[taskIndex].pinned;
            saveTasks();
        } else if (target.closest('.edit-btn')) {
            const task = tasks[taskIndex];
            noteTitleInput.value = task.title || '';
            noteTextInput.value = task.text;
            selectedColor = task.color || 'default';

            noteTitleInput.classList.remove('hidden');
            document.querySelector('.color-picker-and-save').classList.remove('hidden');
            noteTextInput.rows = 5; // Más espacio para editar
            addNoteArea.classList.remove('hidden'); // Asegurarse de que el área esté visible
            fabAddNote.classList.add('active'); // Cambiar el icono del FAB

            // Resaltar el color actual de la nota
            document.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
            const currentNoteColorBox = document.querySelector(`.color-box[data-color="${selectedColor}"]`);
            if (currentNoteColorBox) {
                currentNoteColorBox.classList.add('active');
            }

            // Cambiar el botón "Guardar Nota" a "Actualizar Nota" y la funcionalidad
            addTaskBtn.textContent = 'Actualizar Nota';
            addTaskBtn.dataset.editingId = taskId; // Guardar el ID de la tarea que se está editando

            // Scroll suave hacia arriba para ver el formulario
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

        } else if (target.closest('.alarm-btn')) {
            const task = tasks[taskIndex];
            currentAlarmTaskId = task.id;
            alarmNoteText.textContent = task.text;
            
            // Si ya tiene alarma, precargar la fecha/hora
            if (task.alarm && task.alarm.time) {
                const alarmTime = new Date(task.alarm.time);
                // Formatear a YYYY-MM-DDTHH:MM para el input datetime-local
                const year = alarmTime.getFullYear();
                const month = (alarmTime.getMonth() + 1).toString().padStart(2, '0');
                const day = alarmTime.getDate().toString().padStart(2, '0');
                const hours = alarmTime.getHours().toString().padStart(2, '0');
                const minutes = alarmTime.getMinutes().toString().padStart(2, '0');
                alarmDatetimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            } else {
                alarmDatetimeInput.value = ''; // Limpiar si no hay alarma
            }

            alarmModal.style.display = 'flex'; // Mostrar el modal
            alarmModal.classList.remove('hidden'); // Asegurarse de que no tenga la clase hidden
            alarmModal.classList.remove('hide'); // Eliminar la clase de animación de salida si estaba

        }
    });

    // Lógica para el botón "Actualizar Nota"
    addTaskBtn.addEventListener('click', () => {
        const editingId = addTaskBtn.dataset.editingId;
        if (editingId) {
            const text = noteTextInput.value.trim();
            const title = noteTitleInput.value.trim();

            if (text === '') {
                errorMessage.style.display = 'block';
                noteTextInput.classList.add('error-border');
                return;
            }

            errorMessage.style.display = 'none';
            noteTextInput.classList.remove('error-border');

            const taskIndex = tasks.findIndex(task => task.id === editingId);
            if (taskIndex !== -1) {
                tasks[taskIndex].title = title;
                tasks[taskIndex].text = text;
                tasks[taskIndex].color = selectedColor;
                saveTasks();
            }

            // Restaurar estado del botón y formulario
            addTaskBtn.textContent = 'Guardar Nota';
            delete addTaskBtn.dataset.editingId;
            noteTitleInput.value = '';
            noteTextInput.value = '';
            noteTitleInput.classList.add('hidden');
            document.querySelector('.color-picker-and-save').classList.add('hidden');
            noteTextInput.rows = 1;
            selectedColor = 'default';
            document.querySelector('.color-box.active').classList.remove('active');
            document.querySelector('.color-box[data-color="default"]').classList.add('active');
            addNoteArea.classList.add('hidden');
            fabAddNote.classList.remove('active');
        } else {
            // Lógica para añadir una nueva nota (ya existe arriba)
            // ... (el código ya está en el event listener de addTaskBtn)
        }
    });

    // Búsqueda
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim();
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
        renderTasks(currentFilter, searchTerm);
    });

    // Limpiar tareas completadas
    clearCompletedBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar todas las notas completadas?')) {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
        }
    });

    // --- MANEJO DE FILTROS ---
    filterButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const filter = event.target.dataset.filter;

            // Remueve la clase 'active' de todos los botones de filtro
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Añade la clase 'active' solo al botón clicado
            event.target.classList.add('active');

            searchInput.value = ''; // Limpiar búsqueda al cambiar de filtro

            // Lógica de redirección para "Pendientes"
            if (filter === 'pending') {
                window.location.href = 'Tareas.html'; // Redirige a Tareas.html
                // No llamamos a renderTasks aquí porque la página cambiará
            } else {
                // Si no es "Pendientes", renderiza las tareas en la página actual
                renderTasks(filter);
            }
        });
    });

    // --- Funcionalidad del Dark Mode ---
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        // Guardar la preferencia del usuario en localStorage
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
        // Volver a renderizar para aplicar colores de notas si es necesario
        renderTasks(document.querySelector('.filter-btn.active')?.dataset.filter || 'all', searchInput.value);
    });

    // Cargar preferencia de modo oscuro al cargar la página
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }


    // --- Lógica del Modal de Alarma ---

    cancelAlarmBtn.addEventListener('click', () => {
        // Añade una clase para la animación de salida
        alarmModal.classList.add('hide');
        alarmModal.addEventListener('animationend', function handler() {
            alarmModal.style.display = 'none';
            alarmModal.classList.remove('hide');
            alarmModal.removeEventListener('animationend', handler);
        });
        currentAlarmTaskId = null; // Resetear ID de tarea
    });

    setAlarmBtn.addEventListener('click', () => {
        const alarmTimeStr = alarmDatetimeInput.value;
        if (!alarmTimeStr) {
            alert('Por favor, selecciona una fecha y hora para la alarma.');
            return;
        }

        const alarmTime = new Date(alarmTimeStr);
        const now = new Date();

        if (alarmTime <= now) {
            alert('La fecha y hora de la alarma debe ser en el futuro.');
            return;
        }

        const taskIndex = tasks.findIndex(task => task.id === currentAlarmTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].alarm = {
                time: alarmTime.toISOString(),
                set: true
            };
            saveTasks();
            scheduleAlarm(tasks[taskIndex]);
        }
        
        // Cierra el modal con animación
        alarmModal.classList.add('hide');
        alarmModal.addEventListener('animationend', function handler() {
            alarmModal.style.display = 'none';
            alarmModal.classList.remove('hide');
            alarmModal.removeEventListener('animationend', handler);
        });
        currentAlarmTaskId = null;
    });

    function scheduleAlarm(task) {
        if (!task.alarm || !task.alarm.set) return;

        const alarmDate = new Date(task.alarm.time);
        const now = new Date();
        const timeToAlarm = alarmDate.getTime() - now.getTime();

        if (timeToAlarm <= 0) {
            // Si la alarma ya pasó, eliminarla o marcarla como expirada
            task.alarm = null;
            saveTasks(); // Esto actualizará la UI
            return;
        }

        // Limpiar cualquier alarma previa para esta tarea si existe
        if (task.alarmTimeoutId) {
            clearTimeout(task.alarmTimeoutId);
        }

        task.alarmTimeoutId = setTimeout(() => {
            alert(`¡Alarma! Es hora de tu nota: "${task.title || task.text.substring(0, 50) + '...'}"`);
            // Opcional: Marcar alarma como disparada o eliminarla
            task.alarm = null;
            saveTasks(); // Para actualizar la UI
        }, timeToAlarm);
        console.log(`Alarma programada para la tarea ${task.id} en ${timeToAlarm / 1000} segundos.`);
    }

    // Al cargar la página, programar las alarmas existentes
    function loadAndScheduleAlarms() {
        tasks.forEach(task => {
            if (task.alarm && task.alarm.set) {
                scheduleAlarm(task);
            }
        });
    }


    // --- Inicialización ---
    updateEmptyState(); // Inicializa el estado vacío
    updatePendingTasksCount(); // Actualiza el conteo al cargar
    renderTasks(); // Renderiza las tareas al cargar la página
    loadAndScheduleAlarms(); // Cargar y programar alarmas existentes
});