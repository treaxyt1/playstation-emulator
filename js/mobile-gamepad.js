/**
 * ePSXemu Mobile Gamepad
 * Premium touch gamepad interface for mobile PlayStation emulation
 */

class MobileGamepad {
    constructor() {
        this.isActive = false;
        this.activeTouches = new Map();
        this.pressedButtons = new Set();
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        // Only initialize on mobile devices
        if (this.isMobileDevice()) {
            this.createGamepad();
            this.attachEventListeners();
            this.showGamepad();
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth <= 768;
    }

    loadSettings() {
        const defaults = {
            theme: 'modern',
            opacity: 85,
            size: 'medium',
            haptic: true,
            visible: true,
            position: { bottom: 0, left: 0 }
        };

        try {
            const saved = localStorage.getItem('epsxemu_gamepad_settings');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            return defaults;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('epsxemu_gamepad_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Could not save gamepad settings');
        }
    }

    createGamepad() {
        const gamepad = document.createElement('div');
        gamepad.id = 'mobile-gamepad';
        gamepad.className = `mobile-gamepad theme-${this.settings.theme} size-${this.settings.size}`;
        gamepad.style.opacity = this.settings.opacity / 100;

        gamepad.innerHTML = `
            <!-- Left Side: D-Pad and L Buttons -->
            <div class="gamepad-left">
                <div class="shoulder-buttons-left">
                    <button class="shoulder-btn" data-button="L2">L2</button>
                    <button class="shoulder-btn" data-button="L1">L1</button>
                </div>
                <div class="dpad-container">
                    <div class="dpad" id="dpad">
                        <button class="dpad-btn dpad-up" data-button="up">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>
                        </button>
                        <button class="dpad-btn dpad-left" data-button="left">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 7l-5 5 5 5z"/></svg>
                        </button>
                        <button class="dpad-btn dpad-center"></button>
                        <button class="dpad-btn dpad-right" data-button="right">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 7l5 5-5 5z"/></svg>
                        </button>
                        <button class="dpad-btn dpad-down" data-button="down">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Center: START and SELECT -->
            <div class="gamepad-center">
                <button class="center-btn" data-button="select">SELECT</button>
                <button class="center-btn" data-button="start">START</button>
                <button class="settings-btn" id="gamepad-settings-btn" title="Gamepad Settings">⚙️</button>
            </div>

            <!-- Right Side: Action Buttons and R Buttons -->
            <div class="gamepad-right">
                <div class="shoulder-buttons-right">
                    <button class="shoulder-btn" data-button="R1">R1</button>
                    <button class="shoulder-btn" data-button="R2">R2</button>
                </div>
                <div class="action-buttons-container">
                    <div class="action-buttons">
                        <button class="action-btn btn-triangle" data-button="triangle">
                            <span class="btn-symbol">△</span>
                        </button>
                        <button class="action-btn btn-circle" data-button="circle">
                            <span class="btn-symbol">○</span>
                        </button>
                        <button class="action-btn btn-cross" data-button="cross">
                            <span class="btn-symbol">✕</span>
                        </button>
                        <button class="action-btn btn-square" data-button="square">
                            <span class="btn-symbol">□</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(gamepad);
        this.gamepadElement = gamepad;

        // Create settings panel
        this.createSettingsPanel();
    }

    createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'gamepad-settings-panel';
        panel.className = 'gamepad-settings-panel';
        panel.style.display = 'none';

        panel.innerHTML = `
            <div class="settings-content glass">
                <h3>Gamepad Settings</h3>
                <button class="close-settings" id="close-settings">✕</button>

                <div class="setting-group">
                    <label>Theme</label>
                    <select id="theme-select">
                        <option value="modern">Modern</option>
                        <option value="classic">Classic PS</option>
                        <option value="neon">Neon</option>
                        <option value="minimal">Minimal</option>
                    </select>
                </div>

                <div class="setting-group">
                    <label>Opacity: <span id="opacity-value">${this.settings.opacity}%</span></label>
                    <input type="range" id="opacity-slider" min="30" max="100" value="${this.settings.opacity}">
                </div>

                <div class="setting-group">
                    <label>Size</label>
                    <div class="size-buttons">
                        <button class="size-btn" data-size="small">Small</button>
                        <button class="size-btn" data-size="medium">Medium</button>
                        <button class="size-btn" data-size="large">Large</button>
                    </div>
                </div>

                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="haptic-toggle" ${this.settings.haptic ? 'checked' : ''}>
                        Haptic Feedback
                    </label>
                </div>

                <div class="setting-group">
                    <label>
                        <input type="checkbox" id="gamepad-visible-toggle" ${this.settings.visible ? 'checked' : ''}>
                        Show Gamepad
                    </label>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this.settingsPanel = panel;
    }

    attachEventListeners() {
        // Touch events for buttons
        const buttons = this.gamepadElement.querySelectorAll('[data-button]');
        buttons.forEach(button => {
            button.addEventListener('touchstart', this.handleButtonPress.bind(this), { passive: false });
            button.addEventListener('touchend', this.handleButtonRelease.bind(this), { passive: false });
            button.addEventListener('touchcancel', this.handleButtonRelease.bind(this), { passive: false });
        });

        // D-Pad multi-directional support
        const dpad = document.getElementById('dpad');
        dpad.addEventListener('touchmove', this.handleDpadMove.bind(this), { passive: false });

        // Settings button
        const settingsBtn = document.getElementById('gamepad-settings-btn');
        settingsBtn.addEventListener('click', () => this.toggleSettings());

        // Settings panel controls
        this.attachSettingsListeners();

        // Prevent scrolling when touching gamepad
        this.gamepadElement.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // Orientation change
        window.addEventListener('orientationchange', () => this.handleOrientationChange());
        window.addEventListener('resize', () => this.handleResize());
    }

    attachSettingsListeners() {
        // Theme selector
        const themeSelect = document.getElementById('theme-select');
        themeSelect.value = this.settings.theme;
        themeSelect.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        // Opacity slider
        const opacitySlider = document.getElementById('opacity-slider');
        opacitySlider.addEventListener('input', (e) => {
            this.setOpacity(e.target.value);
        });

        // Size buttons
        const sizeButtons = document.querySelectorAll('.size-btn');
        sizeButtons.forEach(btn => {
            if (btn.dataset.size === this.settings.size) {
                btn.classList.add('active');
            }
            btn.addEventListener('click', (e) => {
                sizeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.setSize(e.target.dataset.size);
            });
        });

        // Haptic toggle
        const hapticToggle = document.getElementById('haptic-toggle');
        hapticToggle.addEventListener('change', (e) => {
            this.settings.haptic = e.target.checked;
            this.saveSettings();
        });

        // Visibility toggle
        const visibleToggle = document.getElementById('gamepad-visible-toggle');
        visibleToggle.addEventListener('change', (e) => {
            this.settings.visible = e.target.checked;
            this.gamepadElement.style.display = e.target.checked ? 'flex' : 'none';
            this.saveSettings();
        });

        // Close settings
        const closeBtn = document.getElementById('close-settings');
        closeBtn.addEventListener('click', () => this.toggleSettings());
    }

    handleButtonPress(e) {
        e.preventDefault();
        const button = e.currentTarget;
        const buttonName = button.dataset.button;

        if (!buttonName) return;

        // Visual feedback
        button.classList.add('pressed');

        // Haptic feedback
        this.vibrate(10);

        // Add to pressed buttons
        this.pressedButtons.add(buttonName);

        // Send to emulator
        this.sendButtonEvent(buttonName, true);

        // Track touch
        if (e.touches.length > 0) {
            this.activeTouches.set(e.touches[0].identifier, button);
        }
    }

    handleButtonRelease(e) {
        e.preventDefault();
        const button = e.currentTarget;
        const buttonName = button.dataset.button;

        if (!buttonName) return;

        // Remove visual feedback
        button.classList.remove('pressed');

        // Remove from pressed buttons
        this.pressedButtons.delete(buttonName);

        // Send to emulator
        this.sendButtonEvent(buttonName, false);

        // Remove touch tracking
        if (e.changedTouches.length > 0) {
            this.activeTouches.delete(e.changedTouches[0].identifier);
        }
    }

    handleDpadMove(e) {
        e.preventDefault();

        const touch = e.touches[0];
        const dpad = e.currentTarget;
        const rect = dpad.getBoundingClientRect();

        const x = touch.clientX - rect.left - rect.width / 2;
        const y = touch.clientY - rect.top - rect.height / 2;

        // Calculate angle
        const angle = Math.atan2(y, x) * 180 / Math.PI;

        // Release all d-pad buttons first
        ['up', 'down', 'left', 'right'].forEach(dir => {
            const btn = dpad.querySelector(`[data-button="${dir}"]`);
            if (btn) btn.classList.remove('pressed');
        });

        // Determine direction and press appropriate button
        let direction = null;
        if (angle >= -45 && angle < 45) direction = 'right';
        else if (angle >= 45 && angle < 135) direction = 'down';
        else if (angle >= -135 && angle < -45) direction = 'up';
        else direction = 'left';

        const btn = dpad.querySelector(`[data-button="${direction}"]`);
        if (btn && !btn.classList.contains('pressed')) {
            btn.classList.add('pressed');
            this.vibrate(8);
        }
    }

    sendButtonEvent(button, pressed) {
        // Map button names to emulator key codes (matching desktop controls)
        const buttonMap = {
            // D-Pad - Arrow keys
            'up': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
            'down': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
            'left': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
            'right': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
            // Action buttons
            'triangle': { key: 'd', code: 'KeyD', keyCode: 68 },  // D
            'circle': { key: 'x', code: 'KeyX', keyCode: 88 },    // X
            'cross': { key: 'z', code: 'KeyZ', keyCode: 90 },     // Z
            'square': { key: 's', code: 'KeyS', keyCode: 83 },    // S
            // Center buttons
            'start': { key: 'v', code: 'KeyV', keyCode: 86 },     // V
            'select': { key: 'c', code: 'KeyC', keyCode: 67 },    // C
            // Shoulder buttons
            'L1': { key: 'q', code: 'KeyQ', keyCode: 81 },        // Q
            'L2': { key: 'w', code: 'KeyW', keyCode: 87 },        // W
            'R1': { key: 'e', code: 'KeyE', keyCode: 69 },        // E
            'R2': { key: 'r', code: 'KeyR', keyCode: 82 }         // R
        };

        const keyInfo = buttonMap[button];
        if (!keyInfo) return;

        const eventType = pressed ? 'keydown' : 'keyup';

        // Create comprehensive keyboard event
        const eventOptions = {
            key: keyInfo.key,
            code: keyInfo.code,
            keyCode: keyInfo.keyCode,
            which: keyInfo.keyCode,
            bubbles: true,
            cancelable: true,
            composed: true
        };

        // Try multiple dispatch methods for maximum compatibility

        // Method 1: Dispatch to iframe (for emulator)
        const iframe = document.getElementById('emu-frame');
        if (iframe && iframe.contentWindow) {
            try {
                // Dispatch to iframe's document
                const iframeEvent = new KeyboardEvent(eventType, eventOptions);
                iframe.contentWindow.document.dispatchEvent(iframeEvent);

                // Also dispatch to iframe's window
                iframe.contentWindow.dispatchEvent(iframeEvent);
            } catch (e) {
                console.warn('Could not dispatch to iframe:', e);
            }
        }

        // Method 2: Dispatch to main document
        try {
            const docEvent = new KeyboardEvent(eventType, eventOptions);
            document.dispatchEvent(docEvent);
        } catch (e) {
            console.warn('Could not dispatch to document:', e);
        }

        // Method 3: Dispatch to window
        try {
            const winEvent = new KeyboardEvent(eventType, eventOptions);
            window.dispatchEvent(winEvent);
        } catch (e) {
            console.warn('Could not dispatch to window:', e);
        }

        // Method 4: Dispatch to body
        try {
            const bodyEvent = new KeyboardEvent(eventType, eventOptions);
            document.body.dispatchEvent(bodyEvent);
        } catch (e) {
            console.warn('Could not dispatch to body:', e);
        }

        // Custom event for debugging and other handlers
        window.dispatchEvent(new CustomEvent('gamepadButton', {
            detail: {
                button,
                pressed,
                key: keyInfo.key,
                keyCode: keyInfo.keyCode
            }
        }));

        // Log for debugging
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`Gamepad ${pressed ? 'pressed' : 'released'}: ${button} → ${keyInfo.key} (${keyInfo.keyCode})`);
        }
    }

    vibrate(duration) {
        if (this.settings.haptic && 'vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }

    setTheme(theme) {
        this.gamepadElement.className = this.gamepadElement.className
            .replace(/theme-\w+/, `theme-${theme}`);
        this.settings.theme = theme;
        this.saveSettings();
    }

    setOpacity(value) {
        this.gamepadElement.style.opacity = value / 100;
        document.getElementById('opacity-value').textContent = value + '%';
        this.settings.opacity = parseInt(value);
        this.saveSettings();
    }

    setSize(size) {
        this.gamepadElement.className = this.gamepadElement.className
            .replace(/size-\w+/, `size-${size}`);
        this.settings.size = size;
        this.saveSettings();
    }

    showGamepad() {
        if (this.settings.visible) {
            this.gamepadElement.style.display = 'flex';
            this.isActive = true;
        }
    }

    hideGamepad() {
        this.gamepadElement.style.display = 'none';
        this.isActive = false;
    }

    toggleSettings() {
        const isVisible = this.settingsPanel.style.display !== 'none';
        this.settingsPanel.style.display = isVisible ? 'none' : 'flex';
    }

    handleOrientationChange() {
        // Adjust layout based on orientation
        setTimeout(() => {
            const isLandscape = window.innerWidth > window.innerHeight;
            this.gamepadElement.classList.toggle('landscape', isLandscape);
            this.gamepadElement.classList.toggle('portrait', !isLandscape);
        }, 100);
    }

    handleResize() {
        // Re-check if device is still mobile
        if (!this.isMobileDevice() && this.isActive) {
            this.hideGamepad();
        } else if (this.isMobileDevice() && !this.isActive) {
            this.showGamepad();
        }
    }
}

// Initialize gamepad when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileGamepad = new MobileGamepad();
    });
} else {
    window.mobileGamepad = new MobileGamepad();
}
