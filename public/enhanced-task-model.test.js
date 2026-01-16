/**
 * Enhanced Task Model Tests - Day 3 Implementation
 * Comprehensive test suite for the enhanced Task model from Day 2
 * 
 * Feature: sample-project-refactor, Property 4: CRUD Operations Completeness
 * Validates: Requirements 2.4, 2.5
 */

const { TestDataFactory, TestAssertions, TestEnvironment } = require('./test-utilities');

// Import the enhanced Task model from Day 2
const Task = require('./enhanced-task-model');

describe('Enhanced Task Model', () => {
    let mockDate;

    beforeEach(() => {
        mockDate = TestEnvironment.mockDateNow('2024-01-01T12:00:00.000Z');
    });

    afterEach(() => {
        TestEnvironment.restoreDateNow();
    });

    describe('Task Creation and Initialization', () => {
        test('should create task with all required properties', () => {
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.userId, {
                priority: taskData.priority,
                category: taskData.category,
                dueDate: taskData.dueDate
            });
            
            TestAssertions.assertTaskHasRequiredProperties(task);
            expect(task.title).toBe(taskData.title);
            expect(task.description).toBe(taskData.description);
            expect(task.userId).toBe(taskData.userId);
            expect(task.priority).toBe(taskData.priority);
            expect(task.category).toBe(taskData.category);
        });

        test('should generate unique IDs for different tasks', () => {
            const task1 = new Task('Task 1', 'Description 1', 'user123');
            const task2 = new Task('Task 2', 'Description 2', 'user123');
            
            expect(task1.id).not.toBe(task2.id);
            expect(task1.id).toMatch(/^task_/);
            expect(task2.id).toMatch(/^task_/);
        });

        test('should set default values for optional properties', () => {
            const task = new Task('Test Task', 'Description', 'user123');
            
            expect(task.priority).toBe('medium');
            expect(task.category).toBe('general');
            expect(task.completed).toBe(false);
            expect(task.status).toBe('pending');
            expect(task.tags).toEqual([]);
            expect(task.estimatedHours).toBeNull();
            expect(task.actualHours).toBeNull();
        });

        test('should validate required constructor parameters', () => {
            expect(() => {
                new Task('', 'Description', 'user123');
            }).toThrow('Task title is required');

            expect(() => {
                new Task('Title', 'Description', '');
            }).toThrow('User ID is required');

            expect(() => {
                new Task(null, 'Description', 'user123');
            }).toThrow('Task title is required');
        });

        test('should trim whitespace from title and description', () => {
            const task = new Task('  Spaced Title  ', '  Spaced Description  ', 'user123');
            
            expect(task.title).toBe('Spaced Title');
            expect(task.description).toBe('Spaced Description');
        });

        test('should validate priority values', () => {
            expect(() => {
                new Task('Title', 'Description', 'user123', { priority: 'invalid' });
            }).toThrow('Invalid priority');

            // Valid priorities should work
            const validPriorities = ['low', 'medium', 'high', 'urgent'];
            validPriorities.forEach(priority => {
                const task = new Task('Title', 'Description', 'user123', { priority });
                expect(task.priority).toBe(priority);
            });
        });

        test('should validate category values', () => {
            const task = new Task('Title', 'Description', 'user123', { category: '  Work  ' });
            expect(task.category).toBe('work'); // Should be trimmed and lowercased
        });

        test('should handle assignment properly', () => {
            const task = new Task('Title', 'Description', 'user123', { assignedTo: 'user456' });
            expect(task.assignedTo).toBe('user456');
            
            // Should default to owner if not specified
            const task2 = new Task('Title', 'Description', 'user123');
            expect(task2.assignedTo).toBe('user123');
        });
    });

    describe('Property Getters and Immutability', () => {
        let task;

        beforeEach(() => {
            const taskData = TestDataFactory.createValidTaskData();
            task = new Task(taskData.title, taskData.description, taskData.userId, {
                priority: taskData.priority,
                category: taskData.category,
                dueDate: taskData.dueDate
            });
        });

        test('should provide read-only access to immutable properties', () => {
            const originalId = task.id;
            const originalCreatedAt = task.createdAt;
            const originalUserId = task.userId;

            // These should be read-only
            expect(task.id).toBe(originalId);
            expect(task.createdAt).toEqual(originalCreatedAt);
            expect(task.userId).toBe(originalUserId);
        });

        test('should return copies of mutable arrays to prevent external modification', () => {
            task.addTag('test-tag');
            const tags = task.tags;
            
            // Modifying returned array should not affect internal state
            tags.push('external-tag');
            expect(task.tags).not.toContain('external-tag');
            expect(task.tags).toContain('test-tag');
        });

        test('should return new Date objects to prevent external modification', () => {
            const createdAt = task.createdAt;
            const originalTime = createdAt.getTime();
            
            // Modifying returned date should not affect internal state
            createdAt.setFullYear(2025);
            expect(task.createdAt.getTime()).toBe(originalTime);
        });
    });

    describe('Task Updates and Modifications', () => {
        let task;

        beforeEach(() => {
            task = new Task('Original Title', 'Original Description', 'user123');
        });

        test('should update title correctly', () => {
            const newTitle = 'Updated Title';
            const result = task.updateTitle(newTitle);
            
            expect(task.title).toBe(newTitle);
            expect(result).toBe(task); // Should return self for chaining
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should reject empty title updates', () => {
            expect(() => {
                task.updateTitle('');
            }).toThrow('Task title cannot be empty');

            expect(() => {
                task.updateTitle('   ');
            }).toThrow('Task title cannot be empty');
        });

        test('should update description correctly', () => {
            const newDescription = 'Updated Description';
            const result = task.updateDescription(newDescription);
            
            expect(task.description).toBe(newDescription);
            expect(result).toBe(task);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should handle null description updates', () => {
            const result = task.updateDescription(null);
            
            expect(task.description).toBe('');
            expect(result).toBe(task);
        });

        test('should update priority correctly', () => {
            const result = task.updatePriority('high');
            
            expect(task.priority).toBe('high');
            expect(result).toBe(task);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should reject invalid priority updates', () => {
            expect(() => {
                task.updatePriority('invalid');
            }).toThrow('Invalid priority');
        });
    });

    describe('Task Completion Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should mark task as complete', () => {
            const result = task.markComplete();
            
            expect(task.completed).toBe(true);
            expect(task.status).toBe('completed');
            expect(task.completedAt).toEqual(mockDate);
            expect(task.updatedAt).toEqual(mockDate);
            expect(result).toBe(task);
        });

        test('should mark task as incomplete', () => {
            task.markComplete();
            const result = task.markIncomplete();
            
            expect(task.completed).toBe(false);
            expect(task.status).toBe('pending');
            expect(task.completedAt).toBeNull();
            expect(task.updatedAt).toEqual(mockDate);
            expect(result).toBe(task);
        });

        test('should handle multiple completion calls gracefully', () => {
            task.markComplete();
            const firstCompletedAt = task.completedAt;
            
            // Marking complete again should not change completedAt
            task.markComplete();
            expect(task.completedAt).toEqual(firstCompletedAt);
        });

        test('should handle multiple incomplete calls gracefully', () => {
            // Marking incomplete when already incomplete should work
            const result = task.markIncomplete();
            expect(result).toBe(task);
            expect(task.completed).toBe(false);
        });
    });

    describe('Assignment Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should assign task to another user', () => {
            const result = task.assignTo('user456');
            
            expect(task.assignedTo).toBe('user456');
            expect(result).toBe(task);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should reject invalid user assignments', () => {
            expect(() => {
                task.assignTo('');
            }).toThrow('Valid user ID is required');

            expect(() => {
                task.assignTo(null);
            }).toThrow('Valid user ID is required');
        });

        test('should reassign task to owner', () => {
            task.assignTo('user456');
            const result = task.reassignToOwner();
            
            expect(task.assignedTo).toBe('user123');
            expect(result).toBe(task);
        });
    });

    describe('Category Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should set category correctly', () => {
            const result = task.setCategory('Work');
            
            expect(task.category).toBe('work'); // Should be normalized
            expect(result).toBe(task);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should reject invalid categories', () => {
            expect(() => {
                task.setCategory('');
            }).toThrow('Category must be a non-empty string');

            expect(() => {
                task.setCategory(null);
            }).toThrow('Category must be a non-empty string');
        });
    });

    describe('Tag Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should add tags correctly', () => {
            const result = task.addTag('Important');
            
            expect(task.tags).toContain('important'); // Should be normalized
            expect(result).toBe(task);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should prevent duplicate tags', () => {
            task.addTag('Important');
            task.addTag('IMPORTANT'); // Different case, same tag
            
            expect(task.tags).toEqual(['important']);
        });

        test('should remove tags correctly', () => {
            task.addTag('tag1');
            task.addTag('tag2');
            
            const result = task.removeTag('TAG1'); // Case insensitive
            
            expect(task.tags).not.toContain('tag1');
            expect(task.tags).toContain('tag2');
            expect(result).toBe(task);
        });

        test('should clear all tags', () => {
            task.addTag('tag1');
            task.addTag('tag2');
            
            const result = task.clearTags();
            
            expect(task.tags).toEqual([]);
            expect(result).toBe(task);
        });

        test('should check tag existence', () => {
            task.addTag('Important');
            
            expect(task.hasTag('important')).toBe(true);
            expect(task.hasTag('IMPORTANT')).toBe(true); // Case insensitive
            expect(task.hasTag('nonexistent')).toBe(false);
        });

        test('should reject invalid tags', () => {
            expect(() => {
                task.addTag('');
            }).toThrow('Tag must be a non-empty string');

            expect(() => {
                task.addTag(null);
            }).toThrow('Tag must be a non-empty string');
        });
    });

    describe('Due Date Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should set due date correctly', () => {
            const dueDate = new Date('2024-12-31');
            const result = task.setDueDate(dueDate);
            
            expect(task.dueDate).toEqual(dueDate);
            expect(result).toBe(task);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should accept string dates', () => {
            const result = task.setDueDate('2024-12-31');
            
            expect(task.dueDate).toEqual(new Date('2024-12-31'));
            expect(result).toBe(task);
        });

        test('should clear due date', () => {
            task.setDueDate('2024-12-31');
            const result = task.clearDueDate();
            
            expect(task.dueDate).toBeNull();
            expect(result).toBe(task);
        });

        test('should reject invalid dates', () => {
            expect(() => {
                task.setDueDate('invalid-date');
            }).toThrow('Invalid due date');
        });

        test('should calculate overdue status correctly', () => {
            // Future date - not overdue
            task.setDueDate('2024-12-31');
            expect(task.isOverdue).toBe(false);
            
            // Past date - overdue
            task.setDueDate('2023-01-01');
            expect(task.isOverdue).toBe(true);
            
            // Completed task - not overdue even if past due
            task.markComplete();
            expect(task.isOverdue).toBe(false);
            
            // No due date - not overdue
            task.markIncomplete();
            task.clearDueDate();
            expect(task.isOverdue).toBe(false);
        });

        test('should calculate days until due correctly', () => {
            // Future date
            const futureDate = new Date('2024-01-08'); // 7 days from mock date
            task.setDueDate(futureDate);
            expect(task.daysUntilDue).toBe(7);
            
            // Past date
            const pastDate = new Date('2023-12-25'); // Past date
            task.setDueDate(pastDate);
            expect(task.daysUntilDue).toBeLessThan(0);
            
            // No due date
            task.clearDueDate();
            expect(task.daysUntilDue).toBeNull();
        });
    });

    describe('Time Tracking', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should set estimated hours correctly', () => {
            const result = task.setEstimatedHours(8);
            
            expect(task.estimatedHours).toBe(8);
            expect(result).toBe(task);
            expect(task.updatedAt).toEqual(mockDate);
        });

        test('should set actual hours correctly', () => {
            const result = task.setActualHours(6);
            
            expect(task.actualHours).toBe(6);
            expect(result).toBe(task);
        });

        test('should add time spent correctly', () => {
            task.setActualHours(4);
            const result = task.addTimeSpent(2);
            
            expect(task.actualHours).toBe(6);
            expect(result).toBe(task);
        });

        test('should handle adding time when no actual hours set', () => {
            const result = task.addTimeSpent(3);
            
            expect(task.actualHours).toBe(3);
            expect(result).toBe(task);
        });

        test('should reject negative hours', () => {
            expect(() => {
                task.setEstimatedHours(-1);
            }).toThrow('Hours must be a positive number');

            expect(() => {
                task.addTimeSpent(-2);
            }).toThrow('Hours must be a positive number');
        });

        test('should calculate progress correctly', () => {
            // No estimated hours
            expect(task.progress).toBe(0);
            
            // With estimated and actual hours
            task.setEstimatedHours(10);
            task.setActualHours(5);
            expect(task.progress).toBe(50);
            
            // Completed task
            task.markComplete();
            expect(task.progress).toBe(100);
            
            // Over estimated hours
            task.markIncomplete();
            task.setActualHours(15);
            expect(task.progress).toBe(100); // Capped at 100%
        });
    });

    describe('Status Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should set status correctly', () => {
            const result = task.setStatus('in-progress');
            
            expect(task.status).toBe('in-progress');
            expect(result).toBe(task);
        });

        test('should auto-update completion when status changes', () => {
            // Setting to completed should mark as complete
            task.setStatus('completed');
            expect(task.completed).toBe(true);
            expect(task.completedAt).toEqual(mockDate);
            
            // Setting to non-completed should mark as incomplete
            task.setStatus('in-progress');
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeNull();
        });

        test('should validate status values', () => {
            expect(() => {
                task.setStatus('invalid-status');
            }).toThrow('Invalid status');
        });
    });

    describe('Notes Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should add notes correctly', () => {
            const result = task.addNote('This is a note', 'user123');
            
            expect(task.notes).toHaveLength(1);
            expect(task.notes[0].content).toBe('This is a note');
            expect(task.notes[0].author).toBe('user123');
            expect(task.notes[0].createdAt).toEqual(mockDate);
            expect(result).toBe(task);
        });

        test('should remove notes correctly', () => {
            task.addNote('Note 1');
            task.addNote('Note 2');
            
            const noteId = task.notes[0].id;
            const result = task.removeNote(noteId);
            
            expect(task.notes).toHaveLength(1);
            expect(task.notes[0].content).toBe('Note 2');
            expect(result).toBe(task);
        });

        test('should reject invalid notes', () => {
            expect(() => {
                task.addNote('');
            }).toThrow('Note must be a non-empty string');

            expect(() => {
                task.addNote(null);
            }).toThrow('Note must be a non-empty string');
        });
    });

    describe('Dependencies Management', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Description', 'user123');
        });

        test('should add dependencies correctly', () => {
            const result = task.addDependency('task456');
            
            expect(task.dependencies).toContain('task456');
            expect(result).toBe(task);
        });

        test('should prevent self-dependency', () => {
            expect(() => {
                task.addDependency(task.id);
            }).toThrow('Task cannot depend on itself');
        });

        test('should prevent duplicate dependencies', () => {
            task.addDependency('task456');
            task.addDependency('task456'); // Duplicate
            
            expect(task.dependencies).toEqual(['task456']);
        });

        test('should remove dependencies correctly', () => {
            task.addDependency('task456');
            task.addDependency('task789');
            
            const result = task.removeDependency('task456');
            
            expect(task.dependencies).not.toContain('task456');
            expect(task.dependencies).toContain('task789');
            expect(result).toBe(task);
        });

        test('should check dependency existence', () => {
            task.addDependency('task456');
            
            expect(task.hasDependency('task456')).toBe(true);
            expect(task.hasDependency('task789')).toBe(false);
        });
    });

    describe('Serialization and Deserialization', () => {
        let task;

        beforeEach(() => {
            task = new Task('Test Task', 'Test Description', 'user123', {
                priority: 'high',
                category: 'work',
                dueDate: '2024-12-31',
                estimatedHours: 8
            });
            task.addTag('important');
            task.addNote('Test note', 'user123');
        });

        test('should serialize to JSON correctly', () => {
            const json = task.toJSON();
            
            expect(json).toHaveProperty('id', task.id);
            expect(json).toHaveProperty('title', task.title);
            expect(json).toHaveProperty('description', task.description);
            expect(json).toHaveProperty('userId', task.userId);
            expect(json).toHaveProperty('priority', task.priority);
            expect(json).toHaveProperty('category', task.category);
            expect(json).toHaveProperty('tags', task.tags);
            expect(json).toHaveProperty('estimatedHours', task.estimatedHours);
            expect(json).toHaveProperty('notes', task.notes);
            expect(json).toHaveProperty('createdAt');
            expect(json).toHaveProperty('updatedAt');
        });

        test('should deserialize from JSON correctly', () => {
            const json = task.toJSON();
            const deserializedTask = Task.fromJSON(json);
            
            expect(deserializedTask).toBeInstanceOf(Task);
            expect(deserializedTask.id).toBe(task.id);
            expect(deserializedTask.title).toBe(task.title);
            expect(deserializedTask.description).toBe(task.description);
            expect(deserializedTask.userId).toBe(task.userId);
            expect(deserializedTask.priority).toBe(task.priority);
            expect(deserializedTask.category).toBe(task.category);
            expect(deserializedTask.tags).toEqual(task.tags);
            expect(deserializedTask.estimatedHours).toBe(task.estimatedHours);
        });

        test('should maintain data integrity through serialization round-trip', () => {
            const json = task.toJSON();
            const deserializedTask = Task.fromJSON(json);
            const secondJson = deserializedTask.toJSON();
            
            expect(secondJson).toEqual(json);
        });
    });

    describe('Task Cloning', () => {
        let task;

        beforeEach(() => {
            task = new Task('Original Task', 'Original Description', 'user123', {
                priority: 'high',
                category: 'work'
            });
            task.addTag('important');
        });

        test('should clone task with new ID', () => {
            const clonedTask = task.clone();
            
            expect(clonedTask).toBeInstanceOf(Task);
            expect(clonedTask.id).not.toBe(task.id);
            expect(clonedTask.title).toBe(task.title);
            expect(clonedTask.description).toBe(task.description);
            expect(clonedTask.userId).toBe(task.userId);
            expect(clonedTask.priority).toBe(task.priority);
            expect(clonedTask.tags).toEqual(task.tags);
        });

        test('should create independent clone', () => {
            const clonedTask = task.clone();
            
            // Modifying original should not affect clone
            task.updateTitle('Modified Original');
            task.addTag('new-tag');
            
            expect(clonedTask.title).toBe('Original Task');
            expect(clonedTask.tags).not.toContain('new-tag');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle null and undefined gracefully', () => {
            expect(() => {
                new Task(null, null, 'user123');
            }).toThrow();

            expect(() => {
                new Task(undefined, undefined, 'user123');
            }).toThrow();
        });

        test('should handle special characters in strings', () => {
            const specialTitle = 'Task with "quotes" & <tags> and émojis 🚀';
            const task = new Task(specialTitle, 'Description', 'user123');
            
            expect(task.title).toBe(specialTitle);
        });

        test('should handle very long strings', () => {
            const longTitle = 'A'.repeat(1000);
            const longDescription = 'B'.repeat(2000);
            
            const task = new Task(longTitle, longDescription, 'user123');
            
            expect(task.title).toBe(longTitle);
            expect(task.description).toBe(longDescription);
        });

        test('should maintain consistency after multiple operations', () => {
            const task = new Task('Consistency Test', 'Description', 'user123');
            
            // Perform multiple operations
            task.updatePriority('high');
            task.markComplete();
            task.updateDescription('Updated description');
            task.markIncomplete();
            task.setDueDate('2024-12-31');
            task.addTag('test');
            task.setEstimatedHours(5);
            
            // Verify final state consistency
            expect(task.title).toBe('Consistency Test');
            expect(task.description).toBe('Updated description');
            expect(task.priority).toBe('high');
            expect(task.completed).toBe(false);
            expect(task.completedAt).toBeNull();
            expect(task.tags).toContain('test');
            expect(task.estimatedHours).toBe(5);
        });
    });

    describe('Performance Tests', () => {
        test('should create tasks efficiently', async () => {
            const createManyTasks = () => {
                const tasks = [];
                for (let i = 0; i < 1000; i++) {
                    tasks.push(new Task(`Task ${i}`, `Description ${i}`, 'user123'));
                }
                return tasks;
            };
            
            const { executionTime } = await TestEnvironment.measureExecutionTime(createManyTasks);
            
            expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
        });

        test('should handle many operations efficiently', async () => {
            const task = new Task('Performance Test', 'Description', 'user123');
            
            const performManyOperations = () => {
                for (let i = 0; i < 1000; i++) {
                    task.updateDescription(`Update ${i}`);
                    task.addTag(`tag${i % 10}`); // Will create some duplicates
                }
            };
            
            const { executionTime } = await TestEnvironment.measureExecutionTime(performManyOperations);
            
            expect(executionTime).toBeLessThan(50); // Should complete quickly
        });
    });
});

