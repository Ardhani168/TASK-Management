/**
 * Day 2: Task Factory Pattern
 * Factory pattern for creating different types of tasks
 */

/**
 * Base Task Factory
 */
class TaskFactory {
    constructor(validator) {
        this.validator = validator;
        this.taskTypes = new Map();
        this.registerDefaultTypes();
    }

    /**
     * Register default task types
     */
    registerDefaultTypes() {
        this.registerTaskType('basic', BasicTaskCreator);
        this.registerTaskType('urgent', UrgentTaskCreator);
        this.registerTaskType('recurring', RecurringTaskCreator);
        this.registerTaskType('project', ProjectTaskCreator);
    }

    /**
     * Register a new task type
     * @param {string} type - Task type identifier
     * @param {Function} creatorClass - Task creator class
     */
    registerTaskType(type, creatorClass) {
        this.taskTypes.set(type, creatorClass);
    }

    /**
     * Create a task of specified type
     * @param {string} type - Task type
     * @param {Object} taskData - Task data
     * @returns {Task} Created task
     */
    createTask(type = 'basic', taskData) {
        const CreatorClass = this.taskTypes.get(type);
        
        if (!CreatorClass) {
            throw new Error(`Unknown task type: ${type}`);
        }

        const creator = new CreatorClass(this.validator);
        return creator.createTask(taskData);
    }

    /**
     * Get available task types
     * @returns {Array} Array of available task types
     */
    getAvailableTypes() {
        return Array.from(this.taskTypes.keys());
    }
}

/**
 * Abstract Task Creator
 */
class TaskCreator {
    constructor(validator) {
        this.validator = validator;
    }

    /**
     * Create a task - to be implemented by subclasses
     * @param {Object} taskData - Task data
     * @returns {Task} Created task
     */
    createTask(taskData) {
        throw new Error('createTask method must be implemented');
    }

    /**
     * Validate task data
     * @param {Object} taskData - Task data to validate
     * @returns {Object} Validation result
     */
    validateTaskData(taskData) {
        if (!this.validator) {
            throw new Error('Validator not provided');
        }
        return this.validator.validateTask(taskData);
    }

    /**
     * Apply default values for task type
     * @param {Object} taskData - Original task data
     * @returns {Object} Task data with defaults applied
     */
    applyDefaults(taskData) {
        return {
            title: '',
            description: '',
            priority: 'medium',
            dueDate: null,
            ...taskData
        };
    }
}

/**
 * Basic Task Creator
 */
class BasicTaskCreator extends TaskCreator {
    createTask(taskData) {
        const dataWithDefaults = this.applyDefaults(taskData);
        const validation = this.validateTaskData(dataWithDefaults);
        
        if (!validation.isValid) {
            throw new Error('Validation failed: ' + validation.errors.join(', '));
        }

        const task = new Task(
            validation.sanitizedData.title,
            validation.sanitizedData.description,
            validation.sanitizedData.priority,
            validation.sanitizedData.dueDate
        );

        // Add basic task metadata
        task.type = 'basic';
        task.category = 'general';
        
        return task;
    }
}

/**
 * Urgent Task Creator
 */
class UrgentTaskCreator extends TaskCreator {
    applyDefaults(taskData) {
        const defaults = super.applyDefaults(taskData);
        
        // Urgent tasks default to high priority
        defaults.priority = 'high';
        
        // Set due date to tomorrow if not specified
        if (!defaults.dueDate) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            defaults.dueDate = tomorrow.toISOString().split('T')[0];
        }
        
        return defaults;
    }

    createTask(taskData) {
        const dataWithDefaults = this.applyDefaults(taskData);
        const validation = this.validateTaskData(dataWithDefaults);
        
        if (!validation.isValid) {
            throw new Error('Validation failed: ' + validation.errors.join(', '));
        }

        const task = new Task(
            validation.sanitizedData.title,
            validation.sanitizedData.description,
            validation.sanitizedData.priority,
            validation.sanitizedData.dueDate
        );

        // Add urgent task metadata
        task.type = 'urgent';
        task.category = 'urgent';
        task.isUrgent = true;
        task.escalationLevel = 1;
        
        return task;
    }
}

