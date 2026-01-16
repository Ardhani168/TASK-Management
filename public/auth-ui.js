/**
 * Authentication UI - Login & Registration Module
 * Handles user login and registration interface
 */

class AuthenticationUI {
    constructor(containerId, userRepository) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }
        this.userRepository = userRepository;
        this.listeners = new Set();
        this.isLoginMode = true;
    }

    addListener(listener) {
        this.listeners.add(listener);
    }

    notifyListeners(eventType, data) {
        this.listeners.forEach(listener => {
            try {
                listener(eventType, data);
            } catch (error) {
                console.error('Error in auth UI listener:', error);
            }
        });
    }

    /**
     * Render login page
     */
    renderLoginPage() {
        this.container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1>Task Management System</h1>
                        <p>Day 2: Requirements & Design Patterns</p>
                    </div>

                    <div id="authMessages"></div>

                    <form id="loginForm" class="auth-form">
                        <div class="form-group">
                            <label for="loginUsername">Username</label>
                            <input 
                                type="text" 
                                id="loginUsername" 
                                name="username" 
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label for="loginPassword">Password</label>
                            <div class="password-input-wrapper">
                                <input 
                                    type="password" 
                                    id="loginPassword" 
                                    name="password" 
                                    placeholder="Enter your password"
                                    required
                                />
                                <button 
                                    type="button" 
                                    class="password-toggle" 
                                    id="togglePassword"
                                >👁️</button>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">
                            Login
                        </button>

                        <div class="auth-footer">
                            <p>Don't have an account? 
                                <button type="button" class="link-btn" id="switchToRegister">
                                    Register here
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.setupLoginEventListeners();
    }

    /**
     * Render registration page
     */
    renderRegistrationPage() {
        this.container.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <h1>Create Account</h1>
                        <p>Register for Task Management System</p>
                    </div>

                    <div id="authMessages"></div>

                    <form id="registerForm" class="auth-form">
                        <div class="form-group">
                            <label for="registerUsername">Username</label>
                            <input 
                                type="text" 
                                id="registerUsername" 
                                name="username" 
                                placeholder="Choose a username"
                                required
                                minlength="3"
                            />
                        </div>

                        <div class="form-group">
                            <label for="registerEmail">Email</label>
                            <input 
                                type="email" 
                                id="registerEmail" 
                                name="email" 
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label for="registerFullName">Full Name</label>
                            <input 
                                type="text" 
                                id="registerFullName" 
                                name="fullName" 
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div class="form-group">
                            <label for="registerPassword">Password</label>
                            <div class="password-input-wrapper">
                                <input 
                                    type="password" 
                                    id="registerPassword" 
                                    name="password" 
                                    placeholder="Create a password"
                                    required
                                    minlength="6"
                                />
                                <button 
                                    type="button" 
                                    class="password-toggle" 
                                    id="toggleRegisterPassword"
                                >👁️</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="confirmPassword">Confirm Password</label>
                            <div class="password-input-wrapper">
                                <input 
                                    type="password" 
                                    id="confirmPassword" 
                                    name="confirmPassword" 
                                    placeholder="Confirm your password"
                                    required
                                />
                                <button 
                                    type="button" 
                                    class="password-toggle" 
                                    id="toggleConfirmPassword"
                                >👁️</button>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">
                            Register
                        </button>

                        <div class="auth-footer">
                            <p>Already have an account? 
                                <button type="button" class="link-btn" id="switchToLogin">
                                    Login here
                                </button>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        `;

        this.setupRegistrationEventListeners();
    }

    /**
     * Setup login form listeners
     */
    setupLoginEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const togglePasswordBtn = document.getElementById('togglePassword');
        const switchToRegisterBtn = document.getElementById('switchToRegister');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        }

        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility('loginPassword');
            });
        }

        if (switchToRegisterBtn) {
            switchToRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.isLoginMode = false;
                this.renderRegistrationPage();
            });
        }
    }

    /**
     * Setup registration form listeners
     */
    setupRegistrationEventListeners() {
        const registerForm = document.getElementById('registerForm');
        const switchToLoginBtn = document.getElementById('switchToLogin');
        const toggleRegisterPasswordBtn = document.getElementById('toggleRegisterPassword');
        const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegistrationSubmit(e));
        }

        if (toggleRegisterPasswordBtn) {
            toggleRegisterPasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility('registerPassword');
            });
        }

        if (toggleConfirmPasswordBtn) {
            toggleConfirmPasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePasswordVisibility('confirmPassword');
            });
        }

        if (switchToLoginBtn) {
            switchToLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.isLoginMode = true;
                this.renderLoginPage();
            });
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    /**
     * Handle login submission
     */
    async handleLoginSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const username = formData.get('username').trim();
        const password = formData.get('password');

        if (!username || !password) {
            this.showError('Please enter both username and password');
            return;
        }

        try {
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            // Attempt authentication
            const user = await this.userRepository.authenticate(username, password);

            if (user) {
                this.showSuccess('Login successful!');
                setTimeout(() => {
                    this.notifyListeners('loginSuccess', { user });
                }, 500);
            } else {
                this.showError('Invalid username or password');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'Login failed');
            event.target.querySelector('button[type="submit"]').disabled = false;
            event.target.querySelector('button[type="submit"]').textContent = 'Login';
        }
    }

    /**
     * Handle registration submission
     */
    async handleRegistrationSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const username = formData.get('username').trim();
        const email = formData.get('email').trim();
        const fullName = formData.get('fullName').trim();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        if (!username || !email || !password) {
            this.showError('Please fill in all required fields');
            return;
        }

        if (username.length < 3) {
            this.showError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        try {
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            // Create user
            const user = new User(username, email, fullName);
            const createdUser = await this.userRepository.create(user);

            this.showSuccess('Account created successfully!');
            setTimeout(() => {
                this.notifyListeners('registrationSuccess', { user: createdUser });
            }, 500);
        } catch (error) {
            console.error('Registration error:', error);
            this.showError(error.message || 'Registration failed');
            event.target.querySelector('button[type="submit"]').disabled = false;
            event.target.querySelector('button[type="submit"]').textContent = 'Register';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show message
     */
    showMessage(message, type = 'info') {
        const messagesContainer = document.getElementById('authMessages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `auth-message auth-message-${type}`;
        messageElement.textContent = message;
        messageElement.style.padding = '12px';
        messageElement.style.marginBottom = '15px';
        messageElement.style.borderRadius = '8px';
        messageElement.style.fontSize = '14px';

        if (type === 'error') {
            messageElement.style.background = '#fee';
            messageElement.style.color = '#c53030';
            messageElement.style.border = '1px solid #fc8181';
        } else if (type === 'success') {
            messageElement.style.background = '#f0fff4';
            messageElement.style.color = '#22543d';
            messageElement.style.border = '1px solid #9ae6b4';
        }

        messagesContainer.appendChild(messageElement);

        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 4000);
    }

    /**
     * Show login page
     */
    show() {
        this.renderLoginPage();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationUI;
} else {
    window.AuthenticationUI = AuthenticationUI;
}
