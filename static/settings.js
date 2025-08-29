// Settings & Testing JavaScript
class SettingsController {
    constructor() {
        this.eventSource = null;
        this.currentWaveSpeed = 2.0;
        this.currentPattern = 'forward';
        this.isWaveRunning = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startLEDMonitoring();
        this.addTestLog('GPIO testing interface initialized', 'info');
    }
    
    setupEventListeners() {
        // Wave speed slider
        const speedSlider = document.getElementById('wave-speed');
        const speedDisplay = document.getElementById('speed-display');
        
        speedSlider.addEventListener('input', (e) => {
            this.currentWaveSpeed = parseFloat(e.target.value);
            speedDisplay.textContent = `${this.currentWaveSpeed} Hz`;
            document.getElementById('current-speed').textContent = `${this.currentWaveSpeed} Hz`;
        });
        
        // Wave pattern selector
        const patternSelect = document.getElementById('wave-pattern');
        patternSelect.addEventListener('change', (e) => {
            this.currentPattern = e.target.value;
            document.getElementById('current-pattern').textContent = this.getPatternDisplayName(e.target.value);
        });
        
        // Clear test log
        document.getElementById('clear-test-log').addEventListener('click', () => {
            this.clearTestLog();
        });
    }
    
    getPatternDisplayName(pattern) {
        const patterns = {
            'forward': 'Forward',
            'backward': 'Backward', 
            'roundtrip': 'Round Trip',
            'bounce': 'Bounce'
        };
        return patterns[pattern] || 'Forward';
    }
    
