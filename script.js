document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');

    const filterAllBtn = document.getElementById('filter-all');
    const filterPendingBtn = document.getElementById('filter-pending');
    const filterCompletedBtn = document.getElementById('filter-completed');

    // --- NUEVO ---
    const pendingTasksCountSpan = document.getElementById('pending-tasks-count');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');
    // Nuevo elemento para mostrar mensajes de error/feedback
    const errorMessageDiv = document.createElement('div');
    errorMessageDiv.classList.add('error-message');
    errorMessageDiv.textContent = '¡Por favor, escribe una tarea!';
    // Insertarlo justo debajo del input/botón añadir
    addTaskBtn.parentNode.after(errorMessageDiv);
    // --- FIN NUEVO ---

    let currentFilter = 'all';

    // --- Funciones para manejar LocalStorage ---
    function saveTasksToLocalStorage() {
        const tasks = [];
        taskList.querySelectorAll('li').forEach(listItem => {
            tasks.push({
                text: listItem.firstChild.textContent,
                completed: listItem.classList.contains('completed')
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updatePendingTasksCount(); // --- NUEVO: Actualizar contador al guardar ---
    }

    function loadTasksFromLocalStorage() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        taskList.innerHTML = '';
        tasks.forEach(task => {
            createTaskElement(task.text, task.completed);
        });
        applyFilter(currentFilter);
        updatePendingTasksCount(); // --- NUEVO: Actualizar contador al cargar ---
    }

    // --- Función para crear un elemento de tarea ---
    function createTaskElement(taskText, isCompleted = false) {
        const listItem = document.createElement('li');
        listItem.textContent = taskText;

        if (isCompleted) {
            listItem.classList.add('completed');
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            // --- NUEVO: Animación de salida antes de eliminar ---
            listItem.classList.add('removing'); // Añade clase para la animación de salida
            listItem.addEventListener('animationend', () => { // Espera a que termine la animación
                taskList.removeChild(listItem);
                saveTasksToLocalStorage();
                applyFilter(currentFilter);
            }, { once: true }); // Para que el listener se ejecute una sola vez
            // --- FIN NUEVO ---
        });

        listItem.appendChild(deleteBtn);

        listItem.addEventListener('click', () => {
            listItem.classList.toggle('completed');
            saveTasksToLocalStorage();
            applyFilter(currentFilter);
        });

        taskList.appendChild(listItem);
    }

    // --- Función para aplicar el filtro ---
    function applyFilter(filter) {
        currentFilter = filter;

        filterAllBtn.classList.remove('active');
        filterPendingBtn.classList.remove('active');
        filterCompletedBtn.classList.remove('active');

        if (filter === 'all') {
            filterAllBtn.classList.add('active');
        } else if (filter === 'pending') {
            filterPendingBtn.classList.add('active');
        } else if (filter === 'completed') {
            filterCompletedBtn.classList.add('active');
        }

        taskList.querySelectorAll('li').forEach(listItem => {
            const isCompleted = listItem.classList.contains('completed');

            if (filter === 'all') {
                listItem.style.display = 'flex';
            } else if (filter === 'pending') {
                if (!isCompleted) {
                    listItem.style.display = 'flex';
                } else {
                    listItem.style.display = 'none';
                }
            } else if (filter === 'completed') {
                if (isCompleted) {
                    listItem.style.display = 'flex';
                } else {
                    listItem.style.display = 'none';
                }
            }
        });
        updatePendingTasksCount(); // --- NUEVO: Actualizar contador al aplicar filtro ---
    }

    // --- NUEVO: Función para actualizar el contador de tareas pendientes ---
    function updatePendingTasksCount() {
        const pendingTasks = Array.from(taskList.querySelectorAll('li')).filter(task => !task.classList.contains('completed'));
        pendingTasksCountSpan.textContent = pendingTasks.length;

        // Ocultar/mostrar el botón "Limpiar completadas"
        const completedTasks = Array.from(taskList.querySelectorAll('li')).filter(task => task.classList.contains('completed'));
        if (completedTasks.length > 0) {
            clearCompletedBtn.style.display = 'inline-block'; // O 'block', 'flex' dependiendo del diseño
        } else {
            clearCompletedBtn.style.display = 'none';
        }
    }

    // --- NUEVO: Función para limpiar tareas completadas ---
    function clearCompletedTasks() {
        // Filtra las tareas que NO estén completadas
        const incompleteTasks = Array.from(taskList.querySelectorAll('li')).filter(task => !task.classList.contains('completed'));

        // Elimina todos los elementos de la lista actual
        taskList.innerHTML = '';

        // Vuelve a añadir solo las tareas incompletas
        incompleteTasks.forEach(task => taskList.appendChild(task));

        saveTasksToLocalStorage(); // Guarda el nuevo estado sin las tareas completadas
        applyFilter(currentFilter); // Reaplicar el filtro
    }

    // --- Lógica para añadir una nueva tarea ---
    function addTask() {
        const taskText = newTaskInput.value.trim();

        if (taskText !== '') {
            createTaskElement(taskText);
            saveTasksToLocalStorage();
            applyFilter(currentFilter);
            newTaskInput.value = '';
            // --- NUEVO: Ocultar mensaje de error si estaba visible ---
            errorMessageDiv.classList.remove('show');
        } else {
            // --- NUEVO: Mostrar mensaje de error si el input está vacío ---
            errorMessageDiv.classList.add('show');
            newTaskInput.focus(); // Enfocar el input para que el usuario escriba
        }
    }

    // --- Event Listeners ---
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    // --- NUEVO: Event listener para el botón "Limpiar completadas" ---
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // --- Configuración del Service Worker para PWA (para offline y "instalación") ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => {
                    console.log('Service Worker registrado con éxito:', reg);
                })
                .catch(err => console.error('Error al registrar el Service Worker:', err));
        });
    }

    // --- Cargar tareas al iniciar la aplicación ---
    loadTasksFromLocalStorage();
});