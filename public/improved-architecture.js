/**
 * Day 2: Improved Architecture
 * Better code organization with separation of concerns and design patterns
 */

/**
 * Application Configuration
 */
const AppConfig = {
    STORAGE_KEY: 'taskManager_v2',
    MAX_TITLE_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    DEBOUNCE_DELAY: 300,
    VALIDATION_DELAY: 200,
    AUTO_SAVE_DELAY: 1000
};

/**
 * Enhanced Task Model with better encapsulation
 */
class EnhancedTask {
    constructor(title, description = '', priority = 'medium', dueDate = null) {
        this._id = this._generateId();
        this._title = title.trim();
        this._description = description.trim();
        this._priority = priority;
        this._dueDate = dueDate;
        this._completed = false;
        this._createdAt = new Date();
        this._completedAt = null;
        this._updatedAt = new Date();
        this._type = 'basic';
        this._metadata = {};
    }

    // Getters
    get id() { return this._id; }
    get title() { return this._title; }
    get description() { return this._description; }
    get priority() { return this._priority; }
    get dueDate() { return this._dueDate; }
    get completed() { return this._completed; }
    get createdAt() { return this._createdAt; }
    get completedAt() { return this._completedAt; }
    get updatedAt() { return this._updatedAt; }
    get type() { return this._type; }
    get metadata() { return { ...this._metadata }; }

    // Setters with validation
    set title(value) {
        if (!value || value.trim().length === 0) {
            throw new Error('Title cannot be empty');
        }
        this._title = value.trim();
        this._touch();
    }

    set description(value) {
        this._description = (value || '').trim();
        this._touch();
    }

    set priority(value) {
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(value)) {
            throw new Error('Invalid priority');
        }
        this._priority = value;
        this._touch();
    }

    set dueDate(value) {
        if (value && new Date(value) < new Date()) {
            throw new Error('Due date cannot be in the past');
        }
        this._dueDate = value;
        this._touch();
    }

    // Methods
    _generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    _touch() {
        this._updatedAt = new Date();
    }

    markComplete() {
        if (!this._completed) {
            this._completed = true;
            this._completedAt = new Date();
            this._touch();
        }
    }

    markIncomplete() {
        if (this._completed) {
            this._completed = false;
            this._completedAt = null;
            this._touch();
        }
    }

    toggleComplete() {
        if (this._completed) {
            this.markIncomplete();
        } else {
            this.markComplete();
        }
    }

    isOverdue() {
        if (!this._dueDate || this._completed) return false;
        return new Date(this._dueDate) < new Date();
    }

    update(updates) {
        const allowedUpdates = ['title', 'description', 'priority', 'dueDate'];
        
        for (const key in updates) {
            if (allowedUpdates.includes(key) && updates[key] !== undefined) {
                this[key] = updates[key];
            }
        }
    }

    setMetadata(key, value) {
        this._metadata[key] = value;
        this._touch();
    }

    getMetadata(key) {
        return this._metadata[key];
    }

    toJSON() {
        return {
            id: this._id,
            title: this._title,
            description: this._description,
            priority: this._priority,
            dueDate: this._dueDate,
            completed: this._completed,
            createdAt: this._createdAt.toISOString(),
            completedAt: this._completedAt ? this._completedAt.toISOString() : null,
            updatedAt: this._updatedAt.toISOString(),
            type: this._type,
            metadata: this._metadata
        };
    }

    static fromJSON(data) {
        const task = new EnhancedTask(data.title, data.description, data.priority, data.dueDate);
        task._id = data.id;
        task._completed = data.completed;
        task._createdAt = new Date(data.createdAt);
        task._completedAt = data.completedAt ? new Date(data.completedAt) : null;
        task._updatedAt = new Date(data.updatedAt);
        task._type = data.type || 'basic';
        task._metadata = data.metadata || {};
        return task;
    }
}

/**
 * Storage Service with better error handling
 */
