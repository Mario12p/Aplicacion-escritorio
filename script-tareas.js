document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const taskList = document.getElementById('task-list');
    const searchInput = document.getElementById('search-input');
    const pendingTasksCountSpan = document.getElementById('pending-tasks-count');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    const emptyTasksMessage = document.getElementById('empty-tasks-message');
    const filterButtons = document.querySelectorAll('.filter-btn');

    const alarmModal = document.getElementById('alarm-modal');
    const alarmNoteText = document.getElementById('alarm-note-text');
    const alarmDatetimeInput = document.getElementById('alarm-datetime');
    const cancelAlarmBtn = document.getElementById('cancel-alarm-btn');
    const setAlarmBtn = document.getElementById('set-alarm-btn');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentAlarmTaskId = null;
    let currentFilter = 'pending';

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderTasks(currentFilter, searchInput.value.trim());
        updatePendingTasksCount();
        updateEmptyState();
    }

    function updateEmptyState() {
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

        const hasVisibleTasks = visibleTasks.length > 0;
        emptyTasksMessage.classList.toggle('hidden', hasVisibleTasks);
        taskList.classList.toggle('hidden', !hasVisibleTasks);

        if (!hasVisibleTasks) {
            let messageHTML = '';
            if (searchTerm) {
                messageHTML = `
                    <p>No se encontraron tareas para "${searchTerm}" con el filtro "${currentFilter}".</p>
                `;
            } else if (currentFilter !== 'pending') {
                const filtroTraducido = currentFilter === 'completed' ? 'completadas' : 'fijadas';
                messageHTML = `
                    <p>No hay tareas ${filtroTraducido} para mostrar.</p>
                `;
            } else {
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

    function renderTasks(filter, searchTerm = '') {
        taskList.innerHTML = '';
        let filteredTasks = tasks;

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            filteredTasks = filteredTasks.filter(task =>
                (task.title && task.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
                task.text.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }

        if (filter === 'pending') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (filter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        } else if (filter === 'pinned') {
            filteredTasks = filteredTasks.filter(task => task.pinned);
        }

        filteredTasks.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        if (filteredTasks.length === 0) {
            updateEmptyState();
            return;
        }

        emptyTasksMessage.classList.add('hidden');
        taskList.classList.remove('hidden');

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''} ${task.pinned ? 'pinned' : ''}`;
            li.dataset.id = task.id;
            li.dataset.color = task.color || 'default';
            li.style.backgroundColor = `var(--note-${task.color || 'default'})`;

            const timestampDate = new Date(task.timestamp);
            const formattedTimestamp = isNaN(timestampDate) ? 'Fecha inválida' : timestampDate.toLocaleString();

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

        if (document.body.classList.contains('dark-mode')) {
            taskList.querySelectorAll('.task-item').forEach(item => {
                if (item.dataset.color === 'default') {
                    item.style.backgroundColor = 'var(--card-bg-color)';
                }
            });
        }
    }

    taskList.addEventListener('click', (event) => {
        const target = event.target;
        const listItem = target.closest('.task-item');
        if (!listItem) return;

        const taskId = listItem.dataset.id;
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex === -1) {
            console.error('Error: Tarea no encontrada para el ID:', taskId);
            return;
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

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim();
        renderTasks(currentFilter, searchTerm);
    });

    clearCompletedBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres eliminar todas las notas completadas?')) {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
        }
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const filter = event.target.dataset.filter;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            searchInput.value = '';

            if (filter === 'all') {
                window.location.href = `index.html`;
            } else {
                currentFilter = filter;
                renderTasks(currentFilter);
            }
        });
    });

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
        renderTasks(currentFilter, searchInput.value.trim());
    });

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    cancelAlarmBtn.addEventListener('click', () => {
        alarmModal.classList.remove('show');
        alarmModal.classList.add('hide');
        alarmModal.addEventListener('animationend', function handler() {
            alarmModal.style.display = 'none';
            alarmModal.classList.remove('hide');
            alarmModal.removeEventListener('animationend', handler);
        });
        currentAlarmTaskId = null;
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
            task.alarm = null;
            saveTasks();
            return;
        }

        if (task.alarmTimeoutId) {
            clearTimeout(task.alarmTimeoutId);
        }

        task.alarmTimeoutId = setTimeout(() => {
            alert(`¡Alarma! Es hora de tu nota: "${task.title || task.text.substring(0, 50) + '...'}"`);
            task.alarm = null;
            saveTasks();
        }, timeToAlarm);
        console.log(`Alarma programada para la tarea ${task.id} en ${timeToAlarm / 1000} segundos.`);
    }

    function loadAndScheduleAlarms() {
        tasks.forEach(task => {
            if (task.alarm && task.alarm.set) {
                scheduleAlarm(task);
            }
        });
    }

    currentFilter = 'pending';
    renderTasks(currentFilter);
    updatePendingTasksCount();
    updateEmptyState();
    loadAndScheduleAlarms();

    filterButtons.forEach(btn => {
        if (btn.dataset.filter === 'pending') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
});
