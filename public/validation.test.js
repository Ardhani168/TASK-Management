/**
 * Day 3: Validation Tests
 * Comprehensive tests for validation strategies and logic
 */

const { TestDataFactory, TestAssertions, MockFactory, TestEnvironment } = require('./test-utilities');

// Mock validation classes for testing
class TitleValidationStrategy {
    constructor(minLength = 1, maxLength = 100) {
        this.minLength = minLength;
        this.maxLength = maxLength;
    }

    validate(title) {
        const errors = [];
        
        if (!title) {
            errors.push('Title is required');
            return { isValid: false, errors };
        }

        const trimmedTitle = title.trim();
        if (trimmedTitle.length === 0) {
            errors.push('Title cannot be empty or only whitespace');
            return { isValid: false, errors };
        }

        if (trimmedTitle.length < this.minLength) {
            errors.push(`Title must be at least ${this.minLength} character(s)`);
        }

        if (trimmedTitle.length > this.maxLength) {
            errors.push(`Title must be no more than ${this.maxLength} characters`);
        }

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
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
}

class DescriptionValidationStrategy {
    constructor(maxLength = 500) {
        this.maxLength = maxLength;
    }

    validate(description) {
        const errors = [];
        
        if (!description) {
            return { isValid: true, errors: [], sanitizedValue: '' };
        }

        const trimmedDescription = description.trim();

        if (trimmedDescription.length > this.maxLength) {
            errors.push(`Description must be no more than ${this.maxLength} characters`);
        }

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

class PriorityValidationStrategy {
    constructor() {
        this.validPriorities = ['high', 'medium', 'low'];
    }

    validate(priority) {
        const errors = [];
        
        if (!priority) {
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

class DueDateValidationStrategy {
    validate(dueDate) {
        const errors = [];
        
        if (!dueDate) {
            return { isValid: true, errors: [], sanitizedValue: null };
        }

        // Check if date format is valid (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dueDate)) {
            errors.push('Due date must be a valid date');
            return { isValid: false, errors };
        }

        const date = new Date(dueDate);
        
        if (isNaN(date.getTime())) {
            errors.push('Due date must be a valid date');
            return { isValid: false, errors };
        }

        // Parse the date string to check if it's a valid calendar date
        const [year, month, day] = dueDate.split('-').map(Number);
        const checkDate = new Date(year, month - 1, day);
        if (checkDate.getFullYear() !== year || checkDate.getMonth() !== month - 1 || checkDate.getDate() !== day) {
            errors.push('Due date must be a valid date');
            return { isValid: false, errors };
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const inputDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        
        if (inputDate < now) {
            errors.push('Due date must be today or in the future');
        }

        return {
            isValid: errors.length === 0,
            errors,
            sanitizedValue: dueDate
        };
    }
}

class TaskValidator {
    constructor() {
        this.titleValidator = new TitleValidationStrategy();
        this.descriptionValidator = new DescriptionValidationStrategy();
        this.priorityValidator = new PriorityValidationStrategy();
        this.dueDateValidator = new DueDateValidationStrategy();
    }

    validateTask(taskData) {
        const results = {
            title: this.titleValidator.validate(taskData.title),
            description: this.descriptionValidator.validate(taskData.description),
            priority: this.priorityValidator.validate(taskData.priority),
            dueDate: this.dueDateValidator.validate(taskData.dueDate)
        };

        const allErrors = [];
        Object.keys(results).forEach(field => {
            if (!results[field].isValid) {
                results[field].errors.forEach(error => {
                    allErrors.push(`${field}: ${error}`);
                });
            }
        });

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

    validateTaskUpdate(updates) {
        const results = {};
        const allErrors = [];
        const sanitizedData = {};

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

describe('Title Validation Strategy', () => {
    let validator;

    beforeEach(() => {
        validator = new TitleValidationStrategy();
    });

    describe('Valid Titles', () => {
        test('should accept valid title', () => {
            const result = validator.validate('Valid Task Title');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('Valid Task Title');
        });

        test('should trim whitespace from valid title', () => {
            const result = validator.validate('  Trimmed Title  ');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('Trimmed Title');
        });

        test('should accept title at minimum length', () => {
            const result = validator.validate('A');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('A');
        });

        test('should accept title at maximum length', () => {
            const longTitle = 'A'.repeat(100);
            const result = validator.validate(longTitle);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe(longTitle);
        });
    });

    describe('Invalid Titles', () => {
        test('should reject null title', () => {
            const result = validator.validate(null);
            
            TestAssertions.assertValidationResult(result, false, ['Title is required']);
        });

        test('should reject undefined title', () => {
            const result = validator.validate(undefined);
            
            TestAssertions.assertValidationResult(result, false, ['Title is required']);
        });

        test('should reject empty string title', () => {
            const result = validator.validate('');
            
            TestAssertions.assertValidationResult(result, false, ['Title is required']);
        });

        test('should reject whitespace-only title', () => {
            const result = validator.validate('   ');
            
            TestAssertions.assertValidationResult(result, false, ['Title cannot be empty or only whitespace']);
        });

        test('should reject title exceeding maximum length', () => {
            const longTitle = 'A'.repeat(101);
            const result = validator.validate(longTitle);
            
            TestAssertions.assertValidationResult(result, false, ['Title must be no more than 100 characters']);
        });

        test('should reject title with HTML tags', () => {
            const result = validator.validate('<script>alert("xss")</script>');
            
            TestAssertions.assertValidationResult(result, false, ['Title cannot contain HTML tags']);
        });
    });

    describe('HTML Sanitization', () => {
        test('should sanitize HTML entities', () => {
            const result = validator.validate('Title with & < > " \' characters');
            
            expect(result.sanitizedValue).toBe('Title with &amp; &lt; &gt; &quot; &#x27; characters');
        });

        test('should detect various HTML tags', () => {
            const htmlTitles = [
                '<div>Title</div>',
                '<script>alert(1)</script>',
                '<img src="x" onerror="alert(1)">',
                'Title <b>bold</b>',
                '<p>Paragraph</p>'
            ];

            htmlTitles.forEach(title => {
                const result = validator.validate(title);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Title cannot contain HTML tags');
            });
        });
    });

    describe('Custom Length Limits', () => {
        test('should respect custom minimum length', () => {
            const customValidator = new TitleValidationStrategy(5, 100);
            const result = customValidator.validate('Hi');
            
            TestAssertions.assertValidationResult(result, false, ['Title must be at least 5 character(s)']);
        });

        test('should respect custom maximum length', () => {
            const customValidator = new TitleValidationStrategy(1, 10);
            const result = customValidator.validate('This title is too long');
            
            TestAssertions.assertValidationResult(result, false, ['Title must be no more than 10 characters']);
        });
    });
});

describe('Description Validation Strategy', () => {
    let validator;

    beforeEach(() => {
        validator = new DescriptionValidationStrategy();
    });

    describe('Valid Descriptions', () => {
        test('should accept valid description', () => {
            const result = validator.validate('This is a valid description');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('This is a valid description');
        });

        test('should accept empty description', () => {
            const result = validator.validate('');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('');
        });

        test('should accept null description', () => {
            const result = validator.validate(null);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('');
        });

        test('should trim whitespace from description', () => {
            const result = validator.validate('  Trimmed description  ');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('Trimmed description');
        });

        test('should accept description at maximum length', () => {
            const longDescription = 'A'.repeat(500);
            const result = validator.validate(longDescription);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe(longDescription);
        });
    });

    describe('Invalid Descriptions', () => {
        test('should reject description exceeding maximum length', () => {
            const longDescription = 'A'.repeat(501);
            const result = validator.validate(longDescription);
            
            TestAssertions.assertValidationResult(result, false, ['Description must be no more than 500 characters']);
        });

        test('should reject description with HTML tags', () => {
            const result = validator.validate('Description with <b>HTML</b>');
            
            TestAssertions.assertValidationResult(result, false, ['Description cannot contain HTML tags']);
        });
    });

    describe('Custom Length Limits', () => {
        test('should respect custom maximum length', () => {
            const customValidator = new DescriptionValidationStrategy(20);
            const result = customValidator.validate('This description is definitely too long');
            
            TestAssertions.assertValidationResult(result, false, ['Description must be no more than 20 characters']);
        });
    });
});

describe('Priority Validation Strategy', () => {
    let validator;

    beforeEach(() => {
        validator = new PriorityValidationStrategy();
    });

    describe('Valid Priorities', () => {
        test('should accept valid priorities', () => {
            const validPriorities = ['high', 'medium', 'low'];
            
            validPriorities.forEach(priority => {
                const result = validator.validate(priority);
                TestAssertions.assertValidationResult(result, true);
                expect(result.sanitizedValue).toBe(priority);
            });
        });

        test('should normalize priority case', () => {
            const result = validator.validate('HIGH');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('high');
        });

        test('should trim whitespace from priority', () => {
            const result = validator.validate('  medium  ');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('medium');
        });

        test('should default to medium for null priority', () => {
            const result = validator.validate(null);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('medium');
        });

        test('should default to medium for empty priority', () => {
            const result = validator.validate('');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe('medium');
        });
    });

    describe('Invalid Priorities', () => {
        test('should reject invalid priority values', () => {
            const invalidPriorities = ['urgent', 'critical', 'normal', 'invalid'];
            
            invalidPriorities.forEach(priority => {
                const result = validator.validate(priority);
                TestAssertions.assertValidationResult(result, false, ['Priority must be one of: high, medium, low']);
            });
        });
    });
});

describe('Due Date Validation Strategy', () => {
    let validator;

    beforeEach(() => {
        validator = new DueDateValidationStrategy();
    });

    describe('Valid Due Dates', () => {
        test('should accept future date', () => {
            const futureDate = TestDataFactory.getFutureDate(7);
            const result = validator.validate(futureDate);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe(futureDate);
        });

        test('should accept today as due date', () => {
            const todayDate = TestDataFactory.getTodayDate();
            const result = validator.validate(todayDate);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBe(todayDate);
        });

        test('should accept null due date', () => {
            const result = validator.validate(null);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBeNull();
        });

        test('should accept empty due date', () => {
            const result = validator.validate('');
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedValue).toBeNull();
        });
    });

    describe('Invalid Due Dates', () => {
        test('should reject past dates', () => {
            const pastDate = TestDataFactory.getPastDate(1);
            const result = validator.validate(pastDate);
            
            TestAssertions.assertValidationResult(result, false, ['Due date must be today or in the future']);
        });

        test('should reject invalid date formats', () => {
            const invalidDates = ['invalid-date', '2024-13-01', '2024-02-30', 'not-a-date'];
            
            invalidDates.forEach(date => {
                const result = validator.validate(date);
                TestAssertions.assertValidationResult(result, false, ['Due date must be a valid date']);
            });
        });
    });
});

describe('Task Validator (Composite)', () => {
    let validator;

    beforeEach(() => {
        validator = new TaskValidator();
    });

    describe('Complete Task Validation', () => {
        test('should validate complete valid task', () => {
            const taskData = TestDataFactory.createValidTaskData();
            const result = validator.validateTask(taskData);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedData).toHaveProperty('title');
            expect(result.sanitizedData).toHaveProperty('description');
            expect(result.sanitizedData).toHaveProperty('priority');
            expect(result.sanitizedData).toHaveProperty('dueDate');
        });

        test('should validate minimal valid task', () => {
            const taskData = { title: 'Minimal Task' };
            const result = validator.validateTask(taskData);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedData.title).toBe('Minimal Task');
            expect(result.sanitizedData.description).toBe('');
            expect(result.sanitizedData.priority).toBe('medium');
            expect(result.sanitizedData.dueDate).toBeNull();
        });

        test('should collect all validation errors', () => {
            const invalidTaskData = {
                title: '', // Invalid
                description: 'A'.repeat(501), // Invalid
                priority: 'invalid', // Invalid
                dueDate: TestDataFactory.getPastDate(1) // Invalid
            };
            const result = validator.validateTask(invalidTaskData);
            
            TestAssertions.assertValidationResult(result, false, []);
            expect(result.errors.length).toBeGreaterThan(1);
            expect(result.errors.some(error => error.includes('title'))).toBe(true);
            expect(result.errors.some(error => error.includes('description'))).toBe(true);
            expect(result.errors.some(error => error.includes('priority'))).toBe(true);
            expect(result.errors.some(error => error.includes('dueDate'))).toBe(true);
        });

        test('should provide field-specific results', () => {
            const taskData = {
                title: 'Valid Title',
                description: 'A'.repeat(501), // Invalid
                priority: 'high',
                dueDate: TestDataFactory.getPastDate(1) // Invalid
            };
            
            const result = validator.validateTask(taskData);
            
            expect(result.fieldResults.title.isValid).toBe(true);
            expect(result.fieldResults.description.isValid).toBe(false);
            expect(result.fieldResults.priority.isValid).toBe(true);
            expect(result.fieldResults.dueDate.isValid).toBe(false);
        });
    });

    describe('Task Update Validation', () => {
        test('should validate partial updates', () => {
            const updates = {
                title: 'Updated Title',
                priority: 'high'
            };
            
            const result = validator.validateTaskUpdate(updates);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedData).toHaveProperty('title', 'Updated Title');
            expect(result.sanitizedData).toHaveProperty('priority', 'high');
            expect(result.sanitizedData).not.toHaveProperty('description');
            expect(result.sanitizedData).not.toHaveProperty('dueDate');
        });

        test('should validate single field update', () => {
            const updates = { description: 'New description' };
            const result = validator.validateTaskUpdate(updates);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedData).toHaveProperty('description', 'New description');
        });

        test('should handle invalid partial updates', () => {
            const updates = {
                description: 'A'.repeat(501), // Invalid - too long
                priority: 'high' // Valid
            };
            
            const result = validator.validateTaskUpdate(updates);
            
            TestAssertions.assertValidationResult(result, false);
            expect(result.sanitizedData).toHaveProperty('priority', 'high');
            expect(result.sanitizedData).not.toHaveProperty('description');
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty task data', () => {
            const result = validator.validateTask({});
            
            TestAssertions.assertValidationResult(result, false, []);
            expect(result.errors.some(error => error.includes('title'))).toBe(true);
        });

        test('should handle task data with extra properties', () => {
            const taskData = {
                title: 'Valid Task',
                description: 'Valid description',
                priority: 'high',
                dueDate: TestDataFactory.getFutureDate(5),
                extraProperty: 'should be ignored'
            };
            
            const result = validator.validateTask(taskData);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedData).not.toHaveProperty('extraProperty');
        });

        test('should handle mixed valid and invalid fields', () => {
            const taskData = {
                title: 'Valid Title',
                description: 'Valid description',
                priority: 'high',
                dueDate: TestDataFactory.getFutureDate(5)
            };
            
            const result = validator.validateTask(taskData);
            
            TestAssertions.assertValidationResult(result, true);
            expect(result.sanitizedData).toHaveProperty('title', 'Valid Title');
            expect(result.sanitizedData).toHaveProperty('description', 'Valid description');
            expect(result.sanitizedData).toHaveProperty('priority', 'high');
            expect(result.sanitizedData).toHaveProperty('dueDate');
        })
    });

    describe('Performance', () => {
        test('should validate tasks efficiently', async () => {
            const taskData = TestDataFactory.createValidTaskData();
            
            const validateManyTasks = () => {
                for (let i = 0; i < 1000; i++) {
                    validator.validateTask(taskData);
                }
            };
            
            const { executionTime } = await TestEnvironment.measureExecutionTime(validateManyTasks);
            
            // Should validate 1000 tasks in less than 100ms
            expect(executionTime).toBeLessThan(100);
        });
    });
});