    // LED Monitoring via Server-Sent Events
    startLEDMonitoring() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        this.eventSource = new EventSource('/events');
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.updateLEDStatus(data);
            } catch (error) {
                console.error('Error parsing LED data:', error);
            }
        };
        
        this.eventSource.onerror = (error) => {
            console.error('LED monitoring connection error:', error);
            // Reconnect after 5 seconds
            setTimeout(() => {
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    this.startLEDMonitoring();
                }
            }, 5000);
        };
    }
    
    updateLEDStatus(data) {
        if (data.pins) {
            Object.entries(data.pins).forEach(([pin, value]) => {
                // Update status indicators
                const statusElement = document.getElementById(`status-${pin}`);
                const visualElement = document.getElementById(`led-visual-${pin}`);
                
                if (statusElement) {
                    statusElement.textContent = value === 1 ? 'ON' : 'OFF';
                    statusElement.classList.toggle('on', value === 1);
                }
                
                if (visualElement) {
                    visualElement.classList.toggle('on', value === 1);
                }
            });
        }
    }
    
    // Test Log Functions
    addTestLog(message, type = 'info') {
        const container = document.getElementById('test-log-container');
        const timestamp = new Date().toLocaleTimeString();
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${message}</span>
        `;
        
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
        
        // Keep only last 50 entries
        while (container.children.length > 50) {
            container.removeChild(container.firstChild);
        }
    }
    
    clearTestLog() {
        const container = document.getElementById('test-log-container');
        container.innerHTML = '';
        this.addTestLog('Test log cleared', 'info');
    }
    
    // Wave Animation Status Updates
    updateWaveStatus(status) {
        const statusElement = document.getElementById('wave-status');
        statusElement.textContent = status;
        statusElement.style.color = status === 'Running' ? '#27ae60' : '#e74c3c';
        this.isWaveRunning = status === 'Running';
    }
    
    // Cleanup
    destroy() {
        if (this.eventSource) {
            this.eventSource.close();
        }
    }
}

// Global settings controller instance
let settingsController;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    settingsController = new SettingsController();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (settingsController) {
        settingsController.destroy();
    }
});

// GPIO Testing Functions
async function testGPIO(pin, action) {
    const actionText = action === 'on' ? 'ON' : 'OFF';
    settingsController.addTestLog(`Testing GPIO ${pin}: ${actionText}`, 'info');
    
    try {
        let endpoint;
        if (action === 'on') {
            endpoint = `/on${pin}`;
        } else {
            endpoint = '/off';
        }
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.ok) {
            settingsController.addTestLog(`GPIO ${pin} test successful: ${actionText}`, 'success');
        } else {
            settingsController.addTestLog(`GPIO ${pin} test failed: ${actionText}`, 'error');
        }
    } catch (error) {
        settingsController.addTestLog(`GPIO ${pin} test error: ${error.message}`, 'error');
    }
}

async function runTestSequence() {
    settingsController.addTestLog('Starting GPIO test sequence...', 'info');
    
    const pins = [17, 27, 22, 10, 9, 5, 6];
    
    try {
        // Turn all off first
        await fetch('/off');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Test each pin in sequence
        for (const pin of pins) {
            settingsController.addTestLog(`Testing Pin ${pin}...`, 'info');
            
            // Turn on
            await fetch(`/on${pin}`);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Turn off
            await fetch('/off');
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        settingsController.addTestLog('GPIO test sequence completed successfully', 'success');
        
    } catch (error) {
        settingsController.addTestLog(`Test sequence error: ${error.message}`, 'error');
    }
}

async function allGPIOOn() {
    settingsController.addTestLog('Turning all GPIOs ON...', 'info');
    
    const pins = [17, 27, 22, 10, 9, 5, 6];
    
    try {
        // Turn on each pin
        for (const pin of pins) {
            await fetch(`/on${pin}`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        settingsController.addTestLog('All GPIOs turned ON', 'success');
        
    } catch (error) {
        settingsController.addTestLog(`Error turning GPIOs ON: ${error.message}`, 'error');
    }
}

async function allGPIOOff() {
    settingsController.addTestLog('Turning all GPIOs OFF...', 'info');
    
    try {
        const response = await fetch('/off');
        const data = await response.json();
        
        if (data.ok) {
            settingsController.addTestLog('All GPIOs turned OFF', 'success');
        } else {
            settingsController.addTestLog('Failed to turn off GPIOs', 'error');
        }
    } catch (error) {
        settingsController.addTestLog(`Error turning GPIOs OFF: ${error.message}`, 'error');
    }
}

// Wave Animation Functions
async function startWaveAnimation() {
    const speed = settingsController.currentWaveSpeed;
    settingsController.addTestLog(`Starting wave animation at ${speed} Hz`, 'info');
    
    try {
        const response = await fetch(`/start?hz=${speed}`);
        const data = await response.json();
        
        if (data.ok) {
            settingsController.addTestLog(`Wave animation started at ${data.hz} Hz`, 'success');
            settingsController.updateWaveStatus('Running');
        } else {
            settingsController.addTestLog('Failed to start wave animation', 'error');
        }
    } catch (error) {
        settingsController.addTestLog(`Wave animation error: ${error.message}`, 'error');
    }
}

async function stopWaveAnimation() {
    settingsController.addTestLog('Stopping wave animation...', 'info');
    
    try {
        const response = await fetch('/stop');
        const data = await response.json();
        
        if (data.ok) {
            settingsController.addTestLog('Wave animation stopped', 'success');
            settingsController.updateWaveStatus('Stopped');
        } else {
            settingsController.addTestLog('Failed to stop wave animation', 'error');
        }
    } catch (error) {
        settingsController.addTestLog(`Stop animation error: ${error.message}`, 'error');
    }
}

async function singleWave() {
    settingsController.addTestLog('Executing single wave animation...', 'info');
    
    try {
        const response = await fetch('/demo/packet', { method: 'POST' });
        const data = await response.json();
        
        if (data.ok) {
            settingsController.addTestLog('Single wave animation executed', 'success');
        } else {
            settingsController.addTestLog('Failed to execute single wave', 'error');
        }
    } catch (error) {
        settingsController.addTestLog(`Single wave error: ${error.message}`, 'error');
    }
}
