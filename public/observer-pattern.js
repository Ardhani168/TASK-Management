/**
 * Day 2: Observer Pattern Implementation
 * Event system for decoupled communication between components
 */

/**
 * Event Emitter - Core observer pattern implementation
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event is emitted
     * @param {Object} context - Optional context for the callback
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, context = null) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listener = { callback, context };
        this.events.get(eventName).push(listener);

        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Subscribe to an event that will only fire once
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call when event is emitted
     * @param {Object} context - Optional context for the callback
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback, context = null) {
        const onceWrapper = (...args) => {
            callback.apply(context, args);
            this.off(eventName, onceWrapper);
        };

        return this.on(eventName, onceWrapper, context);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to remove
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) {
            return;
        }

        const listeners = this.events.get(eventName);
        const index = listeners.findIndex(listener => listener.callback === callback);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }

        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventName - Name of the event
     * @param {...*} args - Arguments to pass to callbacks
     */
    emit(eventName, ...args) {
        if (!this.events.has(eventName)) {
            return;
        }

        const listeners = this.events.get(eventName).slice(); // Copy to avoid issues if listeners are modified during emission
        
        listeners.forEach(listener => {
            try {
                listener.callback.apply(listener.context, args);
            } catch (error) {
                console.error(`Error in event listener for '${eventName}':`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event, or all events if no event specified
     * @param {string} eventName - Optional event name to clear
     */
    removeAllListeners(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get the number of listeners for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Get all event names that have listeners
     * @returns {Array} Array of event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
}

/**
 * Task Events - Specific events for task management
 */
class TaskEvents extends EventEmitter {
    constructor() {
        super();
        
        // Define event constants to avoid typos
        this.EVENTS = {
            TASK_CREATED: 'task:created',
            TASK_UPDATED: 'task:updated',
            TASK_DELETED: 'task:deleted',
            TASK_COMPLETED: 'task:completed',
            TASK_UNCOMPLETED: 'task:uncompleted',
            TASKS_LOADED: 'tasks:loaded',
            TASKS_FILTERED: 'tasks:filtered',
            TASKS_SEARCHED: 'tasks:searched',
            VALIDATION_ERROR: 'validation:error',
            STORAGE_ERROR: 'storage:error',
            UI_UPDATE_REQUIRED: 'ui:update-required'
        };
    }

    // Convenience methods for common events
    onTaskCreated(callback, context) {
        return this.on(this.EVENTS.TASK_CREATED, callback, context);
    }

    onTaskUpdated(callback, context) {
        return this.on(this.EVENTS.TASK_UPDATED, callback, context);
    }

    onTaskDeleted(callback, context) {
        return this.on(this.EVENTS.TASK_DELETED, callback, context);
    }

    onTaskCompleted(callback, context) {
        return this.on(this.EVENTS.TASK_COMPLETED, callback, context);
    }

    onValidationError(callback, context) {
        return this.on(this.EVENTS.VALIDATION_ERROR, callback, context);
    }

    onStorageError(callback, context) {
        return this.on(this.EVENTS.STORAGE_ERROR, callback, context);
    }

    onUIUpdateRequired(callback, context) {
        return this.on(this.EVENTS.UI_UPDATE_REQUIRED, callback, context);
    }

    // Convenience methods for emitting events
    emitTaskCreated(task) {
        this.emit(this.EVENTS.TASK_CREATED, task);
        this.emit(this.EVENTS.UI_UPDATE_REQUIRED, 'task_created', task);
    }

    emitTaskUpdated(task, oldTask) {
        this.emit(this.EVENTS.TASK_UPDATED, task, oldTask);
        this.emit(this.EVENTS.UI_UPDATE_REQUIRED, 'task_updated', task);
    }

    emitTaskDeleted(taskId, deletedTask) {
        this.emit(this.EVENTS.TASK_DELETED, taskId, deletedTask);
        this.emit(this.EVENTS.UI_UPDATE_REQUIRED, 'task_deleted', taskId);
    }

    emitTaskCompleted(task) {
        this.emit(this.EVENTS.TASK_COMPLETED, task);
        this.emit(this.EVENTS.UI_UPDATE_REQUIRED, 'task_completed', task);
    }

    emitTaskUncompleted(task) {
        this.emit(this.EVENTS.TASK_UNCOMPLETED, task);
        this.emit(this.EVENTS.UI_UPDATE_REQUIRED, 'task_uncompleted', task);
    }

    emitValidationError(errors, field) {
        this.emit(this.EVENTS.VALIDATION_ERROR, errors, field);
    }

    emitStorageError(error, operation) {
        this.emit(this.EVENTS.STORAGE_ERROR, error, operation);
    }
}

/**
 * Observable Task Manager - Task manager with event emission
 */
class ObservableTaskManager {
    constructor(events = new TaskEvents()) {
        this.events = events;
        this.tasks = [];
        this.validator = new TaskValidator(); // Assuming TaskValidator is available
        
        // Load tasks on initialization
        this.loadTasks();
    }

    /**
     * Create a new task with event emission
     */
    createTask(taskData) {
        try {
            // Validate the task data
            const validation = this.validator.validateTask(taskData);
            
            if (!validation.isValid) {
                this.events.emitValidationError(validation.errors, 'task_creation');
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            // Create the task with sanitized data
            const task = new Task(
                validation.sanitizedData.title,
                validation.sanitizedData.description,
                validation.sanitizedData.priority,
                validation.sanitizedData.dueDate
            );

            // Add to tasks array
            this.tasks.unshift(task);
            
            // Save to storage
            this.saveTasks();
            
            // Emit event
            this.events.emitTaskCreated(task);
            
            return task;
        } catch (error) {
            this.events.emitStorageError(error, 'create_task');
            throw error;
        }
    }

    /**
     * Update a task with event emission
     */
    updateTask(taskId, updates) {
        try {
            const task = this.getTaskById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            // Keep a copy of the old task for the event
            const oldTask = { ...task };

            // Validate updates
            const validation = this.validator.validateTaskUpdate(updates);
            
            if (!validation.isValid) {
                this.events.emitValidationError(validation.errors, 'task_update');
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            // Update the task
            task.update(validation.sanitizedData);
            
            // Save to storage
            this.saveTasks();
            
            // Emit event
            this.events.emitTaskUpdated(task, oldTask);
            
            return task;
        } catch (error) {
            this.events.emitStorageError(error, 'update_task');
            throw error;
        }
    }

    /**
     * Delete a task with event emission
     */
    deleteTask(taskId) {
        try {
            const index = this.tasks.findIndex(task => task.id === taskId);
            if (index === -1) {
                throw new Error('Task not found');
            }

            const deletedTask = this.tasks.splice(index, 1)[0];
            
            // Save to storage
            this.saveTasks();
            
            // Emit event
            this.events.emitTaskDeleted(taskId, deletedTask);
            
            return deletedTask;
        } catch (error) {
            this.events.emitStorageError(error, 'delete_task');
            throw error;
        }
    }

    /**
     * Toggle task completion with event emission
     */
    toggleTaskCompletion(taskId) {
        try {
            const task = this.getTaskById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            const wasCompleted = task.completed;
            task.toggleComplete();
            
            // Save to storage
            this.saveTasks();
            
            // Emit appropriate event
            if (task.completed && !wasCompleted) {
                this.events.emitTaskCompleted(task);
            } else if (!task.completed && wasCompleted) {
                this.events.emitTaskUncompleted(task);
            }
            
            return task;
        } catch (error) {
            this.events.emitStorageError(error, 'toggle_task');
            throw error;
        }
    }

    /**
     * Get task by ID
     */
    getTaskById(taskId) {
        return this.tasks.find(task => task.id === taskId);
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        return [...this.tasks];
    }

    /**
     * Get filtered tasks with event emission
     */
    getFilteredTasks(filters) {
        let filtered = [...this.tasks];

        // Apply filters
        if (filters.status === 'completed') {
            filtered = filtered.filter(task => task.completed);
        } else if (filters.status === 'incomplete') {
            filtered = filtered.filter(task => !task.completed);
        }

        if (filters.priority && filters.priority !== 'all') {
            filtered = filtered.filter(task => task.priority === filters.priority);
        }

        if (filters.search) {
            const query = filters.search.toLowerCase();
            filtered = filtered.filter(task => 
                task.title.toLowerCase().includes(query) || 
                task.description.toLowerCase().includes(query)
            );
        }

        // Sort by priority and creation date
        filtered.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;

            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }

            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Emit filter event
        this.events.emit(this.events.EVENTS.TASKS_FILTERED, filtered, filters);

        return filtered;
    }

    /**
     * Save tasks to storage
     */
    saveTasks() {
        try {
            const tasksData = this.tasks.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                dueDate: task.dueDate,
                completed: task.completed,
                createdAt: task.createdAt.toISOString(),
                completedAt: task.completedAt ? task.completedAt.toISOString() : null,
                updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null
            }));
            
            localStorage.setItem('observableTasks', JSON.stringify(tasksData));
        } catch (error) {
            this.events.emitStorageError(error, 'save_tasks');
            throw error;
        }
    }

    /**
     * Load tasks from storage
     */
    loadTasks() {
        try {
            const savedData = localStorage.getItem('observableTasks');
            if (!savedData) {
                this.events.emit(this.events.EVENTS.TASKS_LOADED, []);
                return;
            }

            const tasksData = JSON.parse(savedData);
            this.tasks = tasksData.map(data => {
                const task = new Task(data.title, data.description, data.priority, data.dueDate);
                task.id = data.id;
                task.completed = data.completed;
                task.createdAt = new Date(data.createdAt);
                task.completedAt = data.completedAt ? new Date(data.completedAt) : null;
                task.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
                return task;
            });

            this.events.emit(this.events.EVENTS.TASKS_LOADED, this.tasks);
        } catch (error) {
            this.events.emitStorageError(error, 'load_tasks');
            this.tasks = [];
        }
    }

    /**
     * Get task statistics
     */
    getStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const incomplete = total - completed;
        const overdue = this.tasks.filter(task => task.isOverdue && task.isOverdue()).length;

        return { total, completed, incomplete, overdue };
    }
}

// Example usage:
/*
// Create event system
const taskEvents = new TaskEvents();

// Create observable task manager
const taskManager = new ObservableTaskManager(taskEvents);

// Subscribe to events
taskEvents.onTaskCreated((task) => {
    console.log('New task created:', task.title);
});

taskEvents.onTaskCompleted((task) => {
    console.log('Task completed:', task.title);
});

taskEvents.onValidationError((errors) => {
    console.log('Validation errors:', errors);
});

// Create a task (will emit events)
try {
    const task = taskManager.createTask({
        title: 'Learn Observer Pattern',
        description: 'Understand how to implement observer pattern in JavaScript',
        priority: 'high'
    });
} catch (error) {
    console.error('Failed to create task:', error.message);
}
*/