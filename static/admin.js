// Admin Panel JavaScript
class AdminController {
    constructor() {
        this.defaultConfig = {
            components: {
                rpi: {
                    name: 'Raspberry Pi',
                    description: 'SNMP Attacker',
                    icon: '🍓',
                    ip: 'Auto-detect'
                },
                switch: {
                    name: 'Network Switch',
                    description: 'SNMP v1/v2c Enabled',
                    model: 'Generic Switch',
                    defaultIP: '192.168.1.100'
                },
                device1: {
                    name: 'Workstation',
                    type: 'workstation',
                    port: 'Port 1'
                },
                device2: {
                    name: 'Printer',
                    type: 'printer',
                    port: 'Port 2'
                },
                device3: {
                    name: 'IoT Device',
                    type: 'iot',
                    port: 'Port 3'
                },
                device4: {
                    name: 'IP Camera',
                    type: 'camera',
                    port: 'Port 4'
                }
            },
            display: {
                hoverEffects: true,
                packetAnimations: true,
                attackIndicators: true,
                connectionUpColor: '#27ae60',
                connectionDownColor: '#e74c3c',
                attackColor: '#f39c12',
                showIPAddresses: true,
                showPortNumbers: true,
                compactMode: false
            }
        };
        
        this.currentConfig = { ...this.defaultConfig };
        this.init();
    }
    
    init() {
        this.loadConfiguration();
        this.setupEventListeners();
        this.addAdminLog('Admin panel initialized', 'info');
    }
    
