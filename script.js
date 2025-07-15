document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');

    // --- Funciones para manejar LocalStorage ---

    // Guarda las tareas en LocalStorage
    // Las tareas se guardarán como un array de objetos:
    // [{ text: "Mi tarea 1", completed: false }, { text: "Mi tarea 2", completed: true }]
    function saveTasksToLocalStorage() {
        const tasks = [];
        // Itera sobre cada elemento <li> en la lista de tareas
        taskList.querySelectorAll('li').forEach(listItem => {
            tasks.push({
                text: listItem.firstChild.textContent, // El texto de la tarea
                completed: listItem.classList.contains('completed') // Si tiene la clase 'completed'
            });
        });
        // Convierte el array de objetos a una cadena JSON y lo guarda
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Carga las tareas desde LocalStorage al iniciar la aplicación
    function loadTasksFromLocalStorage() {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]'); // Obtiene las tareas o un array vacío si no hay
        tasks.forEach(task => {
            createTaskElement(task.text, task.completed); // Crea el elemento HTML para cada tarea cargada
        });
    }

    // --- Función para crear un elemento de tarea (refactorizada) ---
    function createTaskElement(taskText, isCompleted = false) {
        const listItem = document.createElement('li');
        listItem.textContent = taskText;

        if (isCompleted) {
            listItem.classList.add('completed');
        }

        // Botón para eliminar tarea
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Evita que el clic se propague al listItem y lo marque/desmarque
            taskList.removeChild(listItem);
            saveTasksToLocalStorage(); // Guarda los cambios después de eliminar
        });

        listItem.appendChild(deleteBtn);

        // Marcar tarea como completada (clic en la tarea)
        listItem.addEventListener('click', () => {
            listItem.classList.toggle('completed'); // Alterna la clase 'completed'
            saveTasksToLocalStorage(); // Guarda los cambios después de marcar/desmarcar
        });

        taskList.appendChild(listItem);
    }

    // --- Lógica para añadir una nueva tarea ---
    function addTask() {
        const taskText = newTaskInput.value.trim();

        if (taskText !== '') {
            createTaskElement(taskText); // Crea el elemento de la tarea
            saveTasksToLocalStorage(); // Guarda la nueva tarea
            newTaskInput.value = ''; // Limpia el input
        }
    }

    // --- Event Listeners ---
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

    // --- Cargar tareas al iniciar la aplicación ---
    loadTasksFromLocalStorage();
});