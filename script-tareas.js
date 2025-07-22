document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const taskList = document.getElementById('task-list');
    const searchInput = document.getElementById('search-input');
    const pendingTasksCountSpan = document.getElementById('pending-tasks-count');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    const emptyTasksMessage = document.getElementById('empty-tasks-message');
    // Seleccionamos todos los botones de filtro, incluyendo el enlace "Todas"
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Elementos del modal de alarma
    const alarmModal = document.getElementById('alarm-modal');
    const alarmNoteText = document.getElementById('alarm-note-text');
    const alarmDatetimeInput = document.getElementById('alarm-datetime');
    const cancelAlarmBtn = document.getElementById('cancel-alarm-btn');
    const setAlarmBtn = document.getElementById('set-alarm-btn');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentAlarmTaskId = null; // Para saber qué tarea está configurando la alarma

    // Variable para mantener el filtro actual de esta página (Tareas.html)
    // Inicialmente, esta página siempre debe mostrar 'pending'
    let currentFilter = 'pending';

    // --- Funciones de Utilidad ---

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        // Al guardar, siempre re-renderizamos con el filtro y búsqueda actuales
        renderTasks(currentFilter, searchInput.value.trim());
        updatePendingTasksCount();
        updateEmptyState();
    }

    function updateEmptyState() {
        // Obtenemos las tareas visibles según el filtro actual y la búsqueda
        // Para determinar si el mensaje de vacío debe mostrarse
        let visibleTasks = tasks;
        const searchTerm = searchInput.value.trim().toLowerCase();

        if (searchTerm) {
            visibleTasks = visibleTasks.filter(task =>
                (task.title && task.title.toLowerCase().includes(searchTerm)) ||
                task.text.toLowerCase().includes(searchTerm)
            );
        }

        if (currentFilter === 'pending') {
            visibleTasks = visibleTasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            visibleTasks = visibleTasks.filter(task => task.completed);
        } else if (currentFilter === 'pinned') {
            visibleTasks = visibleTasks.filter(task => task.pinned);
        }
        // Para 'all', no se filtra por estado aquí, se muestran todas las que pasaron la búsqueda

        const hasVisibleTasks = visibleTasks.length > 0;
        
        emptyTasksMessage.classList.toggle('hidden', hasVisibleTasks);
        taskList.classList.toggle('hidden', !hasVisibleTasks);

        // Ajustar el mensaje de vacío si no hay resultados para la búsqueda/filtro
        if (!hasVisibleTasks) {
            let messageHTML = '';
            if (searchTerm) {
                messageHTML = `
                    <p>No se encontraron tareas para la búsqueda "${searchTerm}" con el filtro "${currentFilter}".</p>
                `;
            } else if (currentFilter !== 'pending') {
                   messageHTML = `
                    <p>No hay tareas ${currentFilter} para mostrar.</p>
                `;
            } else { // Si es 'pending' y no hay búsqueda
                messageHTML = `
                    <p>¡No hay tareas pendientes!</p>
                    <p>Añade nuevas notas en la <a href="index.html" style="color: var(--accent-color); text-decoration: underline;">página principal</a>.</p>
                `;
            }
            emptyTasksMessage.innerHTML = `<i class="fas fa-clipboard-check"></i>${messageHTML}`;
        }
    }

    function updatePendingTasksCount() {
        const pendingTasks = tasks.filter(task => !task.completed).length;
        pendingTasksCountSpan.textContent = pendingTasks;
    }

    // --- Renderizado de Tareas ---

    function renderTasks(filter, searchTerm = '') {
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

        // Aplicar filtro de estado (solo para los botones Pendientes, Completadas, Fijadas)
        if (filter === 'pending') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (filter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (filter === 'pinned') {
            filteredTasks = filteredTasks.filter(task => task.pinned);
        }
        // 'all' no se maneja aquí porque el botón 'Todas' redirige

        // Ordenar: Fijadas primero, luego por fecha (más reciente primero)
        filteredTasks.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        if (filteredTasks.length === 0) {
            updateEmptyState(); // Asegura que el mensaje de vacío se muestre si no hay tareas filtradas
            return; // No hay tareas que renderizar
        }

        // Asegúrate de que el mensaje de vacío se oculte si hay tareas
        emptyTasksMessage.classList.add('hidden');
        taskList.classList.remove('hidden');

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${task.pinned ? 'pinned' : ''}`;
            li.dataset.id = task.id;
            li.dataset.color = task.color || 'default'; // Asegura un color por defecto
            li.style.backgroundColor = `var(--note-${task.color || 'default'})`;

            // Formatear la fecha para evitar "Invalid Date" si el timestamp es inválido
            const timestampDate = new Date(task.timestamp);
            const formattedTimestamp = isNaN(timestampDate) ? 'Fecha Inválida' : timestampDate.toLocaleString();

            const alarmTimeDate = task.alarm && task.alarm.set ? new Date(task.alarm.time) : null;
            const formattedAlarmTime = alarmTimeDate && !isNaN(alarmTimeDate) ? alarmTimeDate.toLocaleString() : '';

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
                    <button class="alarm-btn ${task.alarm && task.alarm.set ? 'active' : ''}" aria-label="Establecer alarma">
                        <i class="fas fa-bell"></i>
                    </button>
                    <button class="edit-btn" aria-label="Editar nota">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" aria-label="Eliminar nota">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <span class="task-timestamp">${formattedTimestamp}</span>
                ${formattedAlarmTime ? `<span class="task-alarm-time">Alarma: ${formattedAlarmTime}</span>` : ''}
            `;
            taskList.appendChild(li);
        });

        // Reaplicar el modo oscuro a los elementos de la lista si es necesario
        if (document.body.classList.contains('dark-mode')) {
            taskList.querySelectorAll('.task-item').forEach(item => {
                if (item.dataset.color === 'default') {
                    item.style.backgroundColor = 'var(--card-bg-color)'; // Usa el color de la tarjeta para las notas por defecto
                }
            });
        }
    }


    // --- Manejo de Eventos ---

    // Delegación de eventos para los botones de las tareas (borrar, completar, fijar, editar, alarma)
    taskList.addEventListener('click', (event) => {
        const target = event.target;
        const listItem = target.closest('.task-item');
        if (!listItem) return; // Si el clic no fue dentro de un elemento de tarea, salir

        const taskId = listItem.dataset.id;
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        // AÑADIDO: Comprobación para asegurarse de que la tarea existe en el arreglo
        if (taskIndex === -1) {
            console.error('Error: Tarea no encontrada en el arreglo "tasks" para el ID:', taskId);
            return; // Salir si la tarea no se encuentra, evitando errores.
        }

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
            // En esta página, redirigimos a index.html para editar
            window.location.href = `index.html?edit=${taskId}`;
        } else if (target.closest('.alarm-btn')) {
            const task = tasks[taskIndex];
            currentAlarmTaskId = task.id;
            alarmNoteText.textContent = task.text;
            
            if (task.alarm && task.alarm.time) {
                const alarmTime = new Date(task.alarm.time);
                const year = alarmTime.getFullYear();
                const month = (alarmTime.getMonth() + 1).toString().padStart(2, '0');
                const day = alarmTime.getDate().toString().padStart(2, '0');
                const hours = alarmTime.getHours().toString().padStart(2, '0');
                const minutes = alarmTime.getMinutes().toString().padStart(2, '0');
                alarmDatetimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            } else {
                // Establecer la hora por defecto a la hora actual + 1 hora si no hay alarma previa
                const now = new Date();
                now.setHours(now.getHours() + 1);
                const year = now.getFullYear();
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                alarmDatetimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            }

            alarmModal.style.display = 'flex';
            alarmModal.classList.add('show');
        }
    });

    // Búsqueda
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim();
        // Mantenemos el filtro actual al buscar
        renderTasks(currentFilter, searchTerm); 
    });

    // Limpiar tareas completadas
    clearCompletedBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar todas las notas completadas?')) {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
        }
    });

    // --- MANEJO DE FILTROS EN TAREAS.HTML ---
    filterButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const filter = event.target.dataset.filter;

            // Siempre quitar la clase 'active' de todos y añadirla al clicado
            filterButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            searchInput.value = ''; // Limpiar búsqueda al cambiar de filtro

            if (filter === 'all') {
                // Para "Todas", redirige a index.html
                // Puedes pasar el filtro como parámetro si index.html lo puede manejar
                // Por simplicidad, aquí solo redirige a index.html
                // Si quieres que la página principal sepa qué filtro aplicar, usa:
                // window.location.href = `index.html?filter=${filter}`;
                window.location.href = `index.html`; // Redirige a la página principal sin parámetros de filtro específicos para index.html
            } else {
                // Para "Pendientes", "Completadas", "Fijadas", filtrar en esta misma página
                currentFilter = filter; // Actualizar el filtro actual
                renderTasks(currentFilter); // Re-renderizar con el nuevo filtro
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
        // Al cambiar el modo, se re-renderizan las tareas con el filtro y búsqueda actuales
        renderTasks(currentFilter, searchInput.value.trim()); 
    });

    // Cargar preferencia de modo oscuro al cargar la página
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }


    // --- Lógica del Modal de Alarma ---

    cancelAlarmBtn.addEventListener('click', () => {
        alarmModal.classList.remove('show');
        alarmModal.classList.add('hide'); // Inicia la animación de salida
        alarmModal.addEventListener('animationend', function handler() {
            alarmModal.style.display = 'none'; // Finalmente oculta
            alarmModal.classList.remove('hide'); // Limpia la clase de animación
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
            saveTasks(); // Guardar el estado de las tareas
            scheduleAlarm(tasks[taskIndex]);
        }
        
        alarmModal.classList.remove('show');
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
            task.alarm = null; // Eliminar la alarma de la tarea
            saveTasks(); // Esto actualizará la UI para que el icono de campana no esté activo
            return;
        }

        // Limpiar cualquier alarma previa para esta tarea si existe
        if (task.alarmTimeoutId) {
            clearTimeout(task.alarmTimeoutId);
        }

        task.alarmTimeoutId = setTimeout(() => {
            alert(`¡Alarma! Es hora de tu nota: "${task.title || task.text.substring(0, 50) + '...'}"`);
            // Opcional: Marcar alarma como disparada o eliminarla
            task.alarm = null; // Eliminar la alarma una vez que se dispara
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
    // Al cargar esta página de "Tareas Pendientes", siempre queremos mostrar las pendientes
    // Y asegurarnos de que el botón "Pendientes" esté visualmente activo.
    
    // Primero, cargar las tareas
    // No es necesario llamar a saveTasks aquí, ya que renderTasks se llamará
    // Y saveTasks a su vez llama a renderTasks.

    // Establecer el filtro inicial de esta página a 'pending'
    currentFilter = 'pending'; 
    
    // Actualizar la UI
    renderTasks(currentFilter); // Renderiza solo las tareas pendientes al cargar Tareas.html
    updatePendingTasksCount();
    updateEmptyState();
    loadAndScheduleAlarms();

    // Asegurarse de que el botón "Pendientes" esté activo al cargar la página
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === 'pending') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
});