    setupEventListeners() {
        // Form change listeners
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', () => {
                this.updateConfigFromForm();
            });
        });
        
        // Clear admin log
        document.getElementById('clear-admin-log').addEventListener('click', () => {
            this.clearAdminLog();
        });
        
        // Device type change handlers
        document.getElementById('device1-type').addEventListener('change', (e) => {
            this.updateDeviceIcon(1, e.target.value);
        });
        document.getElementById('device2-type').addEventListener('change', (e) => {
            this.updateDeviceIcon(2, e.target.value);
        });
        document.getElementById('device3-type').addEventListener('change', (e) => {
            this.updateDeviceIcon(3, e.target.value);
        });
        document.getElementById('device4-type').addEventListener('change', (e) => {
            this.updateDeviceIcon(4, e.target.value);
        });
    }
    
    updateDeviceIcon(deviceNum, deviceType) {
        const iconMap = {
            workstation: '🖥️',
            server: '🖲️',
            laptop: '💻',
            desktop: '🖥️',
            printer: '🖨️',
            scanner: '📠',
            copier: '📄',
            fax: '📠',
            iot: '📱',
            phone: '📞',
            tablet: '📱',
            sensor: '🌡️',
            camera: '📹',
            nvr: '📼',
            access: '🚪',
            alarm: '🚨'
        };
        
        const icon = iconMap[deviceType] || '📱';
        const iconElement = document.querySelector(`[data-device="${deviceNum}"] .component-icon`);
        if (iconElement) {
            iconElement.textContent = icon;
        }
        
        this.addAdminLog(`Updated Device ${deviceNum} icon to ${icon} (${deviceType})`, 'info');
    }
    
    updateConfigFromForm() {
        // Update component configuration from form
        this.currentConfig.components.rpi = {
            name: document.getElementById('rpi-name').value,
            description: document.getElementById('rpi-desc').value,
            icon: document.getElementById('rpi-icon').value,
            ip: document.getElementById('rpi-ip').value
        };
        
        this.currentConfig.components.switch = {
            name: document.getElementById('switch-name').value,
            description: document.getElementById('switch-desc').value,
            model: document.getElementById('switch-model').value,
            defaultIP: document.getElementById('switch-default-ip').value
        };
        
        this.currentConfig.components.device1 = {
            name: document.getElementById('device1-name').value,
            type: document.getElementById('device1-type').value,
            port: document.getElementById('device1-port').value
        };
        
        this.currentConfig.components.device2 = {
            name: document.getElementById('device2-name').value,
            type: document.getElementById('device2-type').value,
            port: document.getElementById('device2-port').value
        };
        
        this.currentConfig.components.device3 = {
            name: document.getElementById('device3-name').value,
            type: document.getElementById('device3-type').value,
            port: document.getElementById('device3-port').value
        };
        
        this.currentConfig.components.device4 = {
            name: document.getElementById('device4-name').value,
            type: document.getElementById('device4-type').value,
            port: document.getElementById('device4-port').value
        };
        
        // Update display settings
        this.currentConfig.display = {
            hoverEffects: document.getElementById('enable-hover-effects').checked,
            packetAnimations: document.getElementById('enable-packet-animations').checked,
            attackIndicators: document.getElementById('enable-attack-indicators').checked,
            connectionUpColor: document.getElementById('connection-up-color').value,
            connectionDownColor: document.getElementById('connection-down-color').value,
            attackColor: document.getElementById('attack-color').value,
            showIPAddresses: document.getElementById('show-ip-addresses').checked,
            showPortNumbers: document.getElementById('show-port-numbers').checked,
            compactMode: document.getElementById('compact-mode').checked
        };
    }
    
    loadConfiguration() {
        // Load configuration from localStorage
        const saved = localStorage.getItem('kormarineSeaNetConfig');
        if (saved) {
            try {
                this.currentConfig = JSON.parse(saved);
                this.populateForm();
                this.addAdminLog('Configuration loaded from local storage', 'success');
            } catch (error) {
                this.addAdminLog('Error loading saved configuration, using defaults', 'warning');
                this.currentConfig = { ...this.defaultConfig };
            }
        } else {
            this.populateForm();
        }
    }
    
    populateForm() {
        // Populate form with current configuration
        const config = this.currentConfig;
        
        // Component settings
        document.getElementById('rpi-name').value = config.components.rpi.name;
        document.getElementById('rpi-desc').value = config.components.rpi.description;
        document.getElementById('rpi-icon').value = config.components.rpi.icon;
        document.getElementById('rpi-ip').value = config.components.rpi.ip;
        
        document.getElementById('switch-name').value = config.components.switch.name;
        document.getElementById('switch-desc').value = config.components.switch.description;
        document.getElementById('switch-model').value = config.components.switch.model;
        document.getElementById('switch-default-ip').value = config.components.switch.defaultIP;
        
        document.getElementById('device1-name').value = config.components.device1.name;
        document.getElementById('device1-type').value = config.components.device1.type;
        document.getElementById('device1-port').value = config.components.device1.port;
        
        document.getElementById('device2-name').value = config.components.device2.name;
        document.getElementById('device2-type').value = config.components.device2.type;
        document.getElementById('device2-port').value = config.components.device2.port;
        
        document.getElementById('device3-name').value = config.components.device3.name;
        document.getElementById('device3-type').value = config.components.device3.type;
        document.getElementById('device3-port').value = config.components.device3.port;
        
        document.getElementById('device4-name').value = config.components.device4.name;
        document.getElementById('device4-type').value = config.components.device4.type;
        document.getElementById('device4-port').value = config.components.device4.port;
        
        // Display settings
        document.getElementById('enable-hover-effects').checked = config.display.hoverEffects;
        document.getElementById('enable-packet-animations').checked = config.display.packetAnimations;
        document.getElementById('enable-attack-indicators').checked = config.display.attackIndicators;
        document.getElementById('connection-up-color').value = config.display.connectionUpColor;
        document.getElementById('connection-down-color').value = config.display.connectionDownColor;
        document.getElementById('attack-color').value = config.display.attackColor;
        document.getElementById('show-ip-addresses').checked = config.display.showIPAddresses;
        document.getElementById('show-port-numbers').checked = config.display.showPortNumbers;
        document.getElementById('compact-mode').checked = config.display.compactMode;
    }
    
    // Admin Log Functions
    addAdminLog(message, type = 'info') {
        const container = document.getElementById('admin-log-container');
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
    
    clearAdminLog() {
        const container = document.getElementById('admin-log-container');
        container.innerHTML = '';
        this.addAdminLog('Admin log cleared', 'info');
    }
}

// Global admin controller instance
let adminController;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    adminController = new AdminController();
});

// Configuration Management Functions
function saveConfiguration() {
    adminController.updateConfigFromForm();
    
    try {
        localStorage.setItem('kormarineSeaNetConfig', JSON.stringify(adminController.currentConfig));
        adminController.addAdminLog('Configuration saved successfully', 'success');
        
        // Also save to backend if needed
        fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminController.currentConfig)
        }).catch(error => {
            adminController.addAdminLog('Warning: Could not sync to backend', 'warning');
        });
        
    } catch (error) {
        adminController.addAdminLog(`Error saving configuration: ${error.message}`, 'error');
    }
}