class StorageService {
    constructor(storageKey = AppConfig.STORAGE_KEY) {
        this.storageKey = storageKey;
        this.isAvailable = this._checkAvailability();
    }

    _checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            console.warn('localStorage is not available:', error.message);
            return false;
        }
    }

    async save(data) {
        if (!this.isAvailable) {
            throw new Error('Storage is not available');
        }

        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(this.storageKey, serialized);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('Storage quota exceeded');
            }
            throw new Error('Failed to save data: ' + error.message);
        }
    }

    async load() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Failed to load data:', error.message);
            return null;
        }
    }

    async clear() {
        if (this.isAvailable) {
            localStorage.removeItem(this.storageKey);
        }
    }

    async backup() {
        const data = await this.load();
        if (data) {
            const backup = {
                data,
                timestamp: new Date().toISOString(),
                version: '2.0'
            };
            return JSON.stringify(backup, null, 2);
        }
        return null;
    }

    async restore(backupString) {
        try {
            const backup = JSON.parse(backupString);
            if (backup.data) {
                await this.save(backup.data);
                return true;
            }
            return false;
        } catch (error) {
            throw new Error('Invalid backup format');
        }
    }
}

/**
 * Enhanced Task Repository with better data management
 */
class TaskRepository {
    constructor(storageService, eventEmitter) {
        this.storage = storageService;
        this.events = eventEmitter;
        this.tasks = new Map();
        this.autoSaveTimer = null;
    }

    async initialize() {
        await this.loadTasks();
    }

    async loadTasks() {
        try {
            const data = await this.storage.load();
            if (data && Array.isArray(data)) {
                this.tasks.clear();
                data.forEach(taskData => {
                    const task = EnhancedTask.fromJSON(taskData);
                    this.tasks.set(task.id, task);
                });
                this.events.emit('tasks:loaded', Array.from(this.tasks.values()));
            }
        } catch (error) {
            this.events.emit('storage:error', error, 'load');
            throw error;
        }
    }

    async saveTasks() {
        try {
            const tasksArray = Array.from(this.tasks.values()).map(task => task.toJSON());
            await this.storage.save(tasksArray);
            this.events.emit('tasks:saved', tasksArray.length);
        } catch (error) {
            this.events.emit('storage:error', error, 'save');
            throw error;
        }
    }

    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(async () => {
            try {
                await this.saveTasks();
            } catch (error) {
                console.error('Auto-save failed:', error.message);
            }
        }, AppConfig.AUTO_SAVE_DELAY);
    }

    async addTask(task) {
        this.tasks.set(task.id, task);
        this.scheduleAutoSave();
        this.events.emit('task:added', task);
        return task;
    }

    async updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        const oldTask = { ...task.toJSON() };
        task.update(updates);
        
        this.scheduleAutoSave();
        this.events.emit('task:updated', task, oldTask);
        return task;
    }

    async deleteTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        this.tasks.delete(taskId);
        this.scheduleAutoSave();
        this.events.emit('task:deleted', taskId, task);
        return task;
    }

    async toggleTaskCompletion(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        const wasCompleted = task.completed;
        task.toggleComplete();
        
        this.scheduleAutoSave();
        
        if (task.completed && !wasCompleted) {
            this.events.emit('task:completed', task);
        } else if (!task.completed && wasCompleted) {
            this.events.emit('task:uncompleted', task);
        }
        
        return task;
    }

    getTask(taskId) {
        return this.tasks.get(taskId);
    }

    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    getTasksByFilter(filter) {
        let tasks = this.getAllTasks();

        if (filter.status === 'completed') {
            tasks = tasks.filter(task => task.completed);
        } else if (filter.status === 'incomplete') {
            tasks = tasks.filter(task => !task.completed);
        }

        if (filter.priority && filter.priority !== 'all') {
            tasks = tasks.filter(task => task.priority === filter.priority);
        }

        if (filter.search) {
            const query = filter.search.toLowerCase();
            tasks = tasks.filter(task => 
                task.title.toLowerCase().includes(query) || 
                task.description.toLowerCase().includes(query)
            );
        }

        if (filter.overdue) {
            tasks = tasks.filter(task => task.isOverdue());
        }

        return this.sortTasks(tasks, filter.sortBy);
    }

    sortTasks(tasks, sortBy = 'priority') {
        return tasks.sort((a, b) => {
            switch (sortBy) {
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    const aPriority = priorityOrder[a.priority] || 0;
                    const bPriority = priorityOrder[b.priority] || 0;
                    if (aPriority !== bPriority) {
                        return bPriority - aPriority;
                    }
                    return new Date(b.createdAt) - new Date(a.createdAt);
                
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                
                case 'updated':
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                
                case 'title':
                    return a.title.localeCompare(b.title);
                
                default:
                    return 0;
            }
        });
    }

    getStats() {
        const tasks = this.getAllTasks();
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const incomplete = total - completed;
        const overdue = tasks.filter(task => task.isOverdue()).length;
        const byPriority = {
            high: tasks.filter(task => task.priority === 'high').length,
            medium: tasks.filter(task => task.priority === 'medium').length,
            low: tasks.filter(task => task.priority === 'low').length
        };

        return { total, completed, incomplete, overdue, byPriority };
    }

    async backup() {
        return await this.storage.backup();
    }

    async restore(backupString) {
        await this.storage.restore(backupString);
        await this.loadTasks();
    }
}

