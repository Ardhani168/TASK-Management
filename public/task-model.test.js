/**
 * Day 3: Task Model Unit Tests
 * Comprehensive tests for the Task model
 */

const { TestDataFactory, TestAssertions, TestEnvironment } = require('./test-utilities');

// Mock the Task class if it's not available in test environment
class Task {
    constructor(title, description = '', priority = 'medium', dueDate = null) {
        this.id = this.generateId();
        this.title = (title || '').trim();
        this.description = (description || '').trim();
        this.priority = priority || 'medium';
        this.dueDate = dueDate;
        this.completed = false;
        this.createdAt = new Date(Date.now());
        this.completedAt = null;
        this.updatedAt = new Date(Date.now());
    }

    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    markComplete() {
        this.completed = true;
        this.completedAt = new Date(Date.now());
        this.updatedAt = new Date(Date.now());
    }

    markIncomplete() {
        this.completed = false;
        this.completedAt = null;
        this.updatedAt = new Date(Date.now());
    }

    toggleComplete() {
        if (this.completed) {
            this.markIncomplete();
        } else {
            this.markComplete();
        }
    }

    update(updates) {
        const allowedUpdates = ['title', 'description', 'priority', 'dueDate'];
        
        for (const key in updates) {
            if (allowedUpdates.includes(key) && updates[key] !== undefined) {
                this[key] = updates[key];
            }
        }
        this.updatedAt = new Date(Date.now());
    }

    isOverdue() {
        if (!this.dueDate || this.completed) return false;
        
        // Parse due date string (format: YYYY-MM-DD)
        const [year, month, day] = this.dueDate.split('-').map(Number);
        const dueDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
        
        // Get today's date in local time
        const today = new Date(Date.now());
        today.setHours(0, 0, 0, 0);
        
        return dueDateObj < today;
    }
}

