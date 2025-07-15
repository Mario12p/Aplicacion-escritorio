document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');

    // Función para añadir una nueva tarea
    function addTask() {
        const taskText = newTaskInput.value.trim(); // .trim() elimina espacios en blanco al inicio/final

        if (taskText !== '') { // Asegúrate de que el campo no esté vacío
            const listItem = document.createElement('li');
            listItem.textContent = taskText;

            // Botón para eliminar tarea
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.addEventListener('click', () => {
                taskList.removeChild(listItem);
            });

            listItem.appendChild(deleteBtn);

            // Marcar tarea como completada (clic en la tarea)
            listItem.addEventListener('click', () => {
                listItem.classList.toggle('completed'); // Alterna la clase 'completed'
            });

            taskList.appendChild(listItem);
            newTaskInput.value = ''; // Limpia el input después de añadir
        }
    }

    // Añadir tarea al hacer clic en el botón
    addTaskBtn.addEventListener('click', addTask);

    // Añadir tarea al presionar Enter en el input
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
                    // Opcional: Notificar al usuario que la app está lista para instalar/offline
                    // Si quieres una notificación de "instalar app", se suele manejar
                    // con un evento beforeinstallprompt
                })
                .catch(err => console.error('Error al registrar el Service Worker:', err));
        });
    }
});