/**
 * Application Service Layer
 */
class TaskService {
    constructor(repository, validator, factory, events) {
        this.repository = repository;
        this.validator = validator;
        this.factory = factory;
        this.events = events;
    }

    async initialize() {
        await this.repository.initialize();
    }

    async createTask(taskData, type = 'basic') {
        try {
            const task = this.factory.createTask(type, taskData);
            return await this.repository.addTask(task);
        } catch (error) {
            this.events.emit('validation:error', error.message, 'create');
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        try {
            const validation = this.validator.validateTaskUpdate(updates);
            if (!validation.isValid) {
                this.events.emit('validation:error', validation.errors, 'update');
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }
            
            return await this.repository.updateTask(taskId, validation.sanitizedData);
        } catch (error) {
            this.events.emit('service:error', error.message, 'update');
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            return await this.repository.deleteTask(taskId);
        } catch (error) {
            this.events.emit('service:error', error.message, 'delete');
            throw error;
        }
    }

    async toggleTaskCompletion(taskId) {
        try {
            return await this.repository.toggleTaskCompletion(taskId);
        } catch (error) {
            this.events.emit('service:error', error.message, 'toggle');
            throw error;
        }
    }

    getTask(taskId) {
        return this.repository.getTask(taskId);
    }

    getAllTasks() {
        return this.repository.getAllTasks();
    }

    getFilteredTasks(filter) {
        const tasks = this.repository.getTasksByFilter(filter);
        this.events.emit('tasks:filtered', tasks, filter);
        return tasks;
    }

    getStats() {
        return this.repository.getStats();
    }

    async backup() {
        return await this.repository.backup();
    }

    async restore(backupString) {
        await this.repository.restore(backupString);
        this.events.emit('tasks:restored');
    }

    async clearAllTasks() {
        const tasks = this.getAllTasks();
        for (const task of tasks) {
            await this.repository.deleteTask(task.id);
        }
        this.events.emit('tasks:cleared');
    }

    async deleteCompletedTasks() {
        const completedTasks = this.getAllTasks().filter(task => task.completed);
        for (const task of completedTasks) {
            await this.repository.deleteTask(task.id);
        }
        this.events.emit('tasks:completed-cleared', completedTasks.length);
        return completedTasks.length;
    }
}

/**
 * Application Controller - Coordinates between UI and Services
 */
class TaskController {
    constructor(taskService, events) {
        this.taskService = taskService;
        this.events = events;
        this.currentFilter = {
            status: 'all',
            priority: 'all',
            search: '',
            sortBy: 'priority'
        };
    }

