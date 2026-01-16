/**
 * Script Loader - Ensures all dependencies are loaded correctly
 * 
 * This file ensures that all required classes and functions are available
 * before the Day 2 application initializes.
 */

(function() {
    'use strict';

    // Check if all required dependencies are loaded
    function checkDependencies() {
        const required = [
            'StorageManager',
            'Task',
            'User',
            'TaskRepository',
            'UserRepository',
            'TaskController',
            'TaskView',
            'Day2TaskManagementApp'
        ];

        const missing = [];
        const loaded = [];

        required.forEach(dep => {
            if (typeof window[dep] !== 'undefined') {
                loaded.push(dep);
                console.log(`✅ ${dep} loaded`);
            } else {
                missing.push(dep);
                console.warn(`⚠️ ${dep} is not defined`);
            }
        });

        return { missing, loaded };
    }

    // Retry loading dependencies with a timeout
    function ensureDependenciesLoaded(callback, maxRetries = 15) {
        let retries = 0;

        function tryLoad() {
            const { missing, loaded } = checkDependencies();
            
            console.log(`Checking dependencies... (attempt ${retries + 1}/${maxRetries})`);
            console.log(`Loaded: ${loaded.length}, Missing: ${missing.length}`);

            if (missing.length === 0) {
                console.log('✅ All dependencies loaded successfully!');
                console.log('Loaded classes:', loaded.join(', '));
                callback();
            } else if (retries < maxRetries) {
                retries++;
                const delay = Math.min(100 * retries, 1000);
                console.log(`Retrying in ${delay}ms...`);
                setTimeout(tryLoad, delay);
            } else {
                console.error('❌ Failed to load dependencies after', maxRetries, 'attempts');
                console.error('Missing:', missing);
                showErrorMessage(missing);
            }
        }

        tryLoad();
    }

    // Show user-friendly error message
    function showErrorMessage(missing) {
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="error-container" style="
                    max-width: 600px;
                    margin: 50px auto;
                    padding: 30px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    text-align: center;
                ">
                    <h1 style="color: #e53e3e; margin-bottom: 20px;">⚠️ Failed to load application dependencies.</h1>
                    <p style="color: #4a5568; margin-bottom: 20px;">
                        Missing: ${missing.join(', ')}
                    </p>
                    <button onclick="location.reload()" style="
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                    ">
                        Refresh Page
                    </button>
                </div>
            `;
        }
    }

    // Wait for DOM and dependencies before initializing
    function init() {
        console.log('🔍 Script Loader: Starting dependency check...');
        ensureDependenciesLoaded(initializeApp);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Initialize the application
    async function initializeApp() {
        try {
            console.log('🚀 Initializing Day 2 Task Management Application...');
            
            // Add a small delay to ensure all scripts are fully parsed
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify dependencies one more time
            if (!window.Day2TaskManagementApp) {
                throw new Error('Day2TaskManagementApp is not available');
            }

            // Create and initialize the app
            const app = new Day2TaskManagementApp();
            await app.initialize();

            // Store in window for debugging
            window.day2App = app;

            console.log('🎉 Day 2 Task Management Application is ready!');

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            const appContainer = document.getElementById('app');
            if (appContainer) {
                appContainer.innerHTML = `
                    <div class="error-container" style="
                        max-width: 600px;
                        margin: 50px auto;
                        padding: 30px;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                        text-align: center;
                    ">
                        <h1 style="color: #e53e3e; margin-bottom: 20px;">❌ Application Error</h1>
                        <p style="color: #4a5568; margin-bottom: 20px;">
                            ${error.message}
                        </p>
                        <button onclick="location.reload()" style="
                            margin-top: 20px;
                            padding: 10px 20px;
                            background: #667eea;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            Refresh Page
                        </button>
                    </div>
                `;
            }
        }
    }
})();

