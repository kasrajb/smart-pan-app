/* ==========================================
   SMART PAN - TEMPERATURE CONTROL SYSTEM
   ========================================== */

// ==========================================
// ADAFRUIT IO CONFIGURATION
// ==========================================
const ADAFRUIT_CONFIG = {
    username: 'kasrajb',
    apiKey: 'aio_qqGg500P3TBnmMBTvE49aPiBjHdY',
    feedName: 'temperature',
    baseURL: 'https://io.adafruit.com/api/v2',
    updateInterval: 500  // Check for new data every 500ms (0.5 seconds)
};

// Connection status tracking
let adafruitConnected = false;
let useSimulationMode = false;

// ==========================================
// APPLICATION STATE
// ==========================================
const appState = {
    currentTemp: 77,           // Starting room temperature (77°F / 25°C)
    targetTemp: null,          // User-defined target temperature
    isHeating: false,          // Whether heating is in progress
    targetReached: false,      // Whether target temperature has been reached
    isStabilized: false,       // Whether temperature is stabilized at target
    isOverheating: false,      // Whether in manual overheat test mode
    heatingInterval: null,     // Reference to the heating/monitoring interval
    HEATING_RATE: 12.6,        // Temperature increase per second (12.6°F = 7°C) - simulation only
    UPDATE_INTERVAL: 500,      // Update frequency in milliseconds (500ms for Adafruit, 1000ms for simulation)
    
    // Time tracking for estimates
    heatingStartTime: null,    // When heating began
    heatingStartTemp: 77,      // Temperature when heating started
    
    // Unit system - default to Fahrenheit (North American standard)
    unit: 'F',                 // 'F' for Fahrenheit, 'C' for Celsius
    
    // Temperature limits by unit
    limits: {
        F: { min: 200, max: 500 },  // Fahrenheit cooking range
        C: { min: 100, max: 300 }   // Celsius cooking range
    },
    
    // Preset temperatures by unit
    presets: {
        F: { low: 300, medium: 360, high: 450 },
        C: { low: 150, medium: 180, high: 230 }
    },
    
    // Overheating thresholds
    overheatThreshold: {
        F: 20,  // 20°F over target
        C: 10   // 10°C over target
    },
    
    // Temperature stabilization
    stabilizationFluctuation: {
        F: 2,   // ±2°F fluctuation when stabilized
        C: 1    // ±1°C fluctuation when stabilized
    }
};