    async initialize() {
        await this.taskService.initialize();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.events.on('ui:task-create', (taskData, type) => this.handleCreateTask(taskData, type));
        this.events.on('ui:task-update', (taskId, updates) => this.handleUpdateTask(taskId, updates));
        this.events.on('ui:task-delete', (taskId) => this.handleDeleteTask(taskId));
        this.events.on('ui:task-toggle', (taskId) => this.handleToggleTask(taskId));
        this.events.on('ui:filter-change', (filter) => this.handleFilterChange(filter));
        this.events.on('ui:backup-request', () => this.handleBackupRequest());
        this.events.on('ui:restore-request', (backupString) => this.handleRestoreRequest(backupString));
    }

    async handleCreateTask(taskData, type = 'basic') {
        try {
            const task = await this.taskService.createTask(taskData, type);
            this.events.emit('controller:task-created', task);
            this.refreshUI();
        } catch (error) {
            this.events.emit('controller:error', error.message, 'create');
        }
    }

    async handleUpdateTask(taskId, updates) {
        try {
            const task = await this.taskService.updateTask(taskId, updates);
            this.events.emit('controller:task-updated', task);
            this.refreshUI();
        } catch (error) {
            this.events.emit('controller:error', error.message, 'update');
        }
    }

    async handleDeleteTask(taskId) {
        try {
            const task = await this.taskService.deleteTask(taskId);
            this.events.emit('controller:task-deleted', task);
            this.refreshUI();
        } catch (error) {
            this.events.emit('controller:error', error.message, 'delete');
        }
    }

    async handleToggleTask(taskId) {
        try {
            const task = await this.taskService.toggleTaskCompletion(taskId);
            this.events.emit('controller:task-toggled', task);
            this.refreshUI();
        } catch (error) {
            this.events.emit('controller:error', error.message, 'toggle');
        }
    }

    handleFilterChange(filter) {
        this.currentFilter = { ...this.currentFilter, ...filter };
        this.refreshUI();
    }

    async handleBackupRequest() {
        try {
            const backup = await this.taskService.backup();
            this.events.emit('controller:backup-ready', backup);
        } catch (error) {
            this.events.emit('controller:error', error.message, 'backup');
        }
    }

    async handleRestoreRequest(backupString) {
        try {
            await this.taskService.restore(backupString);
            this.events.emit('controller:restore-complete');
            this.refreshUI();
        } catch (error) {
            this.events.emit('controller:error', error.message, 'restore');
        }
    }

    refreshUI() {
        const tasks = this.taskService.getFilteredTasks(this.currentFilter);
        const stats = this.taskService.getStats();
        this.events.emit('controller:ui-refresh', tasks, stats, this.currentFilter);
    }

    getCurrentTasks() {
        return this.taskService.getFilteredTasks(this.currentFilter);
    }

    getStats() {
        return this.taskService.getStats();
    }
}

// Example usage and initialization:
/*
// Initialize the application with improved architecture
async function initializeApp() {
    // Create core components
    const events = new TaskEvents();
    const validator = new TaskValidator();
    const factory = new TaskFactory(validator);
    const storage = new StorageService();
    const repository = new TaskRepository(storage, events);
    const taskService = new TaskService(repository, validator, factory, events);
    const controller = new TaskController(taskService, events);
    
    // Initialize the application
    await controller.initialize();
    
    // The UI would subscribe to controller events and emit UI events
    events.on('controller:ui-refresh', (tasks, stats, filter) => {
        // Update UI with new data
        console.log('UI Refresh:', { tasks: tasks.length, stats, filter });
    });
    
    events.on('controller:error', (message, operation) => {
        // Show error to user
        console.error('Operation failed:', operation, message);
    });
    
    return { controller, events, taskService };
}

// Usage
initializeApp().then(({ controller, events }) => {
    console.log('Application initialized with improved architecture');
    
    // Example: Create a task through the controller
    events.emit('ui:task-create', {
        title: 'Test improved architecture',
        description: 'Verify that the new architecture works correctly',
        priority: 'high'
    });
});
*/