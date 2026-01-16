/**
 * Day 3: Test Utilities
 * Helper functions and utilities for testing
 */

/**
 * Test Data Factory - Creates test data for various scenarios
 */
class TestDataFactory {
    static createUser(overrides = {}) {
        return {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            isAdmin: false,
            createdAt: new Date().toISOString(),
            ...overrides
        };
    }

    static createTaskData(overrides = {}) {
        return {
            title: 'Test Task',
            description: 'Test Description',
            priority: 'medium',
            dueDate: null,
            ...overrides
        };
    }

    static createValidTaskData(overrides = {}) {
        return {
            title: 'Valid Task Title',
            description: 'Valid task description',
            userId: 'user123',
            priority: 'high',
            category: 'work',
            estimatedHours: 4,
            dueDate: this.getFutureDate(7),
            ...overrides
        };
    }

    static createInvalidTaskData() {
        return {
            title: '', // Invalid: empty title
            description: 'A'.repeat(501), // Invalid: too long
            priority: 'invalid', // Invalid: not a valid priority
            dueDate: this.getPastDate(1) // Invalid: past date
        };
    }

    static createMultipleTasks(count = 5) {
        const tasks = [];
        const priorities = ['high', 'medium', 'low'];
        
        for (let i = 0; i < count; i++) {
            tasks.push(this.createTaskData({
                title: `Task ${i + 1}`,
                description: `Description for task ${i + 1}`,
                priority: priorities[i % priorities.length],
                dueDate: i % 2 === 0 ? this.getFutureDate(i + 1) : null
            }));
        }
        
        return tasks;
    }

    static createTaskWithType(type) {
        const baseData = this.createValidTaskData();
        
        switch (type) {
            case 'urgent':
                return {
                    ...baseData,
                    title: 'Urgent Task',
                    priority: 'high',
                    dueDate: this.getFutureDate(1)
                };
            
            case 'recurring':
                return {
                    ...baseData,
                    title: 'Recurring Task',
                    recurrencePattern: 'weekly',
                    recurrenceInterval: 1
                };
            
            case 'project':
                return {
                    ...baseData,
                    title: 'Project Task',
                    projectName: 'Test Project',
                    estimatedHours: 8
                };
            
            default:
                return baseData;
        }
    }

    static getFutureDate(daysFromNow) {
        const date = new Date(Date.now());
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString().split('T')[0];
    }

    static getPastDate(daysAgo) {
        const date = new Date(Date.now());
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    }

    static getTodayDate() {
        return new Date(Date.now()).toISOString().split('T')[0];
    }
}

/**
 * Test Assertions - Custom assertion helpers
 */
class TestAssertions {
    static assertTaskEquals(actual, expected) {
        expect(actual.title).toBe(expected.title);
        expect(actual.description).toBe(expected.description);
        expect(actual.priority).toBe(expected.priority);
        expect(actual.dueDate).toBe(expected.dueDate);
    }

    static assertTaskHasRequiredProperties(task) {
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('description');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('dueDate');
        expect(task).toHaveProperty('completed');
        expect(task).toHaveProperty('createdAt');
        expect(task).toHaveProperty('completedAt');
        expect(task).toHaveProperty('updatedAt');
    }

    static assertValidationResult(result, shouldBeValid = true, expectedErrors = []) {
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(result.isValid).toBe(shouldBeValid);
        
        if (!shouldBeValid && expectedErrors.length > 0) {
            expect(result.errors).toHaveLength(expectedErrors.length);
            expectedErrors.forEach(error => {
                expect(result.errors).toContain(error);
            });
        }
    }

    static assertTaskStats(stats, expected) {
        expect(stats).toHaveProperty('total', expected.total);
        expect(stats).toHaveProperty('completed', expected.completed);
        expect(stats).toHaveProperty('incomplete', expected.incomplete);
        
        if (expected.overdue !== undefined) {
            expect(stats).toHaveProperty('overdue', expected.overdue);
        }
    }

    static assertArrayContainsTask(array, taskId) {
        const task = array.find(t => t.id === taskId);
        expect(task).toBeDefined();
        return task;
    }

    static assertArrayDoesNotContainTask(array, taskId) {
        const task = array.find(t => t.id === taskId);
        expect(task).toBeUndefined();
    }
}