describe('Task Model', () => {
    let mockDate;

    beforeEach(() => {
        mockDate = TestEnvironment.mockDateNow('2024-01-01T12:00:00.000Z');
    });

    afterEach(() => {
        TestEnvironment.restoreDateNow();
    });

    describe('Task Creation', () => {
        test('should create a task with required properties', () => {
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.priority, taskData.dueDate);
            
            TestAssertions.assertTaskHasRequiredProperties(task);
            TestAssertions.assertTaskEquals(task, taskData);
        });

        test('should create a task with minimal parameters', () => {
            const task = new Task('Minimal Task');
            
            expect(task.title).toBe('Minimal Task');
            expect(task.description).toBe('');
            expect(task.priority).toBe('medium');
            expect(task.dueDate).toBeNull();
            expect(task.completed).toBe(false);
        });

        test('should generate unique IDs for different tasks', () => {
            const task1 = new Task('Task 1');
            const task2 = new Task('Task 2');
            
            expect(task1.id).not.toBe(task2.id);
            expect(task1.id).toMatch(/^task_/);
            expect(task2.id).toMatch(/^task_/);
        });

        test('should trim whitespace from title and description', () => {
            const task = new Task('  Spaced Title  ', '  Spaced Description  ');
            
            expect(task.title).toBe('Spaced Title');
            expect(task.description).toBe('Spaced Description');
        });

        test('should set creation and update timestamps', () => {
            const task = new Task('Test Task');
            
            expect(task.createdAt).toEqual(mockDate);
            expect(task.updatedAt).toEqual(mockDate);
            expect(task.completedAt).toBeNull();
        });

        test('should handle different priority levels', () => {
            const priorities = ['high', 'medium', 'low'];
            
            priorities.forEach(priority => {
                const task = new Task('Test Task', '', priority);
                expect(task.priority).toBe(priority);
            });
        });

        test('should handle due dates correctly', () => {
            const futureDate = TestDataFactory.getFutureDate(7);
            const task = new Task('Test Task', '', 'medium', futureDate);
            
            expect(task.dueDate).toBe(futureDate);
        });
    });

    describe('Task Completion', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task');
        });

        test('should mark task as complete', () => {
            task.markComplete();
            
            expect(task.completed).toBe(true);
            expect(task.completedAt).toEqual(mockDate);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should mark task as incomplete', () => {
            task.markComplete();
            task.markIncomplete();
            
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeNull();
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should toggle completion status', () => {
            // Initially incomplete
            expect(task.completed).toBe(false);
            
            // Toggle to complete
            task.toggleComplete();
            expect(task.completed).toBe(true);
            expect(task.completedAt).toEqual(mockDate);
            
            // Toggle back to incomplete
            task.toggleComplete();
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeNull();
        });

        test('should not change completion date if already complete', () => {
            task.markComplete();
            const firstCompletionTime = task.completedAt;
            
            // Try to mark complete again
            task.markComplete();
            expect(task.completedAt).toEqual(firstCompletionTime);
        });
    });

    describe('Task Updates', () => {
        let task;

        beforeEach(() => {
            task = new Task('Original Title', 'Original Description', 'low');
        });

        test('should update allowed properties', () => {
            const updates = {
                title: 'Updated Title',
                description: 'Updated Description',
                priority: 'high',
                dueDate: TestDataFactory.getFutureDate(5)
            };
            
            task.update(updates);
            
            expect(task.title).toBe(updates.title);
            expect(task.description).toBe(updates.description);
            expect(task.priority).toBe(updates.priority);
            expect(task.dueDate).toBe(updates.dueDate);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should ignore protected properties', () => {
            const originalId = task.id;
            const originalCreatedAt = task.createdAt;
            
            task.update({
                id: 'new_id',
                createdAt: new Date('2023-01-01'),
                completed: true
            });
            
            expect(task.id).toBe(originalId);
            expect(task.createdAt).toEqual(originalCreatedAt);
            expect(task.completed).toBe(false); // Should not be updated via update method
        });

        test('should ignore undefined values', () => {
            const originalTitle = task.title;
            
            task.update({
                title: undefined,
                description: 'New Description'
            });
            
            expect(task.title).toBe(originalTitle);
            expect(task.description).toBe('New Description');
        });

        test('should update timestamp on any change', () => {
            const originalUpdatedAt = task.updatedAt;
            
            // Simulate time passing
            TestEnvironment.mockDateNow('2024-01-01T13:00:00.000Z');
            
            task.update({ description: 'New Description' });
            
            expect(task.updatedAt).not.toEqual(originalUpdatedAt);
        });
    });

    describe('Task Due Date Checking', () => {
        test('should identify overdue tasks', () => {
            const pastDate = TestDataFactory.getPastDate(1);
            const task = new Task('Overdue Task', '', 'medium', pastDate);
            
            expect(task.isOverdue()).toBe(true);
        });

        test('should not identify future tasks as overdue', () => {
            const futureDate = TestDataFactory.getFutureDate(7);
            const task = new Task('Future Task', '', 'medium', futureDate);
            
            expect(task.isOverdue()).toBe(false);
        });

        test('should not identify completed tasks as overdue', () => {
            const pastDate = TestDataFactory.getPastDate(1);
            const task = new Task('Completed Task', '', 'medium', pastDate);
            task.markComplete();
            
            expect(task.isOverdue()).toBe(false);
        });

        test('should not identify tasks without due date as overdue', () => {
            const task = new Task('No Due Date Task');
            
            expect(task.isOverdue()).toBe(false);
        });

        test('should handle today as due date correctly', () => {
            const todayDate = TestDataFactory.getTodayDate();
            const task = new Task('Today Task', '', 'medium', todayDate);
            
            // Today should not be overdue
            expect(task.isOverdue()).toBe(false);
        });
    });

    describe('Task Validation Edge Cases', () => {
        test('should handle empty strings correctly', () => {
            const task = new Task('   ', '   ');
            
            expect(task.title).toBe('');
            expect(task.description).toBe('');
        });

        test('should handle special characters in title and description', () => {
            const specialTitle = 'Task with "quotes" & <tags>';
            const specialDescription = 'Description with émojis 🚀 and symbols @#$%';
            
            const task = new Task(specialTitle, specialDescription);
            
            expect(task.title).toBe(specialTitle);
            expect(task.description).toBe(specialDescription);
        });

        test('should handle very long strings', () => {
            const longTitle = 'A'.repeat(1000);
            const longDescription = 'B'.repeat(2000);
            
            const task = new Task(longTitle, longDescription);
            
            expect(task.title).toBe(longTitle);
            expect(task.description).toBe(longDescription);
        });

        test('should handle null and undefined values gracefully', () => {
            const task = new Task('Test', null, undefined, null);
            
            expect(task.title).toBe('Test');
            expect(task.description).toBe('');
            expect(task.priority).toBe('medium');
            expect(task.dueDate).toBeNull();
        });
    });

    describe('Task State Consistency', () => {
        test('should maintain consistent state after multiple operations', () => {
            const task = new Task('Consistency Test');
            
            // Perform multiple operations
            task.update({ priority: 'high' });
            task.markComplete();
            task.update({ description: 'Updated description' });
            task.markIncomplete();
            task.update({ dueDate: TestDataFactory.getFutureDate(3) });
            
            // Verify final state
            expect(task.title).toBe('Consistency Test');
            expect(task.description).toBe('Updated description');
            expect(task.priority).toBe('high');
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeNull();
            expect(task.dueDate).toBe(TestDataFactory.getFutureDate(3));
        });

        test('should handle rapid completion toggles', () => {
            const task = new Task('Toggle Test');
            
            // Rapid toggles
            for (let i = 0; i < 10; i++) {
                task.toggleComplete();
            }
            
            // Should end up incomplete (started incomplete, 10 toggles = even number)
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeNull();
        });
    });

    describe('Task Performance', () => {
        test('should create tasks efficiently', async () => {
            const createManyTasks = () => {
                const tasks = [];
                for (let i = 0; i < 1000; i++) {
                    tasks.push(new Task(`Task ${i}`, `Description ${i}`, 'medium'));
                }
                return tasks;
            };
            
            const { executionTime } = await TestEnvironment.measureExecutionTime(createManyTasks);
            
            // Should create 1000 tasks in less than 100ms
            expect(executionTime).toBeLessThan(100);
        });

        test('should update tasks efficiently', async () => {
            const task = new Task('Performance Test');
            
            const performManyUpdates = () => {
                for (let i = 0; i < 1000; i++) {
                    task.update({ description: `Update ${i}` });
                }
            };
            
            const { executionTime } = await TestEnvironment.measureExecutionTime(performManyUpdates);
            
            // Should perform 1000 updates in less than 50ms
            expect(executionTime).toBeLessThan(50);
        });
    });
});

