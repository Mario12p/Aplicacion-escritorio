document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');

    // --- NUEVAS REFERENCIAS A LOS BOTONES DE FILTRO ---
    const filterAllBtn = document.getElementById('filter-all');
    const filterPendingBtn = document.getElementById('filter-pending');
    const filterCompletedBtn = document.getElementById('filter-completed');

    let currentFilter = 'all'; // Estado inicial del filtro

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
    }

    function loadTasksFromLocalStorage() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        taskList.innerHTML = ''; // Limpiar la lista antes de cargar
        tasks.forEach(task => {
            createTaskElement(task.text, task.completed);
        });
        applyFilter(currentFilter); // Aplicar el filtro después de cargar las tareas
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
            taskList.removeChild(listItem);
            saveTasksToLocalStorage();
            applyFilter(currentFilter); // Reaplicar el filtro después de eliminar
        });

        listItem.appendChild(deleteBtn);

        listItem.addEventListener('click', () => {
            listItem.classList.toggle('completed');
            saveTasksToLocalStorage();
            applyFilter(currentFilter); // Reaplicar el filtro después de marcar/desmarcar
        });

        taskList.appendChild(listItem);
    }

    // --- NUEVA FUNCIÓN PARA APLICAR EL FILTRO ---
    function applyFilter(filter) {
        currentFilter = filter; // Actualiza el filtro activo

        // Actualiza la clase 'active' en los botones de filtro
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

        // Itera sobre cada tarea y decide si mostrarla u ocultarla
        taskList.querySelectorAll('li').forEach(listItem => {
            const isCompleted = listItem.classList.contains('completed');

            if (filter === 'all') {
                listItem.style.display = 'flex'; // Muestra todas las tareas
            } else if (filter === 'pending') {
                if (!isCompleted) {
                    listItem.style.display = 'flex'; // Muestra solo las pendientes
                } else {
                    listItem.style.display = 'none'; // Oculta las completadas
                }
            } else if (filter === 'completed') {
                if (isCompleted) {
                    listItem.style.display = 'flex'; // Muestra solo las completadas
                } else {
                    listItem.style.display = 'none'; // Oculta las pendientes
                }
            }
        });
    }

    // --- Event Listeners para los botones de filtro ---
    filterAllBtn.addEventListener('click', () => applyFilter('all'));
    filterPendingBtn.addEventListener('click', () => applyFilter('pending'));
    filterCompletedBtn.addEventListener('click', () => applyFilter('completed'));


    // --- Lógica para añadir una nueva tarea ---
    function addTask() {
        const taskText = newTaskInput.value.trim();

        if (taskText !== '') {
            createTaskElement(taskText);
            saveTasksToLocalStorage();
            applyFilter(currentFilter); // Reaplicar el filtro para que la nueva tarea aparezca si cumple el criterio
            newTaskInput.value = '';
        }
    }

    // --- Event Listeners existentes ---
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

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

    // --- Cargar tareas al iniciar la aplicación (ahora llama a applyFilter al final) ---
    loadTasksFromLocalStorage();
});