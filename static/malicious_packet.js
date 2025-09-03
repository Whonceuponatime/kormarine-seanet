// Malicious Packet Builder JavaScript
class MaliciousPacketBuilder {
    constructor() {
        this.ledStatuses = {
            '17': false, '27': false, '22': false, '10': false,
            '9': false, '5': false, '6': false
        };
        this.init();
        this.loadAndApplyAdminSettings();
    }

    init() {
        this.setupEventListeners();
        this.updateTargetDisplay();
    }

    setupEventListeners() {
        // Form inputs
        document.getElementById('target-ip').addEventListener('input', () => this.updateTargetDisplay());
        document.getElementById('target-port').addEventListener('input', () => this.updateTargetDisplay());
        document.getElementById('source-ip').addEventListener('input', () => this.updateSourceDisplay());
        
        // MAC address validation
        document.getElementById('source-mac').addEventListener('input', (e) => this.validateMacAddress(e.target));
        document.getElementById('target-mac').addEventListener('input', (e) => this.validateMacAddress(e.target));
        
        // Target device selection from topology
        document.querySelectorAll('.clickable-target').forEach(device => {
            device.addEventListener('click', (e) => this.selectTargetDevice(e.currentTarget));
        });

        // Preset payload buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.loadPresetPayload(e.target.dataset.payload));
        });

        // Action buttons
        document.getElementById('craft-btn').addEventListener('click', () => this.craftAndSendPacket());
        document.getElementById('eicar-btn').addEventListener('click', () => this.sendEicarPacket());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearAll());
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
    }



    loadPresetPayload(preset) {
        const payloadTextarea = document.getElementById('payload');
        
        switch (preset) {
            case 'Hello World!':
                payloadTextarea.value = 'Hello World!';
                break;
            case 'EICAR':
                payloadTextarea.value = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
                break;
            case '48656c6c6f20576f726c6421':
                // Convert hex to ASCII: "Hello World!"
                payloadTextarea.value = this.hexToAscii(preset);
                break;
            case '3c7363726970743e616c65727428274861636b656427293c2f7363726970743e':
                // Convert hex to ASCII: "<script>alert('Hacked')</script>"
                payloadTextarea.value = this.hexToAscii(preset);
                break;
            default:
                payloadTextarea.value = preset;
        }
        
        this.log(`Loaded preset payload: ${preset}`, 'info');
    }
    
    hexToAscii(hex) {
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str;
    }



    updateTargetDisplay() {
        // No need to update display elements in the new layout
        // Target info is shown in the form inputs directly
    }

    updateSourceDisplay() {
        // No need to update display elements in the new layout  
        // Source info is shown in the form inputs directly
    }
    
    validateMacAddress(input) {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        const value = input.value.trim();
        
        if (value && !macRegex.test(value)) {
            input.style.borderColor = '#e74c3c';
            input.style.backgroundColor = '#fdf2f2';
        } else {
            input.style.borderColor = '#e1e8ed';
            input.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        }
    }
    
    selectTargetDevice(deviceElement) {
        const deviceType = deviceElement.dataset.device;
        const deviceName = deviceElement.querySelector('.device-text-below').textContent;
        
        // Highlight selected device
        document.querySelectorAll('.clickable-target').forEach(d => {
            d.style.filter = 'none';
        });
        deviceElement.style.filter = 'drop-shadow(0 0 10px #e74c3c)';
        
        // Set common IPs based on device type
        const deviceIPs = {
            'workstation': '192.168.1.101',
            'printer': '192.168.1.102', 
            'iot': '192.168.1.103',
            'camera': '192.168.1.104'
        };
        
        const devicePorts = {
            'workstation': 80,
            'printer': 631,
            'iot': 8080,
            'camera': 554
        };
        
        document.getElementById('target-ip').value = deviceIPs[deviceType] || '192.168.1.100';
        document.getElementById('target-port').value = devicePorts[deviceType] || 80;
        
        this.updateTargetDisplay();
        this.animatePacketToTarget(deviceElement);
        this.log(`Selected target: ${deviceName} (${deviceIPs[deviceType]}:${devicePorts[deviceType]})`, 'info');
    }
    
    animatePacketToTarget(targetElement) {
        // Show attack indicators
        const attackIndicators = document.getElementById('attack-indicators');
        attackIndicators.style.opacity = '1';
        
        // Hide after 3 seconds
        setTimeout(() => {
            attackIndicators.style.opacity = '0';
        }, 3000);
    }

    async craftAndSendPacket() {
        const targetIP = document.getElementById('target-ip').value.trim();
        const targetPort = parseInt(document.getElementById('target-port').value);
        const sourceIP = document.getElementById('source-ip').value.trim();
        const sourcePort = parseInt(document.getElementById('source-port').value);
        const sourceMac = document.getElementById('source-mac').value.trim();
        const targetMac = document.getElementById('target-mac').value.trim();
        const payload = document.getElementById('payload').value;

        if (!targetIP || !targetPort) {
            this.log('ERROR: Target IP and port are required', 'error');
            return;
        }

        const packetData = {
            target_ip: targetIP,
            target_port: targetPort,
            source_ip: sourceIP,
            source_port: sourcePort || 12345,
            source_mac: sourceMac,
            target_mac: targetMac,
            protocol: 'tcp',
            payload: payload
        };

        this.log(`Crafting TCP packet to ${targetIP}:${targetPort}...`, 'info');
        this.animatePacketSend();

        try {
            const response = await fetch('/packet/craft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(packetData)
            });

            const result = await response.json();
            
            if (result.ok) {
                this.log(`SUCCESS: ${result.message}`, 'success');
                this.log(`Protocol: ${result.protocol}, Payload Size: ${result.payload_size} bytes`, 'info');
            } else {
                this.log(`ERROR: ${result.error}`, 'error');
            }
        } catch (error) {
            this.log(`ERROR: Failed to send packet - ${error.message}`, 'error');
        }
    }



    async sendEicarPacket() {
        const targetIP = document.getElementById('target-ip').value.trim();
        const targetPort = parseInt(document.getElementById('target-port').value);

        if (!targetIP || !targetPort) {
            this.log('ERROR: Target IP and port are required', 'error');
            return;
        }

        const packetData = {
            target_ip: targetIP,
            target_port: targetPort,
            protocol: 'tcp'
        };

        this.log(`Sending EICAR test packet to ${targetIP}:${targetPort}...`, 'warning');
        this.animatePacketSend();

        try {
            const response = await fetch('/packet/eicar-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(packetData)
            });

            const result = await response.json();
            
            if (result.ok) {
                this.log(`SUCCESS: ${result.message}`, 'success');
                this.log(`EICAR Payload: ${result.eicar_payload}`, 'warning');
                this.log(`Protocol: ${result.protocol}, Size: ${result.payload_size} bytes`, 'info');
            } else {
                this.log(`ERROR: ${result.error}`, 'error');
            }
        } catch (error) {
            this.log(`ERROR: Failed to send EICAR packet - ${error.message}`, 'error');
        }
    }

    animatePacketSend() {
        const packetAnimation = document.getElementById('packet-animation');
        packetAnimation.classList.remove('active');
        
        // Trigger animation
        setTimeout(() => {
            packetAnimation.classList.add('active');
        }, 100);

        // Remove animation class after completion
        setTimeout(() => {
            packetAnimation.classList.remove('active');
        }, 2100);
    }

    clearAll() {
        document.getElementById('target-ip').value = '192.168.1.100';
        document.getElementById('target-port').value = '80';
        document.getElementById('source-ip').value = '';
        document.getElementById('source-port').value = '12345';
        document.getElementById('source-mac').value = '';
        document.getElementById('target-mac').value = '';
        document.getElementById('payload').value = '';
        
        // Clear device selections
        document.querySelectorAll('.clickable-target').forEach(d => {
            d.style.filter = 'none';
        });
        
        this.updatePayloadStats();
        this.updateTargetDisplay();
        this.updateSourceDisplay();
        this.log('Form cleared', 'info');
    }

    clearLog() {
        const logContainer = document.getElementById('log-container');
        logContainer.innerHTML = `
            <div class="log-entry info">
                <span class="timestamp">[Ready]</span>
                <span class="message">Malicious Packet Builder initialized</span>
            </div>
        `;
    }

    log(message, type = 'info') {
        const logContainer = document.getElementById('log-container');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span><span class="message">${message}</span>`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }



    // Utility function to convert string to hex
    stringToHex(str) {
        return Array.from(str)
            .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('');
    }

    // Utility function to convert hex to string
    hexToString(hex) {
        const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
        let result = '';
        for (let i = 0; i < cleanHex.length; i += 2) {
            result += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return result;
    }
}

    async loadAndApplyAdminSettings() {
        try {
            // Try to load from server first
            const response = await fetch('/load-config');
            const data = await response.json();
            
            if (data.ok && data.config && Object.keys(data.config).length > 0) {
                this.applyAdminSettings(data.config);
                this.log('Applied server-side admin settings', 'info');
                return;
            }
        } catch (error) {
            console.log('Failed to load from server, trying local storage');
        }
        
        // Fallback to localStorage
        const saved = localStorage.getItem('kormarineSeaNetConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.applyAdminSettings(config);
                this.log('Applied local admin settings', 'info');
            } catch (error) {
                console.log('Error loading saved configuration');
            }
        }
    }
    
    applyAdminSettings(config) {
        if (!config) return;
        
        // Apply device visibility settings
        if (config.display) {
            this.applyDeviceVisibility(config.display);
        }
        
        // Apply component customizations
        if (config.components) {
            this.updateDeviceLabels(config.components);
            this.updateDeviceImages(config.components);
        }
    }
    
    applyDeviceVisibility(displayConfig) {
        // Apply device visibility settings
        const devices = [
            { id: 'device-1', show: displayConfig.showDevice1 },
            { id: 'device-2', show: displayConfig.showDevice2 },
            { id: 'device-3', show: displayConfig.showDevice3 },
            { id: 'device-4', show: displayConfig.showDevice4 }
        ];
        
        devices.forEach(device => {
            const deviceElement = document.getElementById(device.id);
            const connectionElement = document.getElementById(`connection-${device.id}`);
            
            if (deviceElement) {
                deviceElement.style.display = (device.show === false) ? 'none' : 'block';
            }
            if (connectionElement) {
                connectionElement.style.display = (device.show === false) ? 'none' : 'block';
            }
        });
    }
    
    updateDeviceLabels(components) {
        // Update device names and descriptions
        if (components.rpi) {
            const rpiName = document.getElementById('rpi-device-name');
            const rpiDesc = document.getElementById('rpi-device-desc');
            if (rpiName) rpiName.textContent = components.rpi.name;
            if (rpiDesc) rpiDesc.textContent = components.rpi.description;
        }
        
        if (components.switch) {
            const switchName = document.getElementById('switch-device-name');
            const switchDesc = document.getElementById('switch-device-desc');
            if (switchName) switchName.textContent = components.switch.name;
            if (switchDesc) switchDesc.textContent = components.switch.description;
        }
        
        if (components.device1) {
            const device1Name = document.getElementById('device1-device-name');
            if (device1Name) device1Name.textContent = components.device1.name;
        }
        
        if (components.device2) {
            const device2Name = document.getElementById('device2-device-name');
            if (device2Name) device2Name.textContent = components.device2.name;
        }
        
        if (components.device3) {
            const device3Name = document.getElementById('device3-device-name');
            if (device3Name) device3Name.textContent = components.device3.name;
        }
        
        if (components.device4) {
            const device4Name = document.getElementById('device4-device-name');
            if (device4Name) device4Name.textContent = components.device4.name;
        }
    }
    
    updateDeviceImages(components) {
        // Update device images
        const imageUpdates = [
            { component: components.rpi, imageId: 'rpi-main-image', fallbackId: 'rpi-fallback-box' },
            { component: components.switch, imageId: 'switch-main-image', fallbackId: 'switch-fallback-box' },
            { component: components.device1, imageId: 'device1-main-image', fallbackId: 'device1-fallback-box' },
            { component: components.device2, imageId: 'device2-main-image', fallbackId: 'device2-fallback-box' },
            { component: components.device3, imageId: 'device3-main-image', fallbackId: 'device3-fallback-box' },
            { component: components.device4, imageId: 'device4-main-image', fallbackId: 'device4-fallback-box' }
        ];
        
        imageUpdates.forEach(update => {
            if (update.component && update.component.imageUrl) {
                const imageElement = document.getElementById(update.imageId);
                const fallbackElement = document.getElementById(update.fallbackId);
                
                if (imageElement && fallbackElement) {
                    imageElement.setAttribute('href', update.component.imageUrl);
                    imageElement.style.display = 'block';
                    fallbackElement.style.display = 'none';
                }
            }
        });
    }

    // Packet builder will be initialized from the HTML page to prevent conflicts

// Add some helper functions for advanced users
window.packetUtils = {
    stringToHex: (str) => window.packetBuilder.stringToHex(str),
    hexToString: (hex) => window.packetBuilder.hexToString(hex),
    
    // Generate common payloads
    generateXSSPayload: () => '<script>alert("XSS")</script>',
    generateSQLPayload: () => "' OR '1'='1",
    generateBufferOverflow: (size) => 'A'.repeat(size),
    generateRandomHex: (bytes) => {
        return Array.from({length: bytes}, () => 
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');
    }
};
