/**
 * Day 2: Validation Strategies
 * Implementing Strategy Pattern for input validation
 */

/**
 * Base Validation Strategy Interface
 */
class ValidationStrategy {
    validate(value) {
        throw new Error('validate method must be implemented');
    }
}

/**
 * Title Validation Strategy
 */
class TitleValidationStrategy extends ValidationStrategy {
    constructor(minLength = 1, maxLength = 100) {
        super();
        this.minLength = minLength;
        this.maxLength = maxLength;
    }

    validate(title) {
        const errors = [];
        
        // Check if title exists
        if (!title) {
            errors.push('Title is required');
            return { isValid: false, errors };
        }

        // Trim and check again
        const trimmedTitle = title.trim();
        if (trimmedTitle.length === 0) {
            errors.push('Title cannot be empty or only whitespace');
        }

        // Check length
        if (trimmedTitle.length < this.minLength) {
            errors.push(`Title must be at least ${this.minLength} character(s)`);
        }

        if (trimmedTitle.length > this.maxLength) {
            errors.push(`Title must be no more than ${this.maxLength} characters`);
        }

        // Check for potentially dangerous content
        if (this.containsHtml(trimmedTitle)) {
            errors.push('Title cannot contain HTML tags');
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedValue: this.sanitize(trimmedTitle)
        };
    }

    containsHtml(text) {
        const htmlRegex = /<[^>]*>/g;
        return htmlRegex.test(text);
    }

    sanitize(text) {
        // Basic HTML escaping
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
}

/**
 * Description Validation Strategy
 */
class DescriptionValidationStrategy extends ValidationStrategy {
    constructor(maxLength = 500) {
        super();
        this.maxLength = maxLength;
    }

    validate(description) {
        const errors = [];
        
        // Description is optional, so empty is valid
        if (!description) {
            return { isValid: true, errors: [], sanitizedValue: '' };
        }

        const trimmedDescription = description.trim();

        // Check length
        if (trimmedDescription.length > this.maxLength) {
            errors.push(`Description must be no more than ${this.maxLength} characters`);
        }

        // Check for potentially dangerous content
        if (this.containsHtml(trimmedDescription)) {
            errors.push('Description cannot contain HTML tags');
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedValue: this.sanitize(trimmedDescription)
        };
    }

    containsHtml(text) {
        const htmlRegex = /<[^>]*>/g;
        return htmlRegex.test(text);
    }

    sanitize(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
}

/**
 * Priority Validation Strategy
 */
class PriorityValidationStrategy extends ValidationStrategy {
    constructor() {
        super();
        this.validPriorities = ['high', 'medium', 'low'];
    }

