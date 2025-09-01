// Admin Panel JavaScript
class AdminController {
    constructor() {
        this.defaultConfig = {
            components: {
                                        rpi: {
                name: 'Raspberry Pi',
                description: 'SNMP Attacker',
                imageUrl: '/static/images/raspberry-pi-default.svg',
                ip: 'Auto-detect'
            },
            switch: {
                name: 'Network Switch',
                description: 'SNMP v1/v2c Enabled',
                imageUrl: '/static/images/switch-default.svg',
                model: 'Generic Switch',
                defaultIP: '192.168.1.100'
            },
            device1: {
                name: 'Workstation',
                type: 'workstation',
                imageUrl: '/static/images/workstation-default.svg',
                port: 'Port 1'
            },
            device2: {
                name: 'Printer',
                type: 'printer',
                imageUrl: '/static/images/printer-default.svg',
                port: 'Port 2'
            },
            device3: {
                name: 'IoT Device',
                type: 'iot',
                imageUrl: '/static/images/iot-default.svg',
                port: 'Port 3'
            },
            device4: {
                name: 'IP Camera',
                type: 'camera',
                imageUrl: '/static/images/camera-default.svg',
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
        // This method is now deprecated since we use image uploads
        this.addAdminLog(`Device ${deviceNum} type changed to ${deviceType}`, 'info');
    }
    
    updateConfigFromForm() {
        // Update component configuration from form - with null checks
        this.currentConfig.components.rpi = {
            name: this.getElementValue('rpi-name', 'Raspberry Pi'),
            description: this.getElementValue('rpi-desc', 'SNMP Attacker'),
            imageUrl: this.currentConfig.components.rpi.imageUrl || '/static/images/raspberry-pi-default.svg',
            ip: this.getElementValue('rpi-ip', 'Auto-detect')
        };
        
        this.currentConfig.components.switch = {
            name: this.getElementValue('switch-name', 'Network Switch'),
            description: this.getElementValue('switch-desc', 'SNMP v1/v2c Enabled'),
            imageUrl: this.currentConfig.components.switch.imageUrl || '/static/images/switch-default.svg',
            model: this.getElementValue('switch-model', 'Generic Switch'),
            defaultIP: this.getElementValue('switch-default-ip', '192.168.1.100')
        };
        
        this.currentConfig.components.device1 = {
            name: this.getElementValue('device1-name', 'Workstation'),
            type: this.getElementValue('device1-type', 'workstation'),
            imageUrl: this.currentConfig.components.device1.imageUrl || '/static/images/workstation-default.svg',
            port: this.getElementValue('device1-port', 'Port 1')
        };
        
        this.currentConfig.components.device2 = {
            name: this.getElementValue('device2-name', 'Printer'),
            type: this.getElementValue('device2-type', 'printer'),
            imageUrl: this.currentConfig.components.device2.imageUrl || '/static/images/printer-default.svg',
            port: this.getElementValue('device2-port', 'Port 2')
        };
        
        this.currentConfig.components.device3 = {
            name: this.getElementValue('device3-name', 'IoT Device'),
            type: this.getElementValue('device3-type', 'iot'),
            imageUrl: this.currentConfig.components.device3.imageUrl || '/static/images/iot-default.svg',
            port: this.getElementValue('device3-port', 'Port 3')
        };
        
        this.currentConfig.components.device4 = {
            name: this.getElementValue('device4-name', 'IP Camera'),
            type: this.getElementValue('device4-type', 'camera'),
            imageUrl: this.currentConfig.components.device4.imageUrl || '/static/images/camera-default.svg',
            port: this.getElementValue('device4-port', 'Port 4')
        };
        
        // Update display settings with null checks
        this.currentConfig.display = {
            hoverEffects: this.getElementChecked('enable-hover-effects', true),
            packetAnimations: this.getElementChecked('enable-packet-animations', true),
            attackIndicators: this.getElementChecked('enable-attack-indicators', true),
            connectionUpColor: this.getElementValue('connection-up-color', '#27ae60'),
            connectionDownColor: this.getElementValue('connection-down-color', '#e74c3c'),
            attackColor: this.getElementValue('attack-color', '#f39c12'),
            showIPAddresses: this.getElementChecked('show-ip-addresses', true),
            showPortNumbers: this.getElementChecked('show-port-numbers', true),
            compactMode: this.getElementChecked('compact-mode', false),
            showDevice1: this.getElementChecked('show-device-1', true),
            showDevice2: this.getElementChecked('show-device-2', true),
            showDevice3: this.getElementChecked('show-device-3', true),
            showDevice4: this.getElementChecked('show-device-4', true)
        };
    }
    
    // Helper function to safely get element values
    getElementValue(elementId, defaultValue) {
        const element = document.getElementById(elementId);
        return element ? element.value : defaultValue;
    }
    
    // Helper function to safely get checkbox states
    getElementChecked(elementId, defaultValue) {
        const element = document.getElementById(elementId);
        return element ? element.checked : defaultValue;
    }

    // Device visibility control functions
    toggleDeviceVisibility(deviceId, show) {
        // Update the configuration
        this.updateConfigFromForm();
        
        // Save to localStorage
        this.saveConfiguration();
        
        // Send message to topology page if it's open
        this.broadcastDeviceVisibility(deviceId, show);
    }

    toggleAllDevices() {
        const allChecked = ['device-1', 'device-2', 'device-3', 'device-4'].every(deviceId => {
            const checkbox = document.getElementById(`show-${deviceId}`);
            return checkbox ? checkbox.checked : true;
        });
        
        // Toggle all to opposite state
        ['device-1', 'device-2', 'device-3', 'device-4'].forEach(deviceId => {
            const checkbox = document.getElementById(`show-${deviceId}`);
            if (checkbox) {
                checkbox.checked = !allChecked;
                this.toggleDeviceVisibility(deviceId, !allChecked);
            }
        });
    }

    broadcastDeviceVisibility(deviceId, show) {
        // Use localStorage to communicate with topology page
        const visibilityData = {
            deviceId: deviceId,
            show: show,
            timestamp: Date.now()
        };
        localStorage.setItem('deviceVisibilityUpdate', JSON.stringify(visibilityData));
        
        // Trigger storage event manually for same-origin communication
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'deviceVisibilityUpdate',
            newValue: JSON.stringify(visibilityData)
        }));
    }
    
