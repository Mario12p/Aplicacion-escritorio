document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM (solo los necesarios para esta página)
    const taskList = document.getElementById('task-list');
    const pendingTasksCountSpan = document.getElementById('pending-tasks-count');
    const searchInput = document.getElementById('search-input');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const alarmModal = document.getElementById('alarm-modal');
    const alarmNoteText = document.getElementById('alarm-note-text');
    const alarmDatetimePicker = document.getElementById('alarm-datetime-picker');
    const closeAlarmModalBtn = document.getElementById('close-alarm-modal-btn');
    const setAlarmBtn = document.getElementById('set-alarm-btn');
    const clearCompletedBtn = document.querySelector('.clear-btn.danger');

    // Los botones de filtro en Tareas.html son enlaces o el botón "Pendientes" que siempre está activo
    const filterPendingBtn = document.querySelector('.filter-btn[data-filter="pending"]');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'pending'; // ¡Filtro por defecto para esta página!
    let currentAlarmTaskId = null;

    // Lógica para alternar el modo oscuro (copia de script.js)
    const applyDarkMode = (isDarkMode) => {
        document.body.classList.toggle('dark-mode', isDarkMode);
        localStorage.setItem('darkMode', isDarkMode);
        const moonIcon = darkModeToggle.querySelector('.fa-moon');
        const sunIcon = darkModeToggle.querySelector('.fa-sun');
        if (isDarkMode) {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'inline-block';
        } else {
            moonIcon.style.display = 'inline-block';
            sunIcon.style.display = 'none';
        }
    };

    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
        applyDarkMode(savedDarkMode === 'true');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyDarkMode(true);
    }

    darkModeToggle.addEventListener('click', () => {
        applyDarkMode(!document.body.classList.contains('dark-mode'));
    });

    // Clase para las notas (copia de script.js)
    class Note {
        constructor(text, tags = '', color = 'default', completed = false, pinned = false, alarm = null, id = Date.now()) {
            this.id = id;
            this.text = text;
            this.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
            this.color = color;
            this.completed = completed;
            this.timestamp = new Date().toLocaleString();
            this.pinned = pinned;
            this.alarm = alarm;
        }
    }

    function saveTasksToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function loadTasksFromLocalStorage() {
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks = tasks.map(task => {
            if (task.pinned === undefined) task.pinned = false;
            if (task.alarm === undefined) task.alarm = null;
            return task;
        });
        renderTasks();
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const filteredAndSortedTasks = tasks
            .filter(task => {
                // En Tareas.html, siempre filtra por 'pending'
                return !task.completed;
            })
            .filter(task => {
                const searchTerm = searchInput.value.toLowerCase();
                if (!searchTerm) return true;
                const taskText = task.text.toLowerCase();
                const taskTags = task.tags.map(tag => tag.toLowerCase()).join(' ');
                return taskText.includes(searchTerm) || taskTags.includes(searchTerm);
            })
            .sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return new Date(b.id) - new Date(a.id); // Más reciente primero
            });

        if (filteredAndSortedTasks.length === 0) {
            taskList.innerHTML = '<p style="text-align: center; color: var(--text-color-light); margin-top: 30px;">No hay tareas pendientes.</p>';
            clearCompletedBtn.classList.add('hidden'); // Ocultar si no hay tareas
        } else {
            filteredAndSortedTasks.forEach(task => {
                const taskItem = createTaskElement(task);
                taskList.appendChild(taskItem);
            });
            updateClearCompletedButtonVisibility(); // Mostrar/ocultar según haya completadas
        }
        updatePendingTasksCount();
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.classList.add('task-item');
        li.setAttribute('data-id', task.id);
        li.setAttribute('data-color', task.color);
        if (task.completed) {
            li.classList.add('completed');
        }

        const taskHeader = document.createElement('div');
        taskHeader.classList.add('task-header');

        const checkboxContainer = document.createElement('div');
        checkboxContainer.classList.add('task-checkbox-container');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('task-checkbox');
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskCompleted(task.id));

        const taskTextSpan = document.createElement('span');
        taskTextSpan.classList.add('task-text');
        taskTextSpan.textContent = task.text;
        if (task.completed) {
            taskTextSpan.classList.add('completed');
        }
        // En esta página, el clic en el texto no debería editar,
        // ya que no tenemos el formulario de edición.
        // Podrías redirigir a index.html para editar, o simplemente no hacer nada.
        // taskTextSpan.addEventListener('click', () => window.location.href = `index.html?edit=${task.id}`); // Ejemplo de redirección para editar

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(taskTextSpan);

        const taskActions = document.createElement('div');
        taskActions.classList.add('task-actions');

        const alarmIcon = document.createElement('button');
        alarmIcon.classList.add('action-icon', 'alarm-icon');
        alarmIcon.innerHTML = '<i class="fas fa-bell"></i>';
        if (task.alarm && new Date(task.alarm.datetime) > new Date()) {
            alarmIcon.classList.add('active');
        }
        alarmIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            openAlarmModal(task.id, task.text, task.alarm ? task.alarm.datetime : '');
        });

        const pinIcon = document.createElement('i');
        pinIcon.classList.add('fas', 'fa-thumbtack', 'pin-icon');
        if (task.pinned) {
            pinIcon.classList.add('pinned');
        }
        pinIcon.addEventListener('click', () => toggleTaskPinned(task.id));

        const deleteIcon = document.createElement('button');
        deleteIcon.classList.add('action-icon');
        deleteIcon.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteIcon.addEventListener('click', () => deleteTask(task.id));

        taskActions.appendChild(alarmIcon);
        taskActions.appendChild(pinIcon);
        taskActions.appendChild(deleteIcon);

        taskHeader.appendChild(checkboxContainer);
        taskHeader.appendChild(taskActions);

        li.appendChild(taskHeader);

        const taskFooter = document.createElement('div');
        taskFooter.classList.add('task-footer');

        const tagsContainer = document.createElement('div');
        tagsContainer.classList.add('tags');
        task.tags.forEach(tagText => {
            const tagSpan = document.createElement('span');
            tagSpan.classList.add('tag');
            tagSpan.textContent = tagText;
            tagsContainer.appendChild(tagSpan);
        });

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('task-timestamp');
        timestampSpan.textContent = task.timestamp;

        taskFooter.appendChild(tagsContainer);
        taskFooter.appendChild(timestampSpan);

        li.appendChild(taskFooter);

        return li;
    }

    function toggleTaskCompleted(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveTasksToLocalStorage();
            renderTasks(); // Re-renderizar para actualizar la vista de pendientes
        }
    }

    function toggleTaskPinned(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.pinned = !task.pinned;
            saveTasksToLocalStorage();
            renderTasks();
        }
    }

    function deleteTask(id) {
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        if (taskItem) {
            taskItem.classList.add('removing');
            taskItem.addEventListener('animationend', () => {
                tasks = tasks.filter(t => t.id !== id);
                saveTasksToLocalStorage();
                renderTasks();
            });
        }
    }

    // Nota: La función editTask no se implementa aquí ya que no hay área de edición en Tareas.html
    // Si necesitas editar, tendrías que redirigir a index.html con el ID de la tarea.

    const errorMessageElement = document.querySelector('.error-message'); // Asumiendo que hay un error-message global para el modal
    function showErrorMessage(message, element = errorMessageElement) {
        if (element) {
            element.textContent = message;
            element.classList.add('show');
            setTimeout(() => {
                element.classList.remove('show');
            }, 3000);
        } else {
            console.error("Error message element not found.");
        }
    }

    function updatePendingTasksCount() {
        const pendingTasks = tasks.filter(task => !task.completed).length;
        pendingTasksCountSpan.textContent = pendingTasks;
    }

    function updateClearCompletedButtonVisibility() {
        const completedTasks = tasks.some(task => task.completed);
        if (completedTasks) {
            clearCompletedBtn.classList.remove('hidden');
        } else {
            clearCompletedBtn.classList.add('hidden');
        }
    }

    // En Tareas.html, los botones de filtro "Todas" y "Completadas" son enlaces a index.html
    // El botón "Pendientes" ya está activo por defecto y no necesita listener de click para cambiar filtro
    // No se necesitan listeners para filterButtons aquí, ya que la página siempre muestra pendientes

    searchInput.addEventListener('input', renderTasks);

    // Funciones del modal de alarma (copia de script.js)
    function openAlarmModal(taskId, taskText, currentAlarmDateTime = '') {
        currentAlarmTaskId = taskId;
        alarmNoteText.textContent = `Alarma para: "${taskText.length > 50 ? taskText.substring(0, 47) + '...' : taskText}"`;

        if (currentAlarmDateTime) {
            const date = new Date(currentAlarmDateTime);
            const formattedDate = date.getFullYear() + '-' +
                                 ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
                                 ('0' + date.getDate()).slice(-2) + 'T' +
                                 ('0' + date.getMinutes()).slice(-2);
            alarmDatetimePicker.value = formattedDate;
        } else {
            const now = new Date();
            now.setHours(now.getHours() + 1);
            const futureDate = now.getFullYear() + '-' +
                               ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
                               ('0' + now.getDate()).slice(-2) + 'T' +
                               ('0' + now.getHours()).slice(-2) + ':' +
                               ('0' + now.getMinutes()).slice(-2);
            alarmDatetimePicker.value = futureDate;
        }

        alarmModal.classList.add('show');
    }

    closeAlarmModalBtn.addEventListener('click', () => {
        alarmModal.classList.remove('show');
        alarmDatetimePicker.value = '';
        currentAlarmTaskId = null;
    });

    setAlarmBtn.addEventListener('click', () => {
        const datetimeValue = alarmDatetimePicker.value;
        if (!datetimeValue) {
            showErrorMessage('Por favor, selecciona una fecha y hora para la alarma.', alarmModal.querySelector('.error-message') || document.querySelector('.error-message'));
            return;
        }

        const alarmTime = new Date(datetimeValue).getTime();
        const currentTime = new Date().getTime();

        if (alarmTime <= currentTime) {
            showErrorMessage('La fecha y hora de la alarma debe ser en el futuro.', alarmModal.querySelector('.error-message') || document.querySelector('.error-message'));
            return;
        }

        const taskIndex = tasks.findIndex(t => t.id === currentAlarmTaskId);
        if (taskIndex !== -1) {
            const task = tasks[taskIndex];

            if (task.alarm && task.alarm.notificationId) {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        action: 'cancelAlarm',
                        notificationId: task.alarm.notificationId
                    });
                }
            }

            const notificationId = currentAlarmTaskId + '_' + Date.now();
            task.alarm = {
                datetime: datetimeValue,
                notificationId: notificationId
            };

            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'scheduleAlarm',
                    task: {
                        id: task.id,
                        text: task.text,
                        datetime: task.alarm.datetime,
                        notificationId: task.alarm.notificationId
                    }
                });
            }
            saveTasksToLocalStorage();
            renderTasks();
        }

        alarmModal.classList.remove('show');
        alarmDatetimePicker.value = '';
        currentAlarmTaskId = null;
    });

    clearCompletedBtn.addEventListener('click', () => {
        tasks = tasks.filter(task => !task.completed);
        saveTasksToLocalStorage();
        renderTasks();
        showErrorMessage('Tareas completadas eliminadas.');
    });

    // Cargar tareas al iniciar la página de pendientes
    loadTasksFromLocalStorage();
});
