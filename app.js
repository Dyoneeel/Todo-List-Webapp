const express = require('express');
const mysql = require('mysql');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todojonel',
    timezone: 'UTC'
});

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database');
    connection.release();
});

// Helper function for database queries
const queryDB = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all tasks
app.get('/tasks', async (req, res) => {
    try {
        const tasks = await queryDB('SELECT * FROM task ORDER BY priority, created_at DESC');
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Add new task
app.post('/tasks', async (req, res) => {
    try {
        const { task_name, priority = 2 } = req.body;
        
        if (!task_name) {
            return res.status(400).json({ error: 'Task name is required' });
        }

        if (priority < 1 || priority > 3) {
            return res.status(400).json({ error: 'Priority must be between 1 and 3' });
        }

        const result = await queryDB(
            'INSERT INTO task (task_name, priority) VALUES (?, ?)',
            [task_name, priority]
        );

        const [newTask] = await queryDB('SELECT * FROM task WHERE id = ?', [result.insertId]);
        res.status(201).json(newTask);
    } catch (err) {
        console.error('Error creating task:', err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
app.put('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { task_name, status, priority } = req.body;

        if (status !== undefined && ![0, 1].includes(status)) {
            return res.status(400).json({ error: 'Status must be 0 (incomplete) or 1 (complete)' });
        }

        if (priority !== undefined && (priority < 1 || priority > 3)) {
            return res.status(400).json({ error: 'Priority must be between 1 and 3' });
        }

        const fieldsToUpdate = [];
        const values = [];

        if (task_name !== undefined) {
            fieldsToUpdate.push('task_name = ?');
            values.push(task_name);
        }
        if (status !== undefined) {
            fieldsToUpdate.push('status = ?');
            values.push(status);
        }
        if (priority !== undefined) {
            fieldsToUpdate.push('priority = ?');
            values.push(priority);
        }

        if (fieldsToUpdate.length === 0) {
            const [currentTask] = await queryDB('SELECT * FROM task WHERE id = ?', [id]);
            return res.json(currentTask);
        }

        values.push(id);
        await queryDB(
            `UPDATE task SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
            values
        );

        const [updatedTask] = await queryDB('SELECT * FROM task WHERE id = ?', [id]);
        res.json(updatedTask);
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Toggle task status
app.patch('/tasks/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        await queryDB('UPDATE task SET status = NOT status WHERE id = ?', [id]);
        const [updatedTask] = await queryDB('SELECT * FROM task WHERE id = ?', [id]);
        res.json(updatedTask);
    } catch (err) {
        console.error('Error toggling task status:', err);
        res.status(500).json({ error: 'Failed to toggle task status' });
    }
});

// Delete task
app.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await queryDB('DELETE FROM task WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});