/**
 * Recurring Task Creator
 */
class RecurringTaskCreator extends TaskCreator {
    applyDefaults(taskData) {
        const defaults = super.applyDefaults(taskData);
        
        // Add recurring-specific defaults
        defaults.recurrencePattern = taskData.recurrencePattern || 'weekly';
        defaults.recurrenceInterval = taskData.recurrenceInterval || 1;
        defaults.maxOccurrences = taskData.maxOccurrences || null;
        
        return defaults;
    }

    createTask(taskData) {
        const dataWithDefaults = this.applyDefaults(taskData);
        
        // Validate basic task data
        const validation = this.validateTaskData(dataWithDefaults);
        if (!validation.isValid) {
            throw new Error('Validation failed: ' + validation.errors.join(', '));
        }

        // Validate recurring-specific data
        this.validateRecurrenceData(dataWithDefaults);

        const task = new Task(
            validation.sanitizedData.title,
            validation.sanitizedData.description,
            validation.sanitizedData.priority,
            validation.sanitizedData.dueDate
        );

        // Add recurring task metadata
        task.type = 'recurring';
        task.category = 'recurring';
        task.recurrencePattern = dataWithDefaults.recurrencePattern;
        task.recurrenceInterval = dataWithDefaults.recurrenceInterval;
        task.maxOccurrences = dataWithDefaults.maxOccurrences;
        task.currentOccurrence = 1;
        task.nextDueDate = this.calculateNextDueDate(task);
        
        return task;
    }

    validateRecurrenceData(taskData) {
        const validPatterns = ['daily', 'weekly', 'monthly', 'yearly'];
        
        if (!validPatterns.includes(taskData.recurrencePattern)) {
            throw new Error(`Invalid recurrence pattern: ${taskData.recurrencePattern}`);
        }

        if (taskData.recurrenceInterval < 1) {
            throw new Error('Recurrence interval must be at least 1');
        }

        if (taskData.maxOccurrences !== null && taskData.maxOccurrences < 1) {
            throw new Error('Max occurrences must be at least 1 or null');
        }
    }

    calculateNextDueDate(task) {
        if (!task.dueDate) return null;

        const currentDate = new Date(task.dueDate);
        const nextDate = new Date(currentDate);

        switch (task.recurrencePattern) {
            case 'daily':
                nextDate.setDate(currentDate.getDate() + task.recurrenceInterval);
                break;
            case 'weekly':
                nextDate.setDate(currentDate.getDate() + (7 * task.recurrenceInterval));
                break;
            case 'monthly':
                nextDate.setMonth(currentDate.getMonth() + task.recurrenceInterval);
                break;
            case 'yearly':
                nextDate.setFullYear(currentDate.getFullYear() + task.recurrenceInterval);
                break;
        }

        return nextDate.toISOString().split('T')[0];
    }
}

/**
 * Project Task Creator
 */
class ProjectTaskCreator extends TaskCreator {
    applyDefaults(taskData) {
        const defaults = super.applyDefaults(taskData);
        
        // Add project-specific defaults
        defaults.projectName = taskData.projectName || 'Unnamed Project';
        defaults.milestone = taskData.milestone || null;
        defaults.estimatedHours = taskData.estimatedHours || null;
        defaults.dependencies = taskData.dependencies || [];
        
        return defaults;
    }