// ==========================================
// DOM ELEMENTS - Cache for Performance
// ==========================================
const elements = {
    // Screens
    inputScreen: document.getElementById('input-screen'),
    monitoringScreen: document.getElementById('monitoring-screen'),
    
    // Input Screen Elements
    temperatureInput: document.getElementById('temperature-input'),
    errorMessage: document.getElementById('error-message'),
    startButton: document.getElementById('start-button'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    
    // Monitoring Screen Elements
    currentTempDisplay: document.getElementById('current-temp'),
    targetTempDisplay: document.getElementById('target-temp-display'),
    statusIndicator: document.getElementById('status-indicator'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    changeTargetBtn: document.getElementById('change-target-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    overheatWarning: document.getElementById('overheating-warning'),
    timeEstimate: document.getElementById('time-estimate'),
    testOverheatBtn: document.getElementById('test-overheat-btn'),
    
    // Unit Toggle Buttons
    unitFahrenheit: document.getElementById('unit-fahrenheit'),
    unitCelsius: document.getElementById('unit-celsius'),
    unitFahrenheitMonitor: document.getElementById('unit-fahrenheit-monitor'),
    unitCelsiusMonitor: document.getElementById('unit-celsius-monitor'),
    
    // Audio
    notificationSound: document.getElementById('notification-sound')
};

// ==========================================
// ADAFRUIT IO FUNCTIONS
// ==========================================

/**
 * Test connection to Adafruit IO
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
async function testAdafruitConnection() {
    try {
        const url = `${ADAFRUIT_CONFIG.baseURL}/${ADAFRUIT_CONFIG.username}/feeds/${ADAFRUIT_CONFIG.feedName}/data/last?X-AIO-Key=${ADAFRUIT_CONFIG.apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            adafruitConnected = true;
            useSimulationMode = false;
            console.log('✅ Adafruit IO Connected -', new Date().toLocaleTimeString());
            return true;
        } else {
            adafruitConnected = false;
            useSimulationMode = true;
            console.log('ℹ️ Using Simulation Mode -', new Date().toLocaleTimeString());
            return false;
        }
    } catch (error) {
        adafruitConnected = false;
        useSimulationMode = true;
        console.warn('ℹ️ Adafruit IO connection failed, using simulation mode:', error.message);
        return false;
    }
}

/**
 * Get latest temperature reading from Adafruit IO
 * @returns {Promise<number|null>} Temperature value or null if failed
 */
async function getTempFromAdafruit() {
    if (!adafruitConnected) return null;
    
    try {
        const url = `${ADAFRUIT_CONFIG.baseURL}/${ADAFRUIT_CONFIG.username}/feeds/${ADAFRUIT_CONFIG.feedName}/data/last?X-AIO-Key=${ADAFRUIT_CONFIG.apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn('Failed to fetch temperature from Adafruit IO');
            return null;
        }
        
        const data = await response.json();
        const temperature = parseFloat(data.value);
        
        if (isNaN(temperature)) {
            console.warn('Invalid temperature value received:', data.value);
            return null;
        }
        
        return temperature;
    } catch (error) {
        console.warn('Error fetching from Adafruit IO:', error.message);
        // Automatically fall back to simulation if Adafruit fails
        if (adafruitConnected) {
            adafruitConnected = false;
            useSimulationMode = true;
            console.warn('Switching to simulation mode due to connection issues');
        }
        return null;
    }
}

/**
 * Send temperature value to Adafruit IO
 * @param {number} temperature - Temperature value to send
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function sendTempToAdafruit(temperature) {
    if (!adafruitConnected) return false;
    
    try {
        const url = `${ADAFRUIT_CONFIG.baseURL}/${ADAFRUIT_CONFIG.username}/feeds/${ADAFRUIT_CONFIG.feedName}/data`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-AIO-Key': ADAFRUIT_CONFIG.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: temperature })
        });
        
        if (!response.ok) {
            console.warn('Failed to send temperature to Adafruit IO');
            return false;
        }
        
        return true;
    } catch (error) {
        console.warn('Error sending to Adafruit IO:', error.message);
        return false;
    }
}

// ==========================================
// INITIALIZATION - Run on Page Load
// ==========================================
async function init() {
    // Load saved unit preference (default to Fahrenheit)
    const savedUnit = localStorage.getItem('smartPanUnit') || 'F';
    appState.unit = savedUnit;
    updateUnitDisplay();
    
    // Load saved target temperature from localStorage (if exists)
    const savedTarget = localStorage.getItem('smartPanTargetTemp');
    if (savedTarget) {
        elements.temperatureInput.value = savedTarget;
    }
    
    // Update preset buttons and range info for current unit
    updatePresetsForUnit();
    updateRangeInfo();
    
    // Attach event listeners
    attachEventListeners();
    
    // Test Adafruit IO connection
    await testAdafruitConnection();
    
    // Log initialization status
    const mode = adafruitConnected ? 'Adafruit IO (Live Data)' : 'Simulation Mode';
    console.log(`Smart Pan App Initialized - Unit: ${appState.unit} | Mode: ${mode}`);
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function attachEventListeners() {
    // Start button - validate and begin heating
    elements.startButton.addEventListener('click', handleStartHeating);
    
    // Temperature input - Enter key to start
    elements.temperatureInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleStartHeating();
        }
    });
    
    // Temperature input - Clear error on input
    elements.temperatureInput.addEventListener('input', () => {
        hideError();
    });
    
    // Preset buttons - Quick select temperatures
    elements.presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const temp = btn.getAttribute('data-temp');
            elements.temperatureInput.value = temp;
            hideError();
            
            // Add visual feedback - active state
            btn.classList.add('selected');
            setTimeout(() => {
                btn.classList.remove('selected');
            }, 300);
        });
    });
    
    // Change target button - Return to input screen
    elements.changeTargetBtn.addEventListener('click', handleChangeTarget);
    
    // Cancel button - Stop heating and reset
    elements.cancelBtn.addEventListener('click', handleCancel);
    
    // Unit toggle buttons - Input screen
    elements.unitFahrenheit.addEventListener('click', () => switchUnit('F'));
    elements.unitCelsius.addEventListener('click', () => switchUnit('C'));
    
    // Unit toggle buttons - Monitoring screen
    elements.unitFahrenheitMonitor.addEventListener('click', () => switchUnit('F'));
    elements.unitCelsiusMonitor.addEventListener('click', () => switchUnit('C'));
}

// ==========================================
// SCREEN NAVIGATION
// ==========================================
function switchScreen(fromScreen, toScreen) {
    fromScreen.classList.remove('active');
    toScreen.classList.add('active');
}

// ==========================================
// UNIT CONVERSION FUNCTIONS
// ==========================================
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

function convertTemperature(temp, fromUnit, toUnit) {
    if (fromUnit === toUnit) return temp;
    if (fromUnit === 'C' && toUnit === 'F') {
        return celsiusToFahrenheit(temp);
    }
    if (fromUnit === 'F' && toUnit === 'C') {
        return fahrenheitToCelsius(temp);
    }
    return temp;
}

// ==========================================
// UNIT SWITCHING
// ==========================================
function switchUnit(newUnit) {
    if (appState.unit === newUnit) return;
    
    const oldUnit = appState.unit;
    appState.unit = newUnit;
    
    // Save preference
    localStorage.setItem('smartPanUnit', newUnit);
    
    // Convert current temperature
    appState.currentTemp = convertTemperature(appState.currentTemp, oldUnit, newUnit);
    
    // Convert target temperature if set
    if (appState.targetTemp) {
        appState.targetTemp = convertTemperature(appState.targetTemp, oldUnit, newUnit);
        localStorage.setItem('smartPanTargetTemp', appState.targetTemp);
    }
    
    // Convert input value if exists
    const inputValue = elements.temperatureInput.value;
    if (inputValue) {
        const convertedValue = convertTemperature(parseFloat(inputValue), oldUnit, newUnit);
        elements.temperatureInput.value = Math.round(convertedValue);
    }
    
    // Update heating rate
    appState.HEATING_RATE = newUnit === 'F' ? 12.6 : 7;
    
    // Update UI
    updateUnitDisplay();
    updatePresetsForUnit();
    updateRangeInfo();
    updateAllTemperatureDisplays();
    
    // Update status message with new unit if heating is active
    if (appState.isHeating && appState.targetReached) {
        updateStatus('ready');
    } else if (appState.isHeating) {
        updateStatus('heating');
    }
    
    console.log(`Switched to ${newUnit === 'F' ? 'Fahrenheit' : 'Celsius'}`);
}

function updateUnitDisplay() {
    const isFahrenheit = appState.unit === 'F';
    
    // Input screen toggles
    elements.unitFahrenheit.classList.toggle('active', isFahrenheit);
    elements.unitCelsius.classList.toggle('active', !isFahrenheit);
    
    // Monitoring screen toggles
    elements.unitFahrenheitMonitor.classList.toggle('active', isFahrenheit);
    elements.unitCelsiusMonitor.classList.toggle('active', !isFahrenheit);
    
    // Update all unit labels in the DOM
    document.querySelectorAll('.unit-label, .temp-unit, .temp-unit-small').forEach(el => {
        el.textContent = `°${appState.unit}`;
    });
}

function updatePresetsForUnit() {
    const presets = appState.presets[appState.unit];
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    presetButtons[0].setAttribute('data-temp', presets.low);
    presetButtons[0].querySelector('.preset-temp').textContent = `${presets.low}°${appState.unit}`;
    
    presetButtons[1].setAttribute('data-temp', presets.medium);
    presetButtons[1].querySelector('.preset-temp').textContent = `${presets.medium}°${appState.unit}`;
    
    presetButtons[2].setAttribute('data-temp', presets.high);
    presetButtons[2].querySelector('.preset-temp').textContent = `${presets.high}°${appState.unit}`;
}

function updateRangeInfo() {
    const limits = appState.limits[appState.unit];
    const rangeInfo = document.getElementById('temp-range-info');
    rangeInfo.textContent = `Range: ${limits.min}°${appState.unit} - ${limits.max}°${appState.unit}`;
    
    // Update input attributes
    elements.temperatureInput.min = limits.min;
    elements.temperatureInput.max = limits.max;
}

function updateAllTemperatureDisplays() {
    // Update monitoring screen displays
    if (elements.monitoringScreen.classList.contains('active')) {
        elements.currentTempDisplay.textContent = Math.round(appState.currentTemp);
        if (appState.targetTemp) {
            elements.targetTempDisplay.textContent = Math.round(appState.targetTemp);
        }
    }
}

// ==========================================
// TEMPERATURE VALIDATION
// ==========================================
function validateTemperature(temp) {
    const limits = appState.limits[appState.unit];
    const unit = appState.unit === 'F' ? '°F' : '°C';
    
    const errors = {
        empty: 'Please enter a temperature',
        notNumber: 'Please enter a valid number',
        tooLow: `Temperature must be at least ${limits.min}${unit}`,
        tooHigh: `Temperature cannot exceed ${limits.max}${unit}`,
        invalid: 'Please enter a valid temperature'
    };
    
    // Check if empty
    if (!temp || temp.trim() === '') {
        return { valid: false, error: errors.empty };
    }
    
    // Convert to number
    const tempNum = parseFloat(temp);
    
    // Check if valid number
    if (isNaN(tempNum)) {
        return { valid: false, error: errors.notNumber };
    }
    
    // Check range
    if (tempNum < limits.min) {
        return { valid: false, error: errors.tooLow };
    }
    
    if (tempNum > limits.max) {
        return { valid: false, error: errors.tooHigh };
    }
    
    // Valid temperature
    return { valid: true, value: tempNum };
}

// ==========================================
// ERROR HANDLING
// ==========================================
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.add('show');
    elements.temperatureInput.focus();
}

function hideError() {
    elements.errorMessage.textContent = '';
    elements.errorMessage.classList.remove('show');
}

// ==========================================
// START HEATING - Main Function
// ==========================================
function handleStartHeating() {
    const inputValue = elements.temperatureInput.value;
    const validation = validateTemperature(inputValue);
    
    if (!validation.valid) {
        showError(validation.error);
        return;
    }
    
    // Set target temperature
    appState.targetTemp = validation.value;
    
    // Save to localStorage for persistence
    localStorage.setItem('smartPanTargetTemp', appState.targetTemp);
    
    // Update UI
    elements.targetTempDisplay.textContent = appState.targetTemp;
    elements.currentTempDisplay.textContent = appState.currentTemp;
    
    // Switch to monitoring screen
    switchScreen(elements.inputScreen, elements.monitoringScreen);
    
    // Start heating simulation
    startHeatingSimulation();
    
    console.log(`Heating started. Target: ${appState.targetTemp}°C`);
}

// ==========================================
// TEMPERATURE MONITORING - Real Data or Simulation
// ==========================================
function startHeatingSimulation() {
    appState.isHeating = true;
    appState.targetReached = false;
    appState.isStabilized = false;
    appState.isOverheating = false;
    
    // Track heating start time and temperature for estimates
    appState.heatingStartTime = Date.now();
    appState.heatingStartTemp = appState.currentTemp;
    
    // Update status
    updateStatus('heating');
    
    // Log which mode we're starting in
    const mode = adafruitConnected ? 'Adafruit IO (Real Data)' : 'Simulation Mode';
    console.log(`Started heating - Mode: ${mode} - Target: ${appState.targetTemp}°${appState.unit}`);
    
    // Clear any existing interval
    if (appState.heatingInterval) {
        clearInterval(appState.heatingInterval);
    }
    
    // Start temperature update loop (works with both Adafruit and simulation)
    // Use 500ms interval for smooth real-time updates from Adafruit
    const updateInterval = adafruitConnected ? ADAFRUIT_CONFIG.updateInterval : 1000;
    appState.heatingInterval = setInterval(() => {
        updateTemperatureLoop();
    }, updateInterval);
}

/**
 * UPDATED TEMPERATURE LOOP
 * This function handles temperature updates from either Adafruit IO or simulation
 */
async function updateTemperatureLoop() {
    // Try to get real temperature from Adafruit IO
    if (adafruitConnected) {
        const adafruitTemp = await getTempFromAdafruit();
        
        if (adafruitTemp !== null) {
            // Received real temperature from Adafruit
            // Assume Pico sends Celsius, convert if user prefers Fahrenheit
            appState.currentTemp = appState.unit === 'F' 
                ? celsiusToFahrenheit(adafruitTemp) 
                : adafruitTemp;
            
            // Send acknowledgment back to Adafruit (log the reading)
            sendTempToAdafruit(adafruitTemp);
        } else {
            // Adafruit failed, fall back to simulation
            useSimulationMode = true;
            simulateTemperatureIncrease();
        }
    } else {
        // Use simulation mode
        simulateTemperatureIncrease();
    }
    
    // Check if target reached (for notification only)
    if (!appState.targetReached && appState.currentTemp >= appState.targetTemp) {
        appState.targetReached = true;
        notifyUser();
        updateStatus('ready');
    }
    
    // Check for overheating (automatic warning)
    checkOverheating();
    
    // Update displays
    updateTemperatureDisplay();
    updateProgressBar();
    updateTimeEstimate();
}

/**
 * SIMULATION MODE FUNCTION
 * Fallback temperature simulation when Adafruit IO is unavailable
 */
function simulateTemperatureIncrease() {
    // Continuously increase temperature - will trigger overheat warning automatically
    appState.currentTemp += appState.HEATING_RATE;
}

// ==========================================
// UI UPDATE FUNCTIONS
// ==========================================
function updateTemperatureDisplay() {
    elements.currentTempDisplay.textContent = Math.round(appState.currentTemp);
}

function updateProgressBar() {
    // Calculate progress percentage
    const startTemp = appState.heatingStartTemp || (appState.unit === 'F' ? 77 : 25);
    const range = appState.targetTemp - startTemp;
    const current = appState.currentTemp - startTemp;
    let percentage = Math.min((current / range) * 100, 100);
    
    // Handle overheat mode (show >100%)
    if (appState.isOverheating && appState.currentTemp > appState.targetTemp) {
        const overheatAmount = appState.currentTemp - appState.targetTemp;
        const overheatPercentage = (overheatAmount / appState.overheatThreshold[appState.unit]) * 10;
        percentage = Math.min(100 + overheatPercentage, 120);
    }
    
    // Update progress bar width
    elements.progressBar.style.width = `${Math.min(percentage, 100)}%`;
    
    // Update percentage text
    if (percentage > 100) {
        elements.progressText.textContent = `>100%`;
    } else {
        elements.progressText.textContent = `${Math.round(percentage)}%`;
    }
    
    // Update progress bar ARIA attribute
    const progressContainer = document.querySelector('.progress-container');
    progressContainer.setAttribute('aria-valuenow', Math.round(Math.min(percentage, 100)));
    
    // ✨ NEW: Dynamic color gradient based on percentage
    updateProgressBarColor(percentage);
}

/**
 * ✨ NEW FEATURE: Dynamic Progress Bar Color
 * Changes color based on heating progress:
 * 0-33%: Blue (cold/starting)
 * 34-66%: Orange (warming)
 * 67-99%: Orange-red (nearly ready)
 * 100%: Green (ready)
 * >100%: Red (overheating)
 */
function updateProgressBarColor(percentage) {
    const bar = elements.progressBar;
    
    // Remove all color classes
    bar.classList.remove('cold', 'warming', 'nearly-ready', 'ready', 'overheat');
    
    if (percentage > 100) {
        bar.classList.add('overheat');
    } else if (percentage >= 100) {
        bar.classList.add('ready');
    } else if (percentage >= 67) {
        bar.classList.add('nearly-ready');
        // Add pulse animation near target
        if (percentage >= 95) {
            bar.classList.add('pulse-near-target');
        }
    } else if (percentage >= 34) {
        bar.classList.add('warming');
    } else {
        bar.classList.add('cold');
    }
}

/**
 * ✨ NEW FEATURE: Time Estimate Display
 * Calculates estimated time to reach target based on current heating rate
 */
function updateTimeEstimate() {
    if (!elements.timeEstimate) return;
    
    // Don't show estimate if already at target
    if (appState.isStabilized || appState.targetReached) {
        elements.timeEstimate.textContent = '';
        return;
    }
    
    // Calculate elapsed time and heating rate
    const elapsedSeconds = (Date.now() - appState.heatingStartTime) / 1000;
    
    // Wait at least 3 seconds before showing estimate
    if (elapsedSeconds < 3) {
        elements.timeEstimate.textContent = 'Calculating...';
        return;
    }
    
    // Calculate actual heating rate
    const tempIncrease = appState.currentTemp - appState.heatingStartTemp;
    const heatingRate = tempIncrease / elapsedSeconds;
    
    // Calculate remaining temperature and time
    const remainingTemp = appState.targetTemp - appState.currentTemp;
    const estimatedSeconds = remainingTemp / heatingRate;
    
    // Format time display
    if (estimatedSeconds < 30) {
        elements.timeEstimate.textContent = 'Almost ready! (~' + Math.ceil(estimatedSeconds) + ' sec)';
    } else if (estimatedSeconds < 60) {
        elements.timeEstimate.textContent = 'Est. time: ~' + Math.ceil(estimatedSeconds) + ' seconds';
    } else {
        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = Math.ceil(estimatedSeconds % 60);
        elements.timeEstimate.textContent = `Est. time: ${minutes} min ${seconds} sec`;
    }
}

// ==========================================
// OVERHEATING DETECTION
// ==========================================
function checkOverheating() {
    const threshold = appState.overheatThreshold[appState.unit];
    const isOverheating = appState.currentTemp > (appState.targetTemp + threshold);
    const unit = appState.unit === 'F' ? '°F' : '°C';
    
    if (isOverheating) {
        // Show overheat warning
        if (elements.overheatWarning.classList.contains('hidden')) {
            elements.overheatWarning.classList.remove('hidden');
            console.warn('Warning: Temperature exceeded target!');
        }
        
        // Update warning message with just the difference
        const overheatAmount = Math.round(appState.currentTemp - appState.targetTemp);
        elements.overheatWarning.textContent = 
            `⚠️ WARNING: Overheating by +${overheatAmount}${unit}!`;
        
        // Hide the green "Target reached" status when overheating
        elements.statusIndicator.classList.remove('ready');
        elements.statusIndicator.classList.add('overheating');
        
        // Add visual warning to screen
        elements.monitoringScreen.classList.add('overheating');
    } else {
        // Hide overheat warning
        if (!elements.overheatWarning.classList.contains('hidden')) {
            elements.overheatWarning.classList.add('hidden');
        }
        elements.monitoringScreen.classList.remove('overheating');
    }
}

function updateStatus(status) {
    const statusText = elements.statusIndicator.querySelector('.status-text');
    const unit = appState.unit === 'F' ? '°F' : '°C';
    
    if (status === 'heating') {
        statusText.textContent = `Heating to ${Math.round(appState.targetTemp)}${unit}...`;
        elements.statusIndicator.classList.remove('ready', 'overheating');
        elements.currentTempDisplay.classList.remove('ready');
        elements.progressBar.classList.remove('ready');
    } else if (status === 'ready') {
        statusText.textContent = `✓ Target reached! Pan ready at ${Math.round(appState.targetTemp)}${unit}`;
        elements.statusIndicator.classList.add('ready');
        elements.statusIndicator.classList.remove('overheating');
        elements.currentTempDisplay.classList.add('ready');
        elements.progressBar.classList.add('ready');
    } else if (status === 'overheating') {
        statusText.textContent = `⚠️ WARNING: Overheating!`;
        elements.statusIndicator.classList.remove('ready');
        elements.statusIndicator.classList.add('overheating');
    }
}

// ==========================================
// TARGET REACHED - Success State
// ==========================================
function targetReached() {
    appState.targetReached = true;
    
    // Update UI to success state
    updateStatus('ready');
    
    // Update progress bar to 100% and green
    updateProgressBar();
    
    // Hide time estimate
    if (elements.timeEstimate) {
        elements.timeEstimate.textContent = '';
    }
    
    // Play notification (visual + potential sound)
    notifyUser();
    
    console.log('Target temperature reached! Temperature will continue rising.');
}

function stopHeating() {
    appState.isHeating = false;
    
    if (appState.heatingInterval) {
        clearInterval(appState.heatingInterval);
        appState.heatingInterval = null;
    }
}

// ==========================================
// USER NOTIFICATIONS
// ==========================================
function notifyUser() {
    // Visual notification - Already handled by CSS class changes
    
    // Play sound notification
    playNotificationSound();
    
    // Browser notification (if supported and permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
        const unit = appState.unit === 'F' ? '°F' : '°C';
        new Notification('Smart Pan', {
            body: `Target temperature of ${Math.round(appState.targetTemp)}${unit} reached!`,
            icon: '🍳'
        });
    }
}

/**
 * Play notification sound when target temperature is reached
 * Uses Web Audio API for cross-browser compatibility
 */
function playNotificationSound() {
    try {
        // First try HTML5 audio element
        if (elements.notificationSound) {
            elements.notificationSound.currentTime = 0;
            const playPromise = elements.notificationSound.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Notification sound played');
                    })
                    .catch(error => {
                        // If HTML5 audio fails, try Web Audio API
                        playBeepWithWebAudio();
                    });
            }
        } else {
            // Fallback to Web Audio API
            playBeepWithWebAudio();
        }
    } catch (error) {
        console.warn('Audio playback error:', error);
    }
}

/**
 * Fallback beep sound using Web Audio API
 * Creates a pleasant notification tone
 */
function playBeepWithWebAudio() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set frequency (800Hz for pleasant beep)
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        // Set volume envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        // Play beep
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        console.log('Web Audio beep played');
    } catch (error) {
        console.warn('Web Audio API error:', error);
    }
}

// ==========================================
// CHANGE TARGET TEMPERATURE
// ==========================================
function handleChangeTarget() {
    // Stop current heating
    stopHeating();
    
    // Keep current temperature value for continuity
    // Reset target reached flag
    appState.targetReached = false;
    
    // Return to input screen
    switchScreen(elements.monitoringScreen, elements.inputScreen);
    
    // Pre-fill with current target
    elements.temperatureInput.value = appState.targetTemp;
    elements.temperatureInput.select();
    elements.temperatureInput.focus();
    
    console.log('Changing target temperature');
}

// ==========================================
// CANCEL HEATING - Reset Everything
// ==========================================
function handleCancel() {
    // Stop heating
    stopHeating();
    
    // Reset state to room temperature based on unit
    appState.currentTemp = appState.unit === 'F' ? 77 : 25;
    appState.targetTemp = null;
    appState.targetReached = false;
    appState.isStabilized = false;
    appState.isOverheating = false;
    
    // Hide overheating warning
    elements.overheatWarning.classList.add('hidden');
    elements.monitoringScreen.classList.remove('overheating');
    
    // Hide test overheat button
    if (elements.testOverheatBtn) {
        elements.testOverheatBtn.classList.add('hidden');
    }
    
    // Clear time estimate
    if (elements.timeEstimate) {
        elements.timeEstimate.textContent = '';
    }
    
    // Clear localStorage
    localStorage.removeItem('smartPanTargetTemp');
    
    // Reset input
    elements.temperatureInput.value = '';
    
    // Return to input screen
    switchScreen(elements.monitoringScreen, elements.inputScreen);
    
    // Reset progress
    elements.progressBar.style.width = '0%';
    elements.progressText.textContent = '0%';
    
    console.log('Heating cancelled and reset');
}

// ==========================================
// REQUEST NOTIFICATION PERMISSION (Optional)
// ==========================================
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
        });
    }
}

// ==========================================
// KEYBOARD SHORTCUTS (Enhanced Accessibility)
// ==========================================
document.addEventListener('keydown', (e) => {
    // Escape key - Cancel/Go back
    if (e.key === 'Escape') {
        if (elements.monitoringScreen.classList.contains('active')) {
            handleCancel();
        }
    }
});

// ==========================================
// START APPLICATION
// ==========================================
// Initialize app when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ==========================================
// EXPORT FOR TESTING (Optional)
// ==========================================
// Expose certain functions for testing purposes
window.SmartPanApp = {
    validateTemperature,
    appState,
    // Adafruit IO functions for testing
    testAdafruitConnection,
    getTempFromAdafruit,
    sendTempToAdafruit,
    adafruitConfig: ADAFRUIT_CONFIG,
    getConnectionStatus: () => ({
        connected: adafruitConnected,
        simulationMode: useSimulationMode,
        mode: adafruitConnected ? 'Adafruit IO' : 'Simulation'
    })
};

// ==========================================
// CONSOLE TEST COMMANDS
// ==========================================
/*
COPY AND PASTE THESE COMMANDS INTO BROWSER CONSOLE TO TEST:

// 1. Check connection status
SmartPanApp.getConnectionStatus()

// 2. Test Adafruit IO connection
await SmartPanApp.testAdafruitConnection()

// 3. Get latest temperature from Adafruit IO
await SmartPanApp.getTempFromAdafruit()

// 4. Send test temperature to Adafruit IO (175.5°C)
await SmartPanApp.sendTempToAdafruit(175.5)

// 5. Check current app state
SmartPanApp.appState

// 6. Simulate continuous heating (sends temp to Adafruit every second)
let testTemp = 100;
const heatingTest = setInterval(async () => {
    testTemp += 5;
    console.log(`Sending ${testTemp}°C to Adafruit IO...`);
    await SmartPanApp.sendTempToAdafruit(testTemp);
    if (testTemp > 250) clearInterval(heatingTest);
}, 1000);

// 7. Force reconnection test
await SmartPanApp.testAdafruitConnection(); console.log(SmartPanApp.getConnectionStatus());

// 8. View Adafruit configuration
SmartPanApp.adafruitConfig

// 9. Monitor live temperature updates (logs every 2 seconds)
const monitor = setInterval(async () => {
    const temp = await SmartPanApp.getTempFromAdafruit();
    console.log(`Current temp from Adafruit: ${temp}°C - ${new Date().toLocaleTimeString()}`);
}, 2000);
// To stop: clearInterval(monitor);

// 10. Test full heating cycle
SmartPanApp.appState.targetTemp = 180; // Set target
SmartPanApp.appState.currentTemp = 100; // Set starting temp
console.log('Heating from', SmartPanApp.appState.currentTemp, 'to', SmartPanApp.appState.targetTemp);

*/