    async loadConfiguration() {
        try {
            // Try to load from server first
            const response = await fetch('/load-config');
            const data = await response.json();
            
            if (data.ok && data.config && Object.keys(data.config).length > 0) {
                this.currentConfig = data.config;
                this.populateForm();
                this.addAdminLog('Configuration loaded from server', 'success');
                return;
            }
        } catch (error) {
            this.addAdminLog('Failed to load from server, trying local storage', 'warning');
        }
        
        // Fallback to localStorage
        const saved = localStorage.getItem('kormarineSeaNetConfig');
        if (saved) {
            try {
                this.currentConfig = JSON.parse(saved);
                this.populateForm();
                this.addAdminLog('Configuration loaded from local storage', 'success');
            } catch (error) {
                this.addAdminLog('Error loading saved configuration, using defaults', 'warning');
                this.currentConfig = { ...this.defaultConfig };
                this.populateForm();
            }
        } else {
            this.currentConfig = { ...this.defaultConfig };
            this.populateForm();
            this.addAdminLog('Using default configuration', 'info');
        }
    }
    
    populateForm() {
        // Populate form with current configuration
        const config = this.currentConfig;
        
        // Component settings
        document.getElementById('rpi-name').value = config.components.rpi.name;
        document.getElementById('rpi-desc').value = config.components.rpi.description;
        document.getElementById('rpi-ip').value = config.components.rpi.ip;
        
        // Update image previews
        this.updateImagePreview('rpi', config.components.rpi.imageUrl);
        
        document.getElementById('switch-name').value = config.components.switch.name;
        document.getElementById('switch-desc').value = config.components.switch.description;
        document.getElementById('switch-model').value = config.components.switch.model;
        document.getElementById('switch-default-ip').value = config.components.switch.defaultIP;
        
        this.updateImagePreview('switch', config.components.switch.imageUrl);
        
        document.getElementById('device1-name').value = config.components.device1.name;
        document.getElementById('device1-type').value = config.components.device1.type;
        document.getElementById('device1-port').value = config.components.device1.port;
        this.updateImagePreview('device1', config.components.device1.imageUrl);
        
        document.getElementById('device2-name').value = config.components.device2.name;
        document.getElementById('device2-type').value = config.components.device2.type;
        document.getElementById('device2-port').value = config.components.device2.port;
        this.updateImagePreview('device2', config.components.device2.imageUrl);
        
        document.getElementById('device3-name').value = config.components.device3.name;
        document.getElementById('device3-type').value = config.components.device3.type;
        document.getElementById('device3-port').value = config.components.device3.port;
        this.updateImagePreview('device3', config.components.device3.imageUrl);
        
        document.getElementById('device4-name').value = config.components.device4.name;
        document.getElementById('device4-type').value = config.components.device4.type;
        document.getElementById('device4-port').value = config.components.device4.port;
        this.updateImagePreview('device4', config.components.device4.imageUrl);
        
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
    
    updateImagePreview(component, imageUrl) {
        const preview = document.getElementById(`${component}-image-preview`);
        const iconPreview = document.getElementById(`${component}-icon-preview`);
        
        if (preview && imageUrl) {
            const img = preview.querySelector('img');
            if (img) {
                img.src = imageUrl;
                img.style.display = 'block';
            }
        }
        
        if (iconPreview && imageUrl) {
            const img = iconPreview.querySelector('img');
            if (img) {
                img.src = imageUrl;
                img.style.display = 'block';
            }
        }
    }
}

// Global admin controller instance
let adminController;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    adminController = new AdminController();
});