/**
 * Mock Factory - Creates mock objects for testing
 */
class MockFactory {
    static createMockStorage() {
        const storage = new Map();
        
        return {
            save: jest.fn().mockImplementation(async (data) => {
                storage.set('data', data);
                return true;
            }),
            load: jest.fn().mockImplementation(async () => {
                return storage.get('data') || null;
            }),
            clear: jest.fn().mockImplementation(async () => {
                storage.clear();
            }),
            isAvailable: true
        };
    }

    static createMockEventEmitter() {
        const listeners = new Map();
        
        return {
            on: jest.fn().mockImplementation((event, callback) => {
                if (!listeners.has(event)) {
                    listeners.set(event, []);
                }
                listeners.get(event).push(callback);
            }),
            emit: jest.fn().mockImplementation((event, ...args) => {
                if (listeners.has(event)) {
                    listeners.get(event).forEach(callback => callback(...args));
                }
            }),
            off: jest.fn().mockImplementation((event, callback) => {
                if (listeners.has(event)) {
                    const callbacks = listeners.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            }),
            removeAllListeners: jest.fn().mockImplementation(() => {
                listeners.clear();
            })
        };
    }

    static createMockValidator() {
        return {
            validateTask: jest.fn().mockImplementation((taskData) => ({
                isValid: true,
                errors: [],
                sanitizedData: taskData
            })),
            validateTaskUpdate: jest.fn().mockImplementation((updates) => ({
                isValid: true,
                errors: [],
                sanitizedData: updates
            }))
        };
    }

    static createMockRepository() {
        const tasks = new Map();
        
        return {
            addTask: jest.fn().mockImplementation(async (task) => {
                tasks.set(task.id, task);
                return task;
            }),
            updateTask: jest.fn().mockImplementation(async (taskId, updates) => {
                const task = tasks.get(taskId);
                if (!task) throw new Error('Task not found');
                Object.assign(task, updates);
                return task;
            }),
            deleteTask: jest.fn().mockImplementation(async (taskId) => {
                const task = tasks.get(taskId);
                if (!task) throw new Error('Task not found');
                tasks.delete(taskId);
                return task;
            }),
            getTask: jest.fn().mockImplementation((taskId) => {
                return tasks.get(taskId);
            }),
            getAllTasks: jest.fn().mockImplementation(() => {
                return Array.from(tasks.values());
            }),
            getTasksByFilter: jest.fn().mockImplementation(() => {
                return Array.from(tasks.values());
            })
        };
    }

    static createMockService() {
        return {
            processTask: jest.fn().mockImplementation(async (task) => task),
            validateTask: jest.fn().mockImplementation((task) => ({ isValid: true, errors: [] })),
            notifyTaskChange: jest.fn().mockImplementation(() => {}),
            getUserPermissions: jest.fn().mockImplementation(() => ({ canEdit: true, canDelete: true })),
            getUserById: jest.fn().mockImplementation(async (id) => ({ id, username: 'testuser' }))
        };
    }

    static createMockView() {
        return {
            render: jest.fn().mockImplementation(() => {}),
            update: jest.fn().mockImplementation(() => {}),
            show: jest.fn().mockImplementation(() => {}),
            hide: jest.fn().mockImplementation(() => {}),
            getFormData: jest.fn().mockImplementation(() => ({})),
            displayError: jest.fn().mockImplementation(() => {}),
            displaySuccess: jest.fn().mockImplementation(() => {})
        };
    }
}

/**
 * Performance Testing Utilities
 */
class PerformanceTestUtils {
    static async measureExecutionTime(fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        
        return {
            result,
            executionTime: end - start
        };
    }

    static async measureMemoryUsage(fn) {
        if (!performance.memory) {
            console.warn('Memory measurement not available in this environment');
            return { result: await fn(), memoryUsage: null };
        }
        
        const beforeMemory = performance.memory.usedJSHeapSize;
        const result = await fn();
        const afterMemory = performance.memory.usedJSHeapSize;
        
        return {
            result,
            memoryUsage: {
                before: beforeMemory,
                after: afterMemory,
                difference: afterMemory - beforeMemory
            }
        };
    }

    static createPerformanceTest(name, fn, expectedMaxTime = 100) {
        return async () => {
            const { result, executionTime } = await this.measureExecutionTime(fn);
            
            expect(executionTime).toBeLessThan(expectedMaxTime);
            
            return result;
        };
    }

