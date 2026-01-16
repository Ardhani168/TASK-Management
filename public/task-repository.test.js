/**
 * Task Repository Tests - Day 3 Implementation
 * Comprehensive test suite for the Task Repository from Day 2
 * 
 * Feature: sample-project-refactor, Property 6: Repository Pattern Implementation
 * Validates: Requirements 3.2
 */

const { TestDataFactory, TestAssertions, MockFactory, TestEnvironment } = require('./test-utilities');

// Import the Task Repository and related classes
const { TaskRepository } = require('../day2-requirements-design/task-repository');
const Task = require('../day2-requirements-design/enhanced-task-model');

describe('Task Repository', () => {
    let repository;
    let mockStorage;

    beforeEach(() => {
        mockStorage = MockFactory.createMockStorage();
        repository = new TaskRepository(mockStorage);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Repository Initialization', () => {
        test('should initialize with storage manager', () => {
            expect(repository).toBeInstanceOf(TaskRepository);
            expect(repository.storage).toBe(mockStorage);
        });

        test('should set correct entity key', () => {
            expect(repository.entityKey).toBe('tasks');
        });

        test('should initialize empty cache', () => {
            expect(repository._cache).toBeInstanceOf(Map);
            expect(repository._cache.size).toBe(0);
        });
    });

    describe('Create Operations', () => {
        test('should create task successfully', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.userId, taskData);
            mockStorage.load.mockResolvedValue([]);
            mockStorage.save.mockResolvedValue(true);

            // Act
            const result = await repository.create(task);

            // Assert
            expect(result).toBe(task);
            expect(mockStorage.save).toHaveBeenCalledWith('tasks', [task.toJSON()]);
            expect(repository._cache.has(task.id)).toBe(true);
        });

        test('should generate ID if task does not have one', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.userId, taskData);
            delete task._id; // Remove ID to test generation
            mockStorage.load.mockResolvedValue([]);
            mockStorage.save.mockResolvedValue(true);

            // Act
            const result = await repository.create(task);

            // Assert
            expect(result.id).toBeDefined();
            expect(result.id).toMatch(/^task_/);
        });

        test('should prevent duplicate IDs', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const task1 = new Task(taskData.title, taskData.description, taskData.userId, taskData);
            const task2 = new Task('Another Task', 'Description', taskData.userId, { id: task1.id });
            
            mockStorage.load.mockResolvedValue([task1.toJSON()]);

            // Act & Assert
            await expect(repository.create(task2))
                .rejects
                .toThrow(`Task with ID ${task1.id} already exists`);
        });

        test('should validate task before creation', async () => {
            // Arrange
            const invalidTask = { title: '', userId: null };
            mockStorage.load.mockResolvedValue([]);

            // Act & Assert
            await expect(repository.create(invalidTask))
                .rejects
                .toThrow('Task title is required');
        });

        test('should handle storage errors during creation', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.userId, taskData);
            mockStorage.load.mockResolvedValue([]);
            mockStorage.save.mockRejectedValue(new Error('Storage error'));

            // Act & Assert
            await expect(repository.create(task))
                .rejects
                .toThrow('Storage error');
        });
    });

    describe('Read Operations', () => {
        let existingTasks;

        beforeEach(() => {
            existingTasks = TestDataFactory.createMultipleTasks(3).map(data => 
                new Task(data.title, data.description, data.userId, data).toJSON()
            );
            mockStorage.load.mockResolvedValue(existingTasks);
        });

        test('should find task by ID successfully', async () => {
            // Arrange
            const targetTask = existingTasks[0];

            // Act
            const result = await repository.findById(targetTask.id);

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBe(targetTask.id);
            expect(result.title).toBe(targetTask.title);
            expect(repository._cache.has(targetTask.id)).toBe(true);
        });

        test('should return null when task not found', async () => {
            // Act
            const result = await repository.findById('non-existent-id');

            // Assert
            expect(result).toBeNull();
        });

        test('should use cache for repeated requests', async () => {
            // Arrange
            const targetTask = existingTasks[0];

            // Act - First call
            await repository.findById(targetTask.id);
            // Act - Second call
            const result = await repository.findById(targetTask.id);

            // Assert
            expect(result).toBeDefined();
            expect(mockStorage.load).toHaveBeenCalledTimes(1); // Should only load once
        });

        test('should find all tasks without filters', async () => {
            // Act
            const result = await repository.findAll();

            // Assert
            expect(result).toHaveLength(existingTasks.length);
            expect(result[0]).toBeInstanceOf(Task);
        });

        test('should filter tasks by user ID', async () => {
            // Arrange
            const userId = existingTasks[0].userId;

            // Act
            const result = await repository.findAll({ userId });

            // Assert
            expect(result.length).toBeGreaterThan(0);
            result.forEach(task => {
                expect(task.userId).toBe(userId);
            });
        });

        test('should filter tasks by completion status', async () => {
            // Arrange
            existingTasks[0].completed = true;
            mockStorage.load.mockResolvedValue(existingTasks);

            // Act
            const completedTasks = await repository.findAll({ completed: true });
            const incompleteTasks = await repository.findAll({ completed: false });

            // Assert
            expect(completedTasks).toHaveLength(1);
            expect(incompleteTasks).toHaveLength(2);
        });

        test('should filter tasks by priority', async () => {
            // Arrange
            existingTasks[0].priority = 'high';
            mockStorage.load.mockResolvedValue(existingTasks);

            // Act
            const result = await repository.findAll({ priority: 'high' });

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].priority).toBe('high');
        });

        test('should sort tasks correctly', async () => {
            // Act
            const result = await repository.findAll({ 
                sortBy: 'title', 
                sortOrder: 'asc' 
            });

            // Assert
            expect(result).toHaveLength(existingTasks.length);
            for (let i = 1; i < result.length; i++) {
                expect(result[i].title >= result[i-1].title).toBe(true);
            }
        });

        test('should apply pagination correctly', async () => {
            // Act
            const result = await repository.findAll({ 
                limit: 2, 
                offset: 1 
            });

            // Assert
            expect(result).toHaveLength(2);
        });

        test('should handle storage errors during read', async () => {
            // Arrange
            mockStorage.load.mockRejectedValue(new Error('Storage error'));

            // Act & Assert
            await expect(repository.findById('any-id'))
                .rejects
                .toThrow('Storage error');
        });
    });

    describe('Update Operations', () => {
        let existingTasks;

        beforeEach(() => {
            existingTasks = TestDataFactory.createMultipleTasks(3).map(data => 
                new Task(data.title, data.description, data.userId, data).toJSON()
            );
            mockStorage.load.mockResolvedValue(existingTasks);
            mockStorage.save.mockResolvedValue(true);
        });

        test('should update task successfully', async () => {
            // Arrange
            const targetTask = existingTasks[0];
            const updates = { title: 'Updated Title', priority: 'high' };

            // Act
            const result = await repository.update(targetTask.id, updates);

            // Assert
            expect(result).toBeDefined();
            expect(result.title).toBe('Updated Title');
            expect(result.priority).toBe('high');
            expect(mockStorage.save).toHaveBeenCalled();
            expect(repository._cache.has(targetTask.id)).toBe(true);
        });

        test('should return null when updating non-existent task', async () => {
            // Act
            const result = await repository.update('non-existent-id', { title: 'New Title' });

            // Assert
            expect(result).toBeNull();
            expect(mockStorage.save).not.toHaveBeenCalled();
        });

        test('should use setter methods when available', async () => {
            // Arrange
            const targetTask = existingTasks[0];
            const updates = { title: 'Updated Title' };

            // Act
            const result = await repository.update(targetTask.id, updates);

            // Assert
            expect(result.title).toBe('Updated Title');
            expect(result.updatedAt).toBeDefined();
        });

        test('should handle storage errors during update', async () => {
            // Arrange
            const targetTask = existingTasks[0];
            mockStorage.save.mockRejectedValue(new Error('Storage error'));

            // Act & Assert
            await expect(repository.update(targetTask.id, { title: 'New Title' }))
                .rejects
                .toThrow('Storage error');
        });
    });

    describe('Delete Operations', () => {
        let existingTasks;

        beforeEach(() => {
            existingTasks = TestDataFactory.createMultipleTasks(3).map(data => 
                new Task(data.title, data.description, data.userId, data).toJSON()
            );
            mockStorage.load.mockResolvedValue(existingTasks);
            mockStorage.save.mockResolvedValue(true);
        });

        test('should delete task successfully', async () => {
            // Arrange
            const targetTask = existingTasks[0];

            // Act
            const result = await repository.delete(targetTask.id);

            // Assert
            expect(result).toBe(true);
            expect(mockStorage.save).toHaveBeenCalled();
            expect(repository._cache.has(targetTask.id)).toBe(false);
        });

        test('should return false when deleting non-existent task', async () => {
            // Act
            const result = await repository.delete('non-existent-id');

            // Assert
            expect(result).toBe(false);
            expect(mockStorage.save).not.toHaveBeenCalled();
        });

        test('should handle storage errors during deletion', async () => {
            // Arrange
            const targetTask = existingTasks[0];
            mockStorage.save.mockRejectedValue(new Error('Storage error'));

            // Act & Assert
            await expect(repository.delete(targetTask.id))
                .rejects
                .toThrow('Storage error');
        });
    });

    describe('Specialized Query Methods', () => {
        let existingTasks;

        beforeEach(() => {
            existingTasks = [
                new Task('Task 1', 'Description', 'user123', { 
                    category: 'work', 
                    priority: 'high',
                    completed: false,
                    assignedTo: 'user123',
                    dueDate: '2023-01-01' // Past date
                }).toJSON(),
                new Task('Task 2', 'Description', 'user456', { 
                    category: 'personal', 
                    priority: 'medium',
                    completed: true,
                    assignedTo: 'user789'
                }).toJSON(),
                new Task('Task 3', 'Description', 'user123', { 
                    category: 'work', 
                    priority: 'low',
                    completed: false,
                    assignedTo: 'user456',
                    dueDate: '2024-12-31' // Future date
                }).toJSON()
            ];
            mockStorage.load.mockResolvedValue(existingTasks);
        });

        test('should find tasks by user ID', async () => {
            // Act
            const result = await repository.findByUserId('user123');

            // Assert
            expect(result).toHaveLength(2);
            result.forEach(task => {
                expect(task.userId).toBe('user123');
            });
        });

        test('should find tasks by category', async () => {
            // Act
            const result = await repository.findByCategory('work');

            // Assert
            expect(result).toHaveLength(2);
            result.forEach(task => {
                expect(task.category).toBe('work');
            });
        });

        test('should find tasks by priority', async () => {
            // Act
            const result = await repository.findByPriority('high');

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].priority).toBe('high');
        });

        test('should find tasks by completion status', async () => {
            // Act
            const completedTasks = await repository.findByStatus(true);
            const incompleteTasks = await repository.findByStatus(false);

            // Assert
            expect(completedTasks).toHaveLength(1);
            expect(incompleteTasks).toHaveLength(2);
        });

        test('should find tasks by assignee', async () => {
            // Act
            const result = await repository.findByAssignee('user456');

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].assignedTo).toBe('user456');
        });

        test('should find overdue tasks', async () => {
            // Act
            const result = await repository.findOverdue();

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].dueDate).toBe('2023-01-01');
            expect(result[0].completed).toBe(false);
        });

        test('should find tasks by due date range', async () => {
            // Arrange
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            // Act
            const result = await repository.findByDueDateRange(startDate, endDate);

            // Assert
            expect(result).toHaveLength(1);
            expect(new Date(result[0].dueDate)).toBeInstanceOf(Date);
        });

        test('should search tasks by text', async () => {
            // Arrange
            existingTasks[0].title = 'Important project task';
            existingTasks[0].tags = ['important', 'urgent'];
            mockStorage.load.mockResolvedValue(existingTasks);

            // Act
            const titleResult = await repository.search('project');
            const tagResult = await repository.search('important');

            // Assert
            expect(titleResult).toHaveLength(1);
            expect(tagResult).toHaveLength(1);
        });
    });

    describe('Statistics and Analytics', () => {
        let existingTasks;

        beforeEach(() => {
            existingTasks = [
                new Task('Task 1', 'Description', 'user123', { 
                    category: 'work', 
                    priority: 'high',
                    completed: false,
                    dueDate: '2023-01-01' // Overdue
                }).toJSON(),
                new Task('Task 2', 'Description', 'user123', { 
                    category: 'personal', 
                    priority: 'medium',
                    completed: true
                }).toJSON(),
                new Task('Task 3', 'Description', 'user456', { 
                    category: 'work', 
                    priority: 'low',
                    completed: false
                }).toJSON()
            ];
            mockStorage.load.mockResolvedValue(existingTasks);
        });

        test('should calculate overall statistics', async () => {
            // Act
            const stats = await repository.getStatistics();

            // Assert
            expect(stats.total).toBe(3);
            expect(stats.completed).toBe(1);
            expect(stats.pending).toBe(2);
            expect(stats.overdue).toBe(1);
            expect(stats.byPriority.high).toBe(1);
            expect(stats.byPriority.medium).toBe(1);
            expect(stats.byPriority.low).toBe(1);
            expect(stats.byCategory.work).toBe(2);
            expect(stats.byCategory.personal).toBe(1);
        });

        test('should calculate user-specific statistics', async () => {
            // Act
            const stats = await repository.getStatistics('user123');

            // Assert
            expect(stats.total).toBe(2);
            expect(stats.completed).toBe(1);
            expect(stats.pending).toBe(1);
        });
    });

    describe('Caching Behavior', () => {
        let existingTasks;

        beforeEach(() => {
            existingTasks = TestDataFactory.createMultipleTasks(2).map(data => 
                new Task(data.title, data.description, data.userId, data).toJSON()
            );
            mockStorage.load.mockResolvedValue(existingTasks);
        });

        test('should cache retrieved tasks', async () => {
            // Arrange
            const targetTask = existingTasks[0];

            // Act
            await repository.findById(targetTask.id);

            // Assert
            expect(repository._cache.has(targetTask.id)).toBe(true);
        });

        test('should use cached data for subsequent requests', async () => {
            // Arrange
            const targetTask = existingTasks[0];

            // Act
            await repository.findById(targetTask.id);
            const result = await repository.findById(targetTask.id);

            // Assert
            expect(result).toBeDefined();
            expect(mockStorage.load).toHaveBeenCalledTimes(1);
        });

        test('should expire cache entries after timeout', async () => {
            // Arrange
            const targetTask = existingTasks[0];
            repository._cacheExpiry = 100; // 100ms expiry for testing

            // Act
            await repository.findById(targetTask.id);
            
            // Wait for cache to expire
            await new Promise(resolve => setTimeout(resolve, 150));
            
            await repository.findById(targetTask.id);

            // Assert
            expect(mockStorage.load).toHaveBeenCalledTimes(2);
        });

        test('should update cache on create operations', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.userId, taskData);
            mockStorage.load.mockResolvedValue([]);
            mockStorage.save.mockResolvedValue(true);

            // Act
            await repository.create(task);

            // Assert
            expect(repository._cache.has(task.id)).toBe(true);
        });

        test('should update cache on update operations', async () => {
            // Arrange
            const targetTask = existingTasks[0];
            mockStorage.save.mockResolvedValue(true);

            // Act
            const result = await repository.update(targetTask.id, { title: 'Updated' });

            // Assert
            expect(repository._cache.has(targetTask.id)).toBe(true);
            const cached = repository._cache.get(targetTask.id);
            expect(cached.data.title).toBe('Updated');
        });

        test('should remove from cache on delete operations', async () => {
            // Arrange
            const targetTask = existingTasks[0];
            await repository.findById(targetTask.id); // Cache the task
            mockStorage.save.mockResolvedValue(true);

            // Act
            await repository.delete(targetTask.id);

            // Assert
            expect(repository._cache.has(targetTask.id)).toBe(false);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle empty storage gracefully', async () => {
            // Arrange
            mockStorage.load.mockResolvedValue([]);

            // Act
            const result = await repository.findAll();

            // Assert
            expect(result).toEqual([]);
        });

        test('should handle malformed data in storage', async () => {
            // Arrange
            const malformedData = [
                { id: 'task1', title: 'Valid Task', userId: 'user123' },
                { id: 'task2' }, // Missing required fields
                null, // Null entry
                'invalid' // String instead of object
            ];
            mockStorage.load.mockResolvedValue(malformedData);

            // Act & Assert
            // Should handle gracefully and process valid entries
            const result = await repository.findAll();
            expect(result.length).toBeGreaterThan(0);
        });

        test('should validate task objects before operations', async () => {
            // Arrange
            const invalidTask = { title: '', userId: null };

            // Act & Assert
            await expect(repository.create(invalidTask))
                .rejects
                .toThrow();
        });

        test('should handle concurrent access gracefully', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const task = new Task(taskData.title, taskData.description, taskData.userId, taskData);
            mockStorage.load.mockResolvedValue([]);
            mockStorage.save.mockResolvedValue(true);

            // Act - Simulate concurrent operations
            const operations = [
                repository.create(task),
                repository.findById(task.id),
                repository.update(task.id, { title: 'Updated' })
            ];

            // Assert - Should not throw errors
            await expect(Promise.all(operations)).resolves.toBeDefined();
        });
    });

    describe('Performance Tests', () => {
        test('should handle large datasets efficiently', async () => {
            // Arrange
            const largeTasks = Array.from({ length: 1000 }, (_, i) => 
                new Task(`Task ${i}`, 'Description', 'user123').toJSON()
            );
            mockStorage.load.mockResolvedValue(largeTasks);

            // Act
            const startTime = performance.now();
            const result = await repository.findAll();
            const endTime = performance.now();

            // Assert
            expect(result).toHaveLength(1000);
            expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
        });

        test('should cache frequently accessed tasks efficiently', async () => {
            // Arrange
            const tasks = TestDataFactory.createMultipleTasks(10).map(data => 
                new Task(data.title, data.description, data.userId, data).toJSON()
            );
            mockStorage.load.mockResolvedValue(tasks);

            // Act - Access same task multiple times
            const taskId = tasks[0].id;
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                await repository.findById(taskId);
            }
            
            const endTime = performance.now();

            // Assert
            expect(endTime - startTime).toBeLessThan(50); // Should be very fast due to caching
            expect(mockStorage.load).toHaveBeenCalledTimes(1); // Only one storage call
        });
    });

    describe('Base Repository Interface Compliance', () => {
        test('should implement all base repository methods', () => {
            expect(typeof repository.create).toBe('function');
            expect(typeof repository.findById).toBe('function');
            expect(typeof repository.findAll).toBe('function');
            expect(typeof repository.update).toBe('function');
            expect(typeof repository.delete).toBe('function');
            expect(typeof repository.exists).toBe('function');
            expect(typeof repository.count).toBe('function');
        });

        test('should implement exists method correctly', async () => {
            // Arrange
            const existingTasks = TestDataFactory.createMultipleTasks(1).map(data => 
                new Task(data.title, data.description, data.userId, data).toJSON()
            );
            mockStorage.load.mockResolvedValue(existingTasks);

            // Act & Assert
            const exists = await repository.exists(existingTasks[0].id);
            const notExists = await repository.exists('non-existent-id');

            expect(exists).toBe(true);
            expect(notExists).toBe(false);
        });

        test('should implement count method correctly', async () => {
            // Arrange
            const existingTasks = TestDataFactory.createMultipleTasks(5).map(data => 
                new Task(data.title, data.description, data.userId, data).toJSON()
            );
            mockStorage.load.mockResolvedValue(existingTasks);

            // Act
            const count = await repository.count();

            // Assert
            expect(count).toBe(5);
        });
    });
});