    validate(priority) {
        const errors = [];
        
        if (!priority) {
            // Default to medium if not provided
            return { isValid: true, errors: [], sanitizedValue: 'medium' };
        }

        const normalizedPriority = priority.toLowerCase().trim();

        if (!this.validPriorities.includes(normalizedPriority)) {
            errors.push(`Priority must be one of: ${this.validPriorities.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedValue: normalizedPriority
        };
    }
}

/**
 * Due Date Validation Strategy
 */
class DueDateValidationStrategy extends ValidationStrategy {
    validate(dueDate) {
        const errors = [];
        
        // Due date is optional
        if (!dueDate) {
            return { isValid: true, errors: [], sanitizedValue: null };
        }

        // Try to parse the date
        const date = new Date(dueDate);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            errors.push('Due date must be a valid date');
            return { isValid: false, errors };
        }

        // Check if date is in the future
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
        
        if (date < now) {
            errors.push('Due date must be today or in the future');
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedValue: date.toISOString().split('T')[0] // Return YYYY-MM-DD format
        };
    }
}

/**
 * Composite Validator - combines multiple validation strategies
 */
class TaskValidator {
    constructor() {
        this.titleValidator = new TitleValidationStrategy();
        this.descriptionValidator = new DescriptionValidationStrategy();
        this.priorityValidator = new PriorityValidationStrategy();
        this.dueDateValidator = new DueDateValidationStrategy();
    }

    /**
     * Validate all task fields
     * @param {Object} taskData - Object containing task fields
     * @returns {Object} Validation result with errors and sanitized data
     */
    validateTask(taskData) {
        const results = {
            title: this.titleValidator.validate(taskData.title),
            description: this.descriptionValidator.validate(taskData.description),
            priority: this.priorityValidator.validate(taskData.priority),
            dueDate: this.dueDateValidator.validate(taskData.dueDate)
        };

        // Collect all errors
        const allErrors = [];
        Object.keys(results).forEach(field => {
            if (!results[field].isValid) {
                results[field].errors.forEach(error => {
                    allErrors.push(`${field}: ${error}`);
                });
            }
        });

        // Create sanitized data object
        const sanitizedData = {};
        Object.keys(results).forEach(field => {
            if (results[field].isValid) {
                sanitizedData[field] = results[field].sanitizedValue;
            }
        });

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            fieldResults: results,
            sanitizedData
        };
    }

    /**
     * Validate task update (allows partial updates)
     * @param {Object} updates - Object containing fields to update
     * @returns {Object} Validation result
     */
    validateTaskUpdate(updates) {
        const results = {};
        const allErrors = [];
        const sanitizedData = {};

        // Only validate fields that are being updated
        if (updates.hasOwnProperty('title')) {
            results.title = this.titleValidator.validate(updates.title);
        }
        if (updates.hasOwnProperty('description')) {
            results.description = this.descriptionValidator.validate(updates.description);
        }
        if (updates.hasOwnProperty('priority')) {
            results.priority = this.priorityValidator.validate(updates.priority);
        }
        if (updates.hasOwnProperty('dueDate')) {
            results.dueDate = this.dueDateValidator.validate(updates.dueDate);
        }

        // Collect errors and sanitized data
        Object.keys(results).forEach(field => {
            if (!results[field].isValid) {
                results[field].errors.forEach(error => {
                    allErrors.push(`${field}: ${error}`);
                });
            } else {
                sanitizedData[field] = results[field].sanitizedValue;
            }
        });

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            fieldResults: results,
            sanitizedData
        };
    }
}

/**
 * Real-time Validation Helper
 * Provides immediate feedback as user types
 */
class RealTimeValidator {
    constructor(validator) {
        this.validator = validator;
        this.debounceTimers = {};
    }

    /**
     * Validate a single field with debouncing
     * @param {string} fieldName - Name of the field
     * @param {*} value - Value to validate
     * @param {Function} callback - Callback to handle validation result
     * @param {number} delay - Debounce delay in milliseconds
     */
    validateField(fieldName, value, callback, delay = 300) {
        // Clear existing timer
        if (this.debounceTimers[fieldName]) {
            clearTimeout(this.debounceTimers[fieldName]);
        }

        // Set new timer
        this.debounceTimers[fieldName] = setTimeout(() => {
            let result;
            
            switch (fieldName) {
                case 'title':
                    result = this.validator.titleValidator.validate(value);
                    break;
                case 'description':
                    result = this.validator.descriptionValidator.validate(value);
                    break;
                case 'priority':
                    result = this.validator.priorityValidator.validate(value);
                    break;
                case 'dueDate':
                    result = this.validator.dueDateValidator.validate(value);
                    break;
                default:
                    result = { isValid: true, errors: [] };
            }

            callback(fieldName, result);
        }, delay);
    }

    /**
     * Clear all debounce timers
     */
    clearTimers() {
        Object.values(this.debounceTimers).forEach(timer => {
            clearTimeout(timer);
        });
        this.debounceTimers = {};
    }
}

// Example usage:
/*
const validator = new TaskValidator();

// Validate a complete task
const taskData = {
    title: 'Learn JavaScript',
    description: 'Study variables and functions',
    priority: 'high',
    dueDate: '2024-12-31'
};

const result = validator.validateTask(taskData);
if (result.isValid) {
    console.log('Task is valid:', result.sanitizedData);
} else {
    console.log('Validation errors:', result.errors);
}

// Real-time validation example
const realTimeValidator = new RealTimeValidator(validator);
realTimeValidator.validateField('title', 'My Task', (field, result) => {
    if (!result.isValid) {
        console.log(`${field} errors:`, result.errors);
    }
});
*/