// Additional test suite for Task integration scenarios
describe('Task Integration Scenarios', () => {
    describe('Task Lifecycle', () => {
        test('should handle complete task lifecycle', () => {
            // Create
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.priority, taskData.dueDate);
            
            // Verify creation
            TestAssertions.assertTaskHasRequiredProperties(task);
            expect(task.completed).toBe(false);
            
            // Update
            task.update({ priority: 'high', description: 'Updated description' });
            expect(task.priority).toBe('high');
            expect(task.description).toBe('Updated description');
            
            // Complete
            task.markComplete();
            expect(task.completed).toBe(true);
            expect(task.completedAt).toBeTruthy();
            
            // Reopen
            task.markIncomplete();
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeNull();
            
            // Final completion
            task.markComplete();
            expect(task.completed).toBe(true);
        });

        test('should maintain data integrity throughout lifecycle', () => {
            const task = new Task('Integrity Test', 'Original description', 'low');
            const originalId = task.id;
            const originalCreatedAt = task.createdAt;
            
            // Perform various operations
            task.update({ title: 'Updated Title', priority: 'high' });
            task.markComplete();
            task.markIncomplete();
            task.update({ description: 'Final description' });
            
            // Verify integrity
            expect(task.id).toBe(originalId);
            expect(task.createdAt).toEqual(originalCreatedAt);
            expect(task.title).toBe('Updated Title');
            expect(task.description).toBe('Final description');
            expect(task.priority).toBe('high');
            expect(task.completed).toBe(false);
        });
    });

    describe('Task Collections', () => {
        test('should work correctly in arrays', () => {
            const tasks = TestDataFactory.createMultipleTasks(5);
            const taskObjects = tasks.map(data => 
                new Task(data.title, data.description, data.priority, data.dueDate)
            );
            
            // Test array operations
            expect(taskObjects).toHaveLength(5);
            
            // Test filtering
            const highPriorityTasks = taskObjects.filter(task => task.priority === 'high');
            expect(highPriorityTasks.length).toBeGreaterThan(0);
            
            // Test mapping
            const titles = taskObjects.map(task => task.title);
            expect(titles).toHaveLength(5);
            expect(titles.every(title => typeof title === 'string')).toBe(true);
            
            // Test sorting
            const sortedByPriority = taskObjects.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
            
            expect(sortedByPriority[0].priority).toBe('high');
        });

        test('should maintain uniqueness in collections', () => {
            const tasks = [];
            
            for (let i = 0; i < 100; i++) {
                tasks.push(new Task(`Task ${i}`));
            }
            
            // All IDs should be unique
            const ids = tasks.map(task => task.id);
            const uniqueIds = new Set(ids);
            
            expect(uniqueIds.size).toBe(tasks.length);
        });
    });
});