// Configuration Management Functions
async function saveConfiguration() {
    try {
        adminController.updateConfigFromForm();
        
        // Save to server first
        const response = await fetch('/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adminController.currentConfig)
        });
        
        const result = await response.json();
        
        if (result.ok) {
            adminController.addAdminLog('Configuration saved to server successfully', 'success');
            
            // Also save to localStorage as backup
            localStorage.setItem('kormarineSeaNetConfig', JSON.stringify(adminController.currentConfig));
            
            // Update the main topology diagram if it's loaded
            if (window.networkDiagram) {
                await window.networkDiagram.loadCustomizations();
                adminController.addAdminLog('Topology diagram updated with new configuration', 'success');
            }
        } else {
            throw new Error(result.error || 'Failed to save to server');
        }
        
    } catch (error) {
        adminController.addAdminLog(`Error saving configuration: ${error.message}`, 'error');
        console.error('Save config error:', error);
        
        // Fallback to localStorage only
        try {
            localStorage.setItem('kormarineSeaNetConfig', JSON.stringify(adminController.currentConfig));
            adminController.addAdminLog('Configuration saved locally as fallback', 'warning');
        } catch (localError) {
            adminController.addAdminLog(`Failed to save locally: ${localError.message}`, 'error');
        }
    }
}

function previewConfiguration() {
    try {
        adminController.updateConfigFromForm();
        
        // Save current config temporarily
        const tempConfig = JSON.stringify(adminController.currentConfig);
        localStorage.setItem('kormarineSeaNetConfig', tempConfig);
        
        adminController.addAdminLog('Opening preview in new tab...', 'info');
        
        // Open main page in new tab for preview
        window.open('/', '_blank');
        
        adminController.addAdminLog('Preview opened - check the new tab', 'success');
        
    } catch (error) {
        adminController.addAdminLog(`Error creating preview: ${error.message}`, 'error');
        console.error('Preview config error:', error);
    }
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

// Image Upload Functions
async function handleImageUpload(input, component) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        adminController.addAdminLog(`Invalid file type for ${component}. Use PNG, JPG, JPEG, GIF, or SVG`, 'error');
        input.value = '';
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        adminController.addAdminLog(`File too large for ${component}. Maximum size is 5MB`, 'error');
        input.value = '';
        return;
    }
    
    adminController.addAdminLog(`Uploading image for ${component}...`, 'info');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('component', component);
    
    try {
        const response = await fetch('/upload-image', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.ok) {
            adminController.addAdminLog(`Image uploaded successfully for ${component}`, 'success');
            
            // Update the preview
            adminController.updateImagePreview(component, result.url);
            
            // Update the configuration
            adminController.currentConfig.components[component].imageUrl = result.url;
            
            // Update the main topology diagram if it's loaded
            if (window.networkDiagram) {
                window.networkDiagram.updateDeviceImages(adminController.currentConfig.components);
            }
            
            // Show remove button
            const removeBtn = document.querySelector(`button[onclick="removeImage('${component}')"]`);
            if (removeBtn) {
                removeBtn.style.display = 'flex';
            }
            
        } else {
            adminController.addAdminLog(`Upload failed for ${component}: ${result.error}`, 'error');
            input.value = '';
        }
    } catch (error) {
        adminController.addAdminLog(`Upload error for ${component}: ${error.message}`, 'error');
        input.value = '';
    }
}

async function removeImage(component) {
    if (!confirm(`Are you sure you want to remove the image for ${component}?`)) {
        return;
    }
    
    adminController.addAdminLog(`Removing image for ${component}...`, 'info');
    
    try {
        // Get current image URL
        const currentUrl = adminController.currentConfig.components[component].imageUrl;
        if (currentUrl && !currentUrl.includes('default.png')) {
            const filename = currentUrl.split('/').pop();
            
            // Delete from server
            await fetch(`/delete-image/${filename}`, {
                method: 'DELETE'
            });
        }
        
        // Reset to default image
        const defaultImages = {
            'rpi': '/static/images/raspberry-pi-default.svg',
            'switch': '/static/images/switch-default.svg',
            'device1': '/static/images/workstation-default.svg',
            'device2': '/static/images/printer-default.svg',
            'device3': '/static/images/iot-default.svg',
            'device4': '/static/images/camera-default.svg'
        };
        
        const defaultUrl = defaultImages[component];
        adminController.currentConfig.components[component].imageUrl = defaultUrl;
        adminController.updateImagePreview(component, defaultUrl);
        
        // Update the main topology diagram if it's loaded
        if (window.networkDiagram) {
            window.networkDiagram.updateDeviceImages(adminController.currentConfig.components);
        }
        
        // Hide remove button
        const removeBtn = document.querySelector(`button[onclick="removeImage('${component}')"]`);
        if (removeBtn) {
            removeBtn.style.display = 'none';
        }
        
        // Clear file input
        const fileInput = document.getElementById(`${component}-image`);
        if (fileInput) {
            fileInput.value = '';
        }
        
        adminController.addAdminLog(`Image removed for ${component}`, 'success');
        
    } catch (error) {
        adminController.addAdminLog(`Error removing image for ${component}: ${error.message}`, 'error');
    }
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