function previewConfiguration() {
    adminController.updateConfigFromForm();
    adminController.addAdminLog('Opening preview in new tab...', 'info');
    
    // Store preview config temporarily
    sessionStorage.setItem('previewConfig', JSON.stringify(adminController.currentConfig));
    
    // Open main page in new tab for preview
    window.open('/', '_blank');
    
    adminController.addAdminLog('Preview opened - check the new tab', 'success');
}

function resetConfiguration() {
    if (confirm('Are you sure you want to reset to default configuration? This will lose all customizations.')) {
        adminController.currentConfig = { ...adminController.defaultConfig };
        adminController.populateForm();
        
        // Clear localStorage
        localStorage.removeItem('kormarineSeaNetConfig');
        
        adminController.addAdminLog('Configuration reset to defaults', 'warning');
    }
}

function exportConfiguration() {
    adminController.updateConfigFromForm();
    
    const config = JSON.stringify(adminController.currentConfig, null, 2);
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kormarine-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    adminController.addAdminLog('Configuration exported successfully', 'success');
}

function importConfiguration(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            adminController.currentConfig = config;
            adminController.populateForm();
            
            adminController.addAdminLog(`Configuration imported from ${file.name}`, 'success');
        } catch (error) {
            adminController.addAdminLog(`Error importing configuration: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// Preset Management Functions
function loadPreset(presetName) {
    const presets = {
        default: adminController.defaultConfig,
        corporate: {
            ...adminController.defaultConfig,
            components: {
                ...adminController.defaultConfig.components,
                switch: {
                    name: 'Cisco Catalyst 2960',
                    description: 'Enterprise Switch',
                    model: 'Cisco Catalyst 2960-X',
                    defaultIP: '10.0.1.1'
                },
                device1: { name: 'Executive Workstation', type: 'workstation', port: 'Fa0/1' },
                device2: { name: 'Department Printer', type: 'printer', port: 'Fa0/2' },
                device3: { name: 'Conference Phone', type: 'phone', port: 'Fa0/3' },
                device4: { name: 'Security Camera', type: 'camera', port: 'Fa0/4' }
            }
        },
        home: {
            ...adminController.defaultConfig,
            components: {
                ...adminController.defaultConfig.components,
                switch: {
                    name: 'Home Router',
                    description: 'Consumer Router/Switch',
                    model: 'TP-Link Archer',
                    defaultIP: '192.168.0.1'
                },
                device1: { name: 'Gaming PC', type: 'desktop', port: 'LAN1' },
                device2: { name: 'Family Printer', type: 'printer', port: 'LAN2' },
                device3: { name: 'Smart TV', type: 'iot', port: 'LAN3' },
                device4: { name: 'Baby Monitor', type: 'camera', port: 'LAN4' }
            }
        }
    };
    
    if (presets[presetName]) {
        adminController.currentConfig = { ...presets[presetName] };
        adminController.populateForm();
        adminController.addAdminLog(`Loaded preset: ${presetName}`, 'success');
    } else {
        adminController.addAdminLog(`Preset not found: ${presetName}`, 'error');
    }
}

function deletePreset(presetName) {
    if (confirm(`Are you sure you want to delete the preset "${presetName}"?`)) {
        // Remove from localStorage presets
        const presets = JSON.parse(localStorage.getItem('customPresets') || '{}');
        delete presets[presetName];
        localStorage.setItem('customPresets', JSON.stringify(presets));
        
        adminController.addAdminLog(`Deleted preset: ${presetName}`, 'warning');
        
        // Refresh preset list (would need to implement this)
        // refreshPresetList();
    }
}

function createPreset() {
    const name = document.getElementById('new-preset-name').value.trim();
    if (!name) {
        adminController.addAdminLog('Please enter a preset name', 'error');
        return;
    }
    
    adminController.updateConfigFromForm();
    
    // Save to localStorage custom presets
    const presets = JSON.parse(localStorage.getItem('customPresets') || '{}');
    presets[name] = { ...adminController.currentConfig };
    localStorage.setItem('customPresets', JSON.stringify(presets));
    
    document.getElementById('new-preset-name').value = '';
    adminController.addAdminLog(`Created preset: ${name}`, 'success');
    
    // Refresh preset list (would need to implement this)
    // refreshPresetList();
}
