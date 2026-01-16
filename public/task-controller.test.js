/**
 * Task Controller Tests - Day 3 Implementation
 * Comprehensive test suite for the Task Controller from Day 2
 * 
 * Feature: sample-project-refactor, Property 3: MVC Separation Compliance
 * Validates: Requirements 3.1, 3.5
 */

const { TestDataFactory, TestAssertions, MockFactory, TestEnvironment } = require('./test-utilities');

// Import the Task Controller and related classes
const { TaskController } = require('../day2-requirements-design/task-controller');

describe('Task Controller', () => {
    let controller;
    let mockTaskService;
    let mockUserService;
    let mockTaskView;
    let mockUser;

    beforeEach(() => {
        // Create mock dependencies
        mockTaskService = MockFactory.createMockService();
        mockUserService = MockFactory.createMockService();
        mockTaskView = MockFactory.createMockView();
        
        // Create mock user
        mockUser = TestDataFactory.createUser({ id: 'user123', isAdmin: false });
        mockUserService.getUserById.mockResolvedValue(mockUser);
        
        // Initialize controller
        controller = new TaskController(mockTaskService, mockUserService, mockTaskView);
        
        // Set up DOM environment
        TestEnvironment.setupDOM();
    });

    afterEach(() => {
        jest.clearAllMocks();
        TestEnvironment.cleanupDOM();
    });

    describe('Controller Initialization', () => {
        test('should initialize with required dependencies', () => {
            expect(controller).toBeInstanceOf(TaskController);
            expect(controller.taskService).toBe(mockTaskService);
            expect(controller.userService).toBe(mockUserService);
            expect(controller.taskView).toBe(mockTaskView);
        });

        test('should initialize with default values', () => {
            expect(controller.currentUser).toBeNull();
            expect(controller.currentFilter).toBe('all');
        });

        test('should set up service listeners during construction', () => {
            // Verify that listeners are set up if services support them
            if (mockTaskService.addListener) {
                expect(mockTaskService.addListener).toHaveBeenCalled();
            }
            if (mockTaskView.addListener) {
                expect(mockTaskView.addListener).toHaveBeenCalled();
            }
        });

        test('should initialize successfully with valid user', async () => {
            // Act
            await controller.initialize('user123');

            // Assert
            expect(controller.currentUser).toBe(mockUser);
            expect(mockUserService.getUserById).toHaveBeenCalledWith('user123');
            
            if (mockTaskView.initialize) {
                expect(mockTaskView.initialize).toHaveBeenCalledWith(mockUser);
            }
        });

        test('should throw error when user not found during initialization', async () => {
            // Arrange
            mockUserService.getUserById.mockResolvedValue(null);

            // Act & Assert
            await expect(controller.initialize('invalid-user'))
                .rejects
                .toThrow('User not found');
        });

        test('should refresh tasks after initialization', async () => {
            // Arrange
            mockTaskService.getTasksForUser = jest.fn().mockResolvedValue([]);

            // Act
            await controller.initialize('user123');

            // Assert
            expect(mockTaskService.getTasksForUser).toHaveBeenCalledWith('user123');
        });
    });

    describe('Task Creation', () => {
        beforeEach(async () => {
            await controller.initialize('user123');
        });

        test('should create task successfully with valid data', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const createdTask = TestDataFactory.createTaskFromData(taskData);
            mockTaskService.createTask.mockResolvedValue(createdTask);

            // Act
            const result = await controller.createTask(taskData);

            // Assert
            expect(result).toBe(createdTask);
            expect(mockTaskService.createTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...taskData,
                    userId: 'user123',
                    assignedTo: taskData.assignedTo || 'user123'
                })
            );
            
            if (mockTaskView.addTask) {
                expect(mockTaskView.addTask).toHaveBeenCalledWith(createdTask);
            }
        });

        test('should validate required fields before creation', async () => {
            // Arrange
            const invalidData = { description: 'No title' };

            // Act & Assert
            await expect(controller.createTask(invalidData))
                .rejects
                .toThrow('Missing required parameters: title');

            expect(mockTaskService.createTask).not.toHaveBeenCalled();
        });

        test('should set current user as owner and assignee by default', async () => {
            // Arrange
            const taskData = { title: 'Test Task' };
            const createdTask = TestDataFactory.createTaskFromData(taskData);
            mockTaskService.createTask.mockResolvedValue(createdTask);

            // Act
            await controller.createTask(taskData);

            // Assert
            expect(mockTaskService.createTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user123',
                    assignedTo: 'user123'
                })
            );
        });

        test('should handle service errors during creation', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            mockTaskService.createTask.mockRejectedValue(new Error('Service error'));

            // Act & Assert
            await expect(controller.createTask(taskData))
                .rejects
                .toThrow('Service error');
        });

        test('should emit event after successful creation', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            const createdTask = TestDataFactory.createTaskFromData(taskData);
            mockTaskService.createTask.mockResolvedValue(createdTask);
            
            const eventSpy = jest.fn();
            controller.addListener(eventSpy);

            // Act
            await controller.createTask(taskData);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith('taskCreated', createdTask);
        });
    });

    describe('Task Updates', () => {
        let existingTask;

        beforeEach(async () => {
            await controller.initialize('user123');
            existingTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'user123',
                assignedTo: 'user123'
            });
            mockTaskService.getTaskById.mockResolvedValue(existingTask);
        });

        test('should update task successfully with valid data', async () => {
            // Arrange
            const updates = { title: 'Updated Title', priority: 'high' };
            const updatedTask = { ...existingTask, ...updates };
            mockTaskService.updateTask.mockResolvedValue(updatedTask);

            // Act
            const result = await controller.updateTask('task123', updates);

            // Assert
            expect(result).toBe(updatedTask);
            expect(mockTaskService.updateTask).toHaveBeenCalledWith('task123', updates);
            
            if (mockTaskView.updateTask) {
                expect(mockTaskView.updateTask).toHaveBeenCalledWith(updatedTask);
            }
        });

        test('should validate task ID before update', async () => {
            // Act & Assert
            await expect(controller.updateTask('', { title: 'New Title' }))
                .rejects
                .toThrow('Missing required parameters: taskId');

            expect(mockTaskService.getTaskById).not.toHaveBeenCalled();
        });

        test('should check permissions before update', async () => {
            // Arrange
            const unauthorizedTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'other-user',
                assignedTo: 'other-user'
            });
            mockTaskService.getTaskById.mockResolvedValue(unauthorizedTask);

            // Act & Assert
            await expect(controller.updateTask('task123', { title: 'New Title' }))
                .rejects
                .toThrow('Permission denied: Cannot modify this task');

            expect(mockTaskService.updateTask).not.toHaveBeenCalled();
        });

        test('should allow admin users to update any task', async () => {
            // Arrange
            controller.currentUser.isAdmin = true;
            const otherUserTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'other-user',
                assignedTo: 'other-user'
            });
            mockTaskService.getTaskById.mockResolvedValue(otherUserTask);
            mockTaskService.updateTask.mockResolvedValue(otherUserTask);

            // Act
            const result = await controller.updateTask('task123', { title: 'Admin Update' });

            // Assert
            expect(result).toBeDefined();
            expect(mockTaskService.updateTask).toHaveBeenCalled();
        });

        test('should emit event after successful update', async () => {
            // Arrange
            const updates = { title: 'Updated Title' };
            const updatedTask = { ...existingTask, ...updates };
            mockTaskService.updateTask.mockResolvedValue(updatedTask);
            
            const eventSpy = jest.fn();
            controller.addListener(eventSpy);

            // Act
            await controller.updateTask('task123', updates);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith('taskUpdated', updatedTask);
        });
    });

    describe('Task Deletion', () => {
        let existingTask;

        beforeEach(async () => {
            await controller.initialize('user123');
            existingTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'user123',
                assignedTo: 'user123'
            });
            mockTaskService.getTaskById.mockResolvedValue(existingTask);
        });

        test('should delete task successfully', async () => {
            // Arrange
            mockTaskService.deleteTask.mockResolvedValue(true);
            if (mockTaskView.confirmDeletion) {
                mockTaskView.confirmDeletion.mockResolvedValue(true);
            }

            // Act
            const result = await controller.deleteTask('task123');

            // Assert
            expect(result).toBe(true);
            expect(mockTaskService.deleteTask).toHaveBeenCalledWith('task123');
            
            if (mockTaskView.removeTask) {
                expect(mockTaskView.removeTask).toHaveBeenCalledWith('task123');
            }
        });

        test('should check permissions before deletion', async () => {
            // Arrange
            const unauthorizedTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'other-user',
                assignedTo: 'other-user'
            });
            mockTaskService.getTaskById.mockResolvedValue(unauthorizedTask);

            // Act & Assert
            await expect(controller.deleteTask('task123'))
                .rejects
                .toThrow('Permission denied: Cannot delete this task');

            expect(mockTaskService.deleteTask).not.toHaveBeenCalled();
        });

        test('should handle user cancellation of deletion', async () => {
            // Arrange
            if (mockTaskView.confirmDeletion) {
                mockTaskView.confirmDeletion.mockResolvedValue(false);
            }

            // Act
            const result = await controller.deleteTask('task123');

            // Assert
            expect(result).toBe(false);
            expect(mockTaskService.deleteTask).not.toHaveBeenCalled();
        });

        test('should emit event after successful deletion', async () => {
            // Arrange
            mockTaskService.deleteTask.mockResolvedValue(true);
            if (mockTaskView.confirmDeletion) {
                mockTaskView.confirmDeletion.mockResolvedValue(true);
            }
            
            const eventSpy = jest.fn();
            controller.addListener(eventSpy);

            // Act
            await controller.deleteTask('task123');

            // Assert
            expect(eventSpy).toHaveBeenCalledWith('taskDeleted', 
                expect.objectContaining({ taskId: 'task123', task: existingTask })
            );
        });
    });

    describe('Task Completion Toggle', () => {
        let existingTask;

        beforeEach(async () => {
            await controller.initialize('user123');
            existingTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'user123',
                completed: false
            });
            mockTaskService.getTaskById.mockResolvedValue(existingTask);
        });

        test('should toggle task completion successfully', async () => {
            // Arrange
            const updatedTask = { ...existingTask, completed: true };
            mockTaskService.updateTask.mockResolvedValue(updatedTask);

            // Act
            const result = await controller.toggleTaskCompletion('task123');

            // Assert
            expect(result).toBe(updatedTask);
            expect(mockTaskService.updateTask).toHaveBeenCalledWith('task123', { completed: true });
        });

        test('should handle non-existent task', async () => {
            // Arrange
            mockTaskService.getTaskById.mockResolvedValue(null);

            // Act & Assert
            await expect(controller.toggleTaskCompletion('non-existent'))
                .rejects
                .toThrow('Task not found');
        });
    });

    describe('Task Assignment', () => {
        let existingTask;

        beforeEach(async () => {
            await controller.initialize('user123');
            existingTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'user123'
            });
            mockTaskService.getTaskById.mockResolvedValue(existingTask);
        });

        test('should assign task to valid user', async () => {
            // Arrange
            const assignee = TestDataFactory.createUser({ id: 'user456' });
            mockUserService.getUserById.mockResolvedValue(assignee);
            const updatedTask = { ...existingTask, assignedTo: 'user456' };
            mockTaskService.updateTask.mockResolvedValue(updatedTask);

            // Act
            const result = await controller.assignTask('task123', 'user456');

            // Assert
            expect(result).toBe(updatedTask);
            expect(mockUserService.getUserById).toHaveBeenCalledWith('user456');
            expect(mockTaskService.updateTask).toHaveBeenCalledWith('task123', { assignedTo: 'user456' });
        });

        test('should validate assignee exists', async () => {
            // Arrange
            mockUserService.getUserById.mockResolvedValue(null);

            // Act & Assert
            await expect(controller.assignTask('task123', 'invalid-user'))
                .rejects
                .toThrow('Assignee not found');

            expect(mockTaskService.updateTask).not.toHaveBeenCalled();
        });

        test('should validate required parameters', async () => {
            // Act & Assert
            await expect(controller.assignTask('', 'user456'))
                .rejects
                .toThrow('Missing required parameters');

            await expect(controller.assignTask('task123', ''))
                .rejects
                .toThrow('Missing required parameters');
        });
    });

    describe('Task Filtering', () => {
        let mockTasks;

        beforeEach(async () => {
            await controller.initialize('user123');
            mockTasks = TestDataFactory.createMultipleTasks(5).map(data => 
                TestDataFactory.createTaskFromData(data)
            );
        });

        test('should filter all tasks', async () => {
            // Arrange
            mockTaskService.getTasksForUser.mockResolvedValue(mockTasks);

            // Act
            const result = await controller.filterTasks('all');

            // Assert
            expect(result).toBe(mockTasks);
            expect(mockTaskService.getTasksForUser).toHaveBeenCalledWith('user123');
            expect(controller.currentFilter).toBe('all');
        });

        test('should filter pending tasks', async () => {
            // Arrange
            const pendingTasks = mockTasks.filter(t => !t.completed);
            mockTaskService.getPendingTasks.mockResolvedValue(pendingTasks);

            // Act
            const result = await controller.filterTasks('pending');

            // Assert
            expect(result).toBe(pendingTasks);
            expect(mockTaskService.getPendingTasks).toHaveBeenCalledWith('user123');
        });

        test('should filter completed tasks', async () => {
            // Arrange
            const completedTasks = mockTasks.filter(t => t.completed);
            mockTaskService.getCompletedTasks.mockResolvedValue(completedTasks);

            // Act
            const result = await controller.filterTasks('completed');

            // Assert
            expect(result).toBe(completedTasks);
            expect(mockTaskService.getCompletedTasks).toHaveBeenCalledWith('user123');
        });

        test('should filter overdue tasks', async () => {
            // Arrange
            const overdueTasks = mockTasks.filter(t => t.isOverdue);
            mockTaskService.getOverdueTasks.mockResolvedValue(overdueTasks);

            // Act
            const result = await controller.filterTasks('overdue');

            // Assert
            expect(result).toBe(overdueTasks);
            expect(mockTaskService.getOverdueTasks).toHaveBeenCalledWith('user123');
        });

        test('should filter by priority', async () => {
            // Arrange
            const highPriorityTasks = mockTasks.filter(t => t.priority === 'high');
            mockTaskService.getTasksByPriority.mockResolvedValue(highPriorityTasks);

            // Act
            const result = await controller.filterTasks('priority', 'high');

            // Assert
            expect(result).toBe(highPriorityTasks);
            expect(mockTaskService.getTasksByPriority).toHaveBeenCalledWith('user123', 'high');
        });

        test('should filter by category', async () => {
            // Arrange
            const workTasks = mockTasks.filter(t => t.category === 'work');
            mockTaskService.getTasksByCategory.mockResolvedValue(workTasks);

            // Act
            const result = await controller.filterTasks('category', 'work');

            // Assert
            expect(result).toBe(workTasks);
            expect(mockTaskService.getTasksByCategory).toHaveBeenCalledWith('user123', 'work');
        });

        test('should handle unknown filter types', async () => {
            // Act & Assert
            await expect(controller.filterTasks('unknown'))
                .rejects
                .toThrow('Unknown filter type: unknown');
        });

        test('should update view after filtering', async () => {
            // Arrange
            mockTaskService.getTasksForUser.mockResolvedValue(mockTasks);

            // Act
            await controller.filterTasks('all');

            // Assert
            if (mockTaskView.displayTasks) {
                expect(mockTaskView.displayTasks).toHaveBeenCalledWith(mockTasks, 'all');
            }
        });

        test('should emit event after filtering', async () => {
            // Arrange
            mockTaskService.getTasksForUser.mockResolvedValue(mockTasks);
            const eventSpy = jest.fn();
            controller.addListener(eventSpy);

            // Act
            await controller.filterTasks('all');

            // Assert
            expect(eventSpy).toHaveBeenCalledWith('tasksFiltered', 
                expect.objectContaining({ 
                    filterType: 'all', 
                    count: mockTasks.length 
                })
            );
        });
    });

    describe('Task Search', () => {
        let mockTasks;

        beforeEach(async () => {
            await controller.initialize('user123');
            mockTasks = TestDataFactory.createMultipleTasks(3).map(data => 
                TestDataFactory.createTaskFromData(data)
            );
        });

        test('should search tasks with query', async () => {
            // Arrange
            const query = 'important';
            const searchResults = mockTasks.slice(0, 2);
            mockTaskService.searchTasks.mockResolvedValue(searchResults);

            // Act
            const result = await controller.searchTasks(query);

            // Assert
            expect(result).toBe(searchResults);
            expect(mockTaskService.searchTasks).toHaveBeenCalledWith('user123', query);
        });

        test('should handle empty query by showing current filter', async () => {
            // Arrange
            controller.currentFilter = 'pending';
            mockTaskService.getPendingTasks.mockResolvedValue(mockTasks);

            // Act
            const result = await controller.searchTasks('');

            // Assert
            expect(result).toBe(mockTasks);
            expect(mockTaskService.getPendingTasks).toHaveBeenCalledWith('user123');
        });

        test('should trim whitespace from query', async () => {
            // Arrange
            const query = '  important  ';
            const searchResults = mockTasks.slice(0, 1);
            mockTaskService.searchTasks.mockResolvedValue(searchResults);

            // Act
            await controller.searchTasks(query);

            // Assert
            expect(mockTaskService.searchTasks).toHaveBeenCalledWith('user123', 'important');
        });

        test('should update view with search results', async () => {
            // Arrange
            const query = 'test';
            const searchResults = mockTasks.slice(0, 1);
            mockTaskService.searchTasks.mockResolvedValue(searchResults);

            // Act
            await controller.searchTasks(query);

            // Assert
            if (mockTaskView.displayTasks) {
                expect(mockTaskView.displayTasks).toHaveBeenCalledWith(searchResults, 'search');
            }
        });

        test('should emit event after search', async () => {
            // Arrange
            const query = 'test';
            const searchResults = mockTasks.slice(0, 1);
            mockTaskService.searchTasks.mockResolvedValue(searchResults);
            const eventSpy = jest.fn();
            controller.addListener(eventSpy);

            // Act
            await controller.searchTasks(query);

            // Assert
            expect(eventSpy).toHaveBeenCalledWith('tasksSearched', 
                expect.objectContaining({ 
                    query, 
                    count: searchResults.length 
                })
            );
        });
    });

    describe('Task Statistics', () => {
        beforeEach(async () => {
            await controller.initialize('user123');
        });

        test('should update task statistics', async () => {
            // Arrange
            const stats = {
                total: 10,
                completed: 3,
                pending: 7,
                overdue: 2
            };
            mockTaskService.getTaskStats.mockResolvedValue(stats);

            // Act
            const result = await controller.updateTaskStats();

            // Assert
            expect(result).toBe(stats);
            expect(mockTaskService.getTaskStats).toHaveBeenCalledWith('user123');
            
            if (mockTaskView.displayStats) {
                expect(mockTaskView.displayStats).toHaveBeenCalledWith(stats);
            }
        });
    });

    describe('Time Tracking', () => {
        let existingTask;

        beforeEach(async () => {
            await controller.initialize('user123');
            existingTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'user123',
                actualHours: 5
            });
            mockTaskService.getTaskById.mockResolvedValue(existingTask);
        });

        test('should add time spent to task', async () => {
            // Arrange
            const hoursToAdd = 2;
            const updatedTask = { ...existingTask, actualHours: 7 };
            mockTaskService.updateTask.mockResolvedValue(updatedTask);

            // Act
            const result = await controller.addTimeSpent('task123', hoursToAdd);

            // Assert
            expect(result).toBe(updatedTask);
            expect(mockTaskService.updateTask).toHaveBeenCalledWith('task123', { actualHours: 7 });
        });

        test('should validate required parameters for time tracking', async () => {
            // Act & Assert
            await expect(controller.addTimeSpent('', 2))
                .rejects
                .toThrow('Missing required parameters');

            await expect(controller.addTimeSpent('task123', null))
                .rejects
                .toThrow('Missing required parameters');
        });

        test('should check permissions before adding time', async () => {
            // Arrange
            const unauthorizedTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'other-user',
                assignedTo: 'other-user'
            });
            mockTaskService.getTaskById.mockResolvedValue(unauthorizedTask);

            // Act & Assert
            await expect(controller.addTimeSpent('task123', 2))
                .rejects
                .toThrow('Permission denied: Cannot modify this task');
        });
    });

    describe('Tag Management', () => {
        let existingTask;

        beforeEach(async () => {
            await controller.initialize('user123');
            existingTask = TestDataFactory.createTask({ 
                id: 'task123', 
                userId: 'user123',
                tags: ['existing-tag']
            });
            mockTaskService.getTaskById.mockResolvedValue(existingTask);
        });

        test('should add tag to task', async () => {
            // Arrange
            const newTag = 'important';
            const updatedTask = { ...existingTask, tags: ['existing-tag', 'important'] };
            mockTaskService.updateTask.mockResolvedValue(updatedTask);

            // Act
            const result = await controller.addTaskTag('task123', newTag);

            // Assert
            expect(result).toBe(updatedTask);
            expect(mockTaskService.updateTask).toHaveBeenCalledWith('task123', 
                { tags: ['existing-tag', 'important'] }
            );
        });

        test('should not add duplicate tags', async () => {
            // Arrange
            const duplicateTag = 'existing-tag';

            // Act
            const result = await controller.addTaskTag('task123', duplicateTag);

            // Assert
            expect(result).toBe(existingTask);
            expect(mockTaskService.updateTask).not.toHaveBeenCalled();
        });

        test('should remove tag from task', async () => {
            // Arrange
            const tagToRemove = 'existing-tag';
            const updatedTask = { ...existingTask, tags: [] };
            mockTaskService.updateTask.mockResolvedValue(updatedTask);

            // Act
            const result = await controller.removeTaskTag('task123', tagToRemove);

            // Assert
            expect(result).toBe(updatedTask);
            expect(mockTaskService.updateTask).toHaveBeenCalledWith('task123', { tags: [] });
        });
    });

    describe('Event Handling', () => {
        beforeEach(async () => {
            await controller.initialize('user123');
        });

        test('should handle task service events', () => {
            // Arrange
            const mockRefreshTasks = jest.spyOn(controller, 'refreshTasks').mockResolvedValue();

            // Act
            controller.handleTaskServiceEvent('taskCreated', { id: 'task123' });

            // Assert
            expect(mockRefreshTasks).toHaveBeenCalled();
        });

        test('should handle view error events', () => {
            // Arrange
            const errorData = { error: 'Test error' };

            // Act
            controller.handleTaskServiceEvent('error', errorData);

            // Assert
            if (mockTaskView.showError) {
                expect(mockTaskView.showError).toHaveBeenCalledWith('Test error');
            }
        });

        test('should handle task view events', async () => {
            // Arrange
            const mockCreateTask = jest.spyOn(controller, 'createTask').mockResolvedValue();
            const taskData = TestDataFactory.createValidTaskData();

            // Act
            await controller.handleTaskViewEvent('createTaskRequested', taskData);

            // Assert
            expect(mockCreateTask).toHaveBeenCalledWith(taskData);
        });
    });

    describe('Permission Checking', () => {
        beforeEach(async () => {
            await controller.initialize('user123');
        });

        test('should allow task owner to modify task', () => {
            // Arrange
            const task = TestDataFactory.createTask({ userId: 'user123' });

            // Act
            const canModify = controller.canModifyTask(task);

            // Assert
            expect(canModify).toBe(true);
        });

        test('should allow assigned user to modify task', () => {
            // Arrange
            const task = TestDataFactory.createTask({ 
                userId: 'other-user', 
                assignedTo: 'user123' 
            });

            // Act
            const canModify = controller.canModifyTask(task);

            // Assert
            expect(canModify).toBe(true);
        });

        test('should allow admin to modify any task', () => {
            // Arrange
            controller.currentUser.isAdmin = true;
            const task = TestDataFactory.createTask({ 
                userId: 'other-user', 
                assignedTo: 'other-user' 
            });

            // Act
            const canModify = controller.canModifyTask(task);

            // Assert
            expect(canModify).toBe(true);
        });

        test('should deny modification for unauthorized users', () => {
            // Arrange
            const task = TestDataFactory.createTask({ 
                userId: 'other-user', 
                assignedTo: 'other-user' 
            });

            // Act
            const canModify = controller.canModifyTask(task);

            // Assert
            expect(canModify).toBe(false);
        });

        test('should handle null task gracefully', () => {
            // Act
            const canModify = controller.canModifyTask(null);

            // Assert
            expect(canModify).toBe(false);
        });
    });

    describe('Controller State Management', () => {
        test('should track initialization state', async () => {
            // Initially not initialized
            expect(controller.isInitialized()).toBe(false);

            // After initialization
            await controller.initialize('user123');
            expect(controller.isInitialized()).toBe(true);
        });

        test('should get current user', async () => {
            // Before initialization
            expect(controller.getCurrentUser()).toBeNull();

            // After initialization
            await controller.initialize('user123');
            expect(controller.getCurrentUser()).toBe(mockUser);
        });

        test('should get current filter', async () => {
            await controller.initialize('user123');
            
            // Default filter
            expect(controller.getCurrentFilter()).toBe('all');

            // After filtering
            mockTaskService.getPendingTasks.mockResolvedValue([]);
            await controller.filterTasks('pending');
            expect(controller.getCurrentFilter()).toBe('pending');
        });

        test('should set current user', async () => {
            // Act
            await controller.setCurrentUser('user123');

            // Assert
            expect(controller.getCurrentUser()).toBe(mockUser);
            expect(controller.isInitialized()).toBe(true);
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            await controller.initialize('user123');
        });

        test('should handle service errors gracefully', async () => {
            // Arrange
            const taskData = TestDataFactory.createValidTaskData();
            mockTaskService.createTask.mockRejectedValue(new Error('Service unavailable'));
            const eventSpy = jest.fn();
            controller.addListener(eventSpy);

            // Act & Assert
            await expect(controller.createTask(taskData))
                .rejects
                .toThrow('Service unavailable');

            expect(eventSpy).toHaveBeenCalledWith('error', 
                expect.objectContaining({
                    operation: 'createTask',
                    error: 'Service unavailable'
                })
            );
        });

        test('should validate parameters consistently', async () => {
            // Test various methods with invalid parameters
            const invalidCalls = [
                () => controller.updateTask(null, {}),
                () => controller.deleteTask(''),
                () => controller.assignTask('task123', null),
                () => controller.addTimeSpent('', 5)
            ];

            for (const call of invalidCalls) {
                await expect(call()).rejects.toThrow();
            }
        });
    });

    describe('Performance and Concurrency', () => {
        beforeEach(async () => {
            await controller.initialize('user123');
        });

        test('should handle concurrent operations efficiently', async () => {
            // Arrange
            const tasks = TestDataFactory.createMultipleTasks(10).map(data => 
                TestDataFactory.createTaskFromData(data)
            );
            mockTaskService.createTask.mockImplementation(async (data) => 
                TestDataFactory.createTaskFromData(data)
            );

            // Act
            const startTime = performance.now();
            const operations = tasks.map(task => 
                controller.createTask({ title: task.title, description: task.description })
            );
            await Promise.all(operations);
            const endTime = performance.now();

            // Assert
            expect(endTime - startTime).toBeLessThan(100); // Should handle concurrency well
            expect(mockTaskService.createTask).toHaveBeenCalledTimes(10);
        });
    });
});