    static async runLoadTest(fn, iterations = 100) {
        const results = [];
        
        for (let i = 0; i < iterations; i++) {
            const { executionTime } = await this.measureExecutionTime(fn);
            results.push(executionTime);
        }
        
        const average = results.reduce((sum, time) => sum + time, 0) / results.length;
        const min = Math.min(...results);
        const max = Math.max(...results);
        
        return { average, min, max, results };
    }
}

/**
 * Test Environment Setup
 */
class TestEnvironment {
    static setupDOM() {
        // Create basic DOM structure for UI tests
        document.body.innerHTML = `
            <div id="app">
                <form id="task-form">
                    <input id="task-title" type="text" />
                    <textarea id="task-description"></textarea>
                    <select id="task-priority">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <input id="task-due-date" type="date" />
                    <button type="submit">Add Task</button>
                </form>
                <div id="task-list"></div>
                <div id="task-count">0</div>
            </div>
        `;
    }

    static cleanupDOM() {
        document.body.innerHTML = '';
    }

    static mockLocalStorage() {
        const storage = new Map();
        
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn((key) => storage.get(key) || null),
                setItem: jest.fn((key, value) => storage.set(key, value)),
                removeItem: jest.fn((key) => storage.delete(key)),
                clear: jest.fn(() => storage.clear()),
                get length() { return storage.size; },
                key: jest.fn((index) => Array.from(storage.keys())[index] || null)
            },
            writable: true
        });
        
        return window.localStorage;
    }

    static mockDateNow(fixedDate = '2024-01-01T00:00:00.000Z') {
        const mockDate = new Date(fixedDate);
        const mockTime = mockDate.getTime();
        
        // Store original functions for restoration
        this._originalDateNow = Date.now;
        this._originalDate = global.Date;
        
        // Mock Date.now only, keep Date constructor intact for instanceof checks
        Date.now = jest.fn().mockReturnValue(mockTime);
        
        return mockDate;
    }

    static restoreDateNow() {
        if (this._originalDateNow) {
            Date.now = this._originalDateNow;
        }
        if (this._originalDate) {
            global.Date = this._originalDate;
        }
    }

    static async measureExecutionTime(fn) {
        return PerformanceTestUtils.measureExecutionTime(fn);
    }

    static async waitFor(condition, timeout = 1000, interval = 10) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        throw new Error('Condition not met within timeout');
    }

    static createTestSuite(name, setupFn, teardownFn) {
        return {
            name,
            beforeEach: setupFn,
            afterEach: teardownFn,
            tests: []
        };
    }
}

/**
 * Test Reporter - Custom test result reporting
 */
class TestReporter {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
            startTime: null,
            endTime: null,
            failures: []
        };
    }

    start() {
        this.results.startTime = new Date();
        console.log('🧪 Starting test suite...');
    }

    recordPass(testName) {
        this.results.passed++;
        this.results.total++;
        console.log(`✅ ${testName}`);
    }

    recordFail(testName, error) {
        this.results.failed++;
        this.results.total++;
        this.results.failures.push({ testName, error });
        console.log(`❌ ${testName}: ${error.message}`);
    }

    recordSkip(testName) {
        this.results.skipped++;
        this.results.total++;
        console.log(`⏭️  ${testName} (skipped)`);
    }

    finish() {
        this.results.endTime = new Date();
        const duration = this.results.endTime - this.results.startTime;
        
        console.log('\n📊 Test Results:');
        console.log(`   Passed: ${this.results.passed}`);
        console.log(`   Failed: ${this.results.failed}`);
        console.log(`   Skipped: ${this.results.skipped}`);
        console.log(`   Total: ${this.results.total}`);
        console.log(`   Duration: ${duration}ms`);
        
        if (this.results.failures.length > 0) {
            console.log('\n💥 Failures:');
            this.results.failures.forEach(({ testName, error }) => {
                console.log(`   ${testName}: ${error.message}`);
            });
        }
        
        return this.results;
    }
}

// Export utilities for use in tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TestDataFactory,
        TestAssertions,
        MockFactory,
        TestEnvironment,
        PerformanceTestUtils,
        TestReporter
    };
}