    createTask(taskData) {
        const dataWithDefaults = this.applyDefaults(taskData);
        
        // Validate basic task data
        const validation = this.validateTaskData(dataWithDefaults);
        if (!validation.isValid) {
            throw new Error('Validation failed: ' + validation.errors.join(', '));
        }

        // Validate project-specific data
        this.validateProjectData(dataWithDefaults);

        const task = new Task(
            validation.sanitizedData.title,
            validation.sanitizedData.description,
            validation.sanitizedData.priority,
            validation.sanitizedData.dueDate
        );

        // Add project task metadata
        task.type = 'project';
        task.category = 'project';
        task.projectName = dataWithDefaults.projectName;
        task.milestone = dataWithDefaults.milestone;
        task.estimatedHours = dataWithDefaults.estimatedHours;
        task.dependencies = dataWithDefaults.dependencies;
        task.actualHours = 0;
        task.progress = 0; // 0-100 percentage
        
        return task;
    }

    validateProjectData(taskData) {
        if (taskData.projectName && taskData.projectName.trim().length === 0) {
            throw new Error('Project name cannot be empty');
        }

        if (taskData.estimatedHours !== null && taskData.estimatedHours < 0) {
            throw new Error('Estimated hours cannot be negative');
        }

        if (!Array.isArray(taskData.dependencies)) {
            throw new Error('Dependencies must be an array');
        }
    }
}

/**
 * Task Factory Builder - Fluent interface for creating tasks
 */
class TaskBuilder {
    constructor(factory) {
        this.factory = factory;
        this.reset();
    }

    reset() {
        this.taskData = {
            type: 'basic',
            title: '',
            description: '',
            priority: 'medium',
            dueDate: null
        };
        return this;
    }

    setType(type) {
        this.taskData.type = type;
        return this;
    }

    setTitle(title) {
        this.taskData.title = title;
        return this;
    }

    setDescription(description) {
        this.taskData.description = description;
        return this;
    }

    setPriority(priority) {
        this.taskData.priority = priority;
        return this;
    }

    setDueDate(dueDate) {
        this.taskData.dueDate = dueDate;
        return this;
    }

    // Project-specific methods
    setProject(projectName) {
        this.taskData.projectName = projectName;
        return this;
    }

    setMilestone(milestone) {
        this.taskData.milestone = milestone;
        return this;
    }

    setEstimatedHours(hours) {
        this.taskData.estimatedHours = hours;
        return this;
    }

    // Recurring-specific methods
    setRecurrence(pattern, interval = 1) {
        this.taskData.recurrencePattern = pattern;
        this.taskData.recurrenceInterval = interval;
        return this;
    }

    setMaxOccurrences(max) {
        this.taskData.maxOccurrences = max;
        return this;
    }

    build() {
        const type = this.taskData.type;
        delete this.taskData.type; // Remove type from task data
        
        const task = this.factory.createTask(type, this.taskData);
        this.reset(); // Reset for next use
        return task;
    }
}

// Example usage:
/*
const validator = new TaskValidator();
const factory = new TaskFactory(validator);

// Create different types of tasks
const basicTask = factory.createTask('basic', {
    title: 'Learn JavaScript',
    description: 'Study basic concepts'
});

const urgentTask = factory.createTask('urgent', {
    title: 'Fix critical bug',
    description: 'Production issue needs immediate attention'
});

const recurringTask = factory.createTask('recurring', {
    title: 'Weekly team meeting',
    description: 'Discuss project progress',
    recurrencePattern: 'weekly',
    dueDate: '2024-01-15'
});

const projectTask = factory.createTask('project', {
    title: 'Implement user authentication',
    description: 'Add login and registration functionality',
    projectName: 'Web Application',
    milestone: 'Phase 1',
    estimatedHours: 8
});

// Using the builder pattern
const builder = new TaskBuilder(factory);

const complexTask = builder
    .setType('project')
    .setTitle('Database Migration')
    .setDescription('Migrate from MySQL to PostgreSQL')
    .setPriority('high')
    .setProject('Backend Refactor')
    .setMilestone('Database Layer')
    .setEstimatedHours(16)
    .build();

console.log('Available task types:', factory.getAvailableTypes());
*/