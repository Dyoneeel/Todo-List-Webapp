document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const itemsLeft = document.getElementById('items-left');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const themeToggle = document.getElementById('theme-toggle');
    const doodleDeco = document.querySelector('.doodle-decoration');

    let todos = [];
    let currentFilter = 'all';
    
    // Initialize the theme
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Toggle theme function
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

     // Create bubble function
     function createBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        // Random size between 20px and 80px
        const size = Math.random() * 60 + 20;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        // Random position within viewport
        const maxX = window.innerWidth - size;
        const maxY = window.innerHeight - size;
        bubble.style.left = `${Math.random() * maxX}px`;
        bubble.style.top = `${Math.random() * maxY}px`;
        
        // Random color
        const colors = [
            'var(--bubble-color-1)',
            'var(--bubble-color-2)',
            'var(--bubble-color-3)'
        ];
        bubble.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random animation duration
        const animDuration = Math.random() * 10 + 10;
        bubble.style.animationDuration = `${animDuration}s`;
        
        // Random delay
        const animDelay = Math.random() * 5;
        bubble.style.animationDelay = `-${animDelay}s`;
        
        // Click event to pop the bubble
        bubble.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Pop animation and remove
            bubble.style.animation = 'pop 0.5s ease-out forwards';
            bubble.style.pointerEvents = 'none';
            setTimeout(() => {
                bubble.remove();
                // Create a new bubble to replace the popped one
                setTimeout(createBubble, Math.random() * 1000);
            }, 500);
        });
        
        doodleDeco.appendChild(bubble);
    }
    
    // Initialize bubbles
    function initBubbles() {
        // Create 15 bubbles initially
        for (let i = 0; i < 15; i++) {
            setTimeout(createBubble, i * 200);
        }
    }
    

    // Initialize the app
    async function init() {
        initTheme(); // Initialize theme before rendering UI
        initBubbles(); // Initialize bubbles
        await fetchTodos();
        renderTodos();
        updateItemsLeft();
        
        addBtn.addEventListener('click', addTodo);
        todoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTodo();
        });
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderTodos();
            });
        });
        
        clearCompletedBtn.addEventListener('click', clearCompleted);
        
        // Add theme toggle event listener
        themeToggle.addEventListener('click', toggleTheme);
        
        // Window resize event to adjust bubbles
        window.addEventListener('resize', adjustBubbles);
    }
    
    // Adjust bubbles on window resize
    function adjustBubbles() {
        const bubbles = document.querySelectorAll('.bubble');
        const maxX = window.innerWidth;
        const maxY = window.innerHeight;
        
        bubbles.forEach(bubble => {
            const size = parseInt(bubble.style.width);
            const x = parseInt(bubble.style.left);
            const y = parseInt(bubble.style.top);
            
            if (x > maxX - size) {
                bubble.style.left = `${maxX - size - 10}px`;
            }
            
            if (y > maxY - size) {
                bubble.style.top = `${maxY - size - 10}px`;
            }
        });
    }

    // Fetch todos from backend
    async function fetchTodos() {
        try {
            const response = await fetch('/tasks');
            if (!response.ok) throw new Error('Network response was not ok');
            todos = await response.json();
        } catch (error) {
            console.error('Error fetching todos:', error);
            // Fallback to empty array if fetching fails
            todos = [];
        }
    }
    
    // Format timestamp
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Add a new todo
    async function addTodo() {
        const text = todoInput.value.trim();
        if (text !== '') {
            try {
                const response = await fetch('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_name: text })
                });
                
                if (!response.ok) throw new Error('Failed to add task');
                
                const newTask = await response.json();
                todos.unshift(newTask);
                todoInput.value = '';
                renderTodos();
                updateItemsLeft();
            } catch (error) {
                console.error('Error adding todo:', error);
            }
        }
    }
    
    // Render todos based on current filter
    function renderTodos() {
        todoList.innerHTML = '';
        
        const filteredTodos = todos.filter(todo => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'active') return !todo.status;
            if (currentFilter === 'completed') return todo.status;
            return true;
        });
        
        if (filteredTodos.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = currentFilter === 'all' ? 'No tasks yet' : 
                                     currentFilter === 'active' ? 'No active tasks' : 'No completed tasks';
            emptyMessage.classList.add('empty-message');
            todoList.appendChild(emptyMessage);
        } else {
            filteredTodos.forEach(todo => {
                const todoItem = document.createElement('li');
                todoItem.className = `todo-item ${todo.status ? 'completed' : ''}`;
                todoItem.dataset.id = todo.id;
                
                todoItem.innerHTML = `
                    <div class="todo-content">
                        <input type="checkbox" class="todo-check" ${todo.status ? 'checked' : ''}>
                        <span class="todo-text">${todo.task_name}</span>
                        <div class="todo-actions">
                            <button class="edit-btn"><i class="fas fa-pencil-alt"></i></button>
                            <button class="delete-btn"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="todo-timestamp">${formatTimestamp(todo.created_at)}</div>
                `;
                
                const checkbox = todoItem.querySelector('.todo-check');
                const deleteBtn = todoItem.querySelector('.delete-btn');
                const editBtn = todoItem.querySelector('.edit-btn');
                const todoText = todoItem.querySelector('.todo-text');
                
                checkbox.addEventListener('change', () => toggleComplete(todo.id));
                deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
                editBtn.addEventListener('click', () => editTodo(todo.id, todoText));
                todoText.addEventListener('dblclick', () => {
                    setTimeout(() => {
                        editTodo(todo.id, todoText);
                    }, 50);
                });
                
                todoList.appendChild(todoItem);
            });
        }
    }

    // Toggle todo completion status
    async function toggleComplete(id) {
        try {
            const todo = todos.find(t => t.id === id);
            const response = await fetch(`/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_name: todo.task_name,
                    description: todo.description || '',
                    status: todo.status ? 0 : 1
                })
            });
            
            if (!response.ok) throw new Error('Failed to update task');
            
            const updatedTask = await response.json();
            todos = todos.map(t => t.id === id ? updatedTask : t);
            renderTodos();
            updateItemsLeft();
        } catch (error) {
            console.error('Error toggling complete:', error);
        }
    }
    
    // Delete a todo
    async function deleteTodo(id) {
        try {
            const response = await fetch(`/tasks/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete task');
            
            todos = todos.filter(todo => todo.id !== id);
            renderTodos();
            updateItemsLeft();
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }
    
    // Edit todo text
    async function editTodo(id, todoTextElement) {
        const todoItem = todoTextElement.closest('.todo-item');
        todoItem.classList.add('editing');
        
        const currentText = todoTextElement.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'edit-input';
        
        todoTextElement.replaceWith(input);
        input.focus();
        input.select();
        
        const saveEdit = async () => {
            const newText = input.value.trim();
            
            if (newText && newText !== currentText) {
                try {
                    const todo = todos.find(t => t.id === id);
                    const response = await fetch(`/tasks/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            task_name: newText,
                            description: todo.description || '',
                            status: todo.status
                        })
                    });
                    
                    if (!response.ok) throw new Error('Failed to update task');
                    
                    const updatedTask = await response.json();
                    todos = todos.map(t => t.id === id ? updatedTask : t);
                    renderTodos();
                } catch (error) {
                    console.error('Error updating todo:', error);
                    renderTodos();
                }
            } else {
                renderTodos();
            }
        };
        
        const cancelEdit = () => {
            renderTodos();
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });
    }
    
    // Clear all completed todos
    async function clearCompleted() {
        try {
            await Promise.all(
                todos.filter(todo => todo.status)
                     .map(todo => fetch(`/tasks/${todo.id}`, { method: 'DELETE' }))
            );
            
            await fetchTodos();
            renderTodos();
            updateItemsLeft();
        } catch (error) {
            console.error('Error clearing completed:', error);
        }
    }
    
    // Update the items left counter
    function updateItemsLeft() {
        const activeTodos = todos.filter(todo => !todo.status).length;
        itemsLeft.textContent = `${activeTodos} ${activeTodos === 1 ? 'task' : 'tasks'} left`;
    }
    
    // Initialize the app
    init();
});