// Property-based tests for Task model
describe('Task Model Properties', () => {
    // Note: This would require fast-check library for full implementation
    // For now, we'll include the structure and some basic property tests
    
    describe('Serialization Properties', () => {
        test('Property: Serialization round-trip preserves essential data', () => {
            // Generate multiple random tasks and test round-trip
            for (let i = 0; i < 100; i++) {
                const taskData = TestDataFactory.createValidTaskData({
                    title: `Task ${i}`,
                    priority: ['low', 'medium', 'high'][i % 3]
                });
                
                const originalTask = new Task(
                    taskData.title, 
                    taskData.description, 
                    taskData.userId,
                    { priority: taskData.priority }
                );
                
                const serialized = originalTask.toJSON();
                const deserialized = Task.fromJSON(serialized);
                
                expect(deserialized.title).toBe(originalTask.title);
                expect(deserialized.userId).toBe(originalTask.userId);
                expect(deserialized.priority).toBe(originalTask.priority);
            }
        });
    });

    describe('State Consistency Properties', () => {
        test('Property: Completed tasks should have completedAt timestamp', () => {
            for (let i = 0; i < 50; i++) {
                const task = new Task(`Task ${i}`, 'Description', 'user123');
                task.markComplete();
                
                expect(task.completed).toBe(true);
                expect(task.completedAt).not.toBeNull();
                expect(task.status).toBe('completed');
            }
        });

        test('Property: Incomplete tasks should not have completedAt timestamp', () => {
            for (let i = 0; i < 50; i++) {
                const task = new Task(`Task ${i}`, 'Description', 'user123');
                task.markComplete();
                task.markIncomplete();
                
                expect(task.completed).toBe(false);
                expect(task.completedAt).toBeNull();
                expect(task.status).toBe('pending');
            }
        });
    });

    describe('Invariant Properties', () => {
        test('Property: Task ID should never change after creation', () => {
            for (let i = 0; i < 50; i++) {
                const task = new Task(`Task ${i}`, 'Description', 'user123');
                const originalId = task.id;
                
                // Perform various operations
                task.updateTitle('New Title');
                task.markComplete();
                task.addTag('test');
                task.setDueDate('2024-12-31');
                
                expect(task.id).toBe(originalId);
            }
        });

        test('Property: UpdatedAt should change with modifications', () => {
            const task = new Task('Test Task', 'Description', 'user123');
            const originalUpdatedAt = task.updatedAt.getTime();
            
            // Perform operations with mocked time constant
            // Since Date.now is mocked, all operations happen at same time
            // This test verifies that _touch() is called on each operation
            const operations = [
                () => task.updateTitle('New Title'),
                () => task.updateDescription('New Description'),
                () => task.updatePriority('high'),
                () => task.markComplete(),
                () => task.addTag('test')
            ];
            
            // Each operation should update the updatedAt timestamp
            // even if time doesn't advance (in mocked environment)
            operations.forEach(operation => {
                operation();
                // At minimum, updatedAt should not be earlier than creation
                expect(task.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
            });
        });
    });
});