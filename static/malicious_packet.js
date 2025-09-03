// Malicious Packet Builder JavaScript
class MaliciousPacketBuilder {
    constructor() {
        this.currentProtocol = 'tcp';
        this.ledStatuses = {
            '17': false, '27': false, '22': false, '10': false,
            '9': false, '5': false, '6': false
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updatePayloadStats();
        this.updateTargetDisplay();
    }

    setupEventListeners() {
        // Protocol selector
        document.querySelectorAll('.protocol-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectProtocol(e.target.dataset.protocol));
        });

        // Form inputs
        document.getElementById('target-ip').addEventListener('input', () => this.updateTargetDisplay());
        document.getElementById('target-port').addEventListener('input', () => this.updateTargetDisplay());
        document.getElementById('source-ip').addEventListener('input', () => this.updateSourceDisplay());
        document.getElementById('payload').addEventListener('input', () => this.updatePayloadStats());
        
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
        document.getElementById('raw-btn').addEventListener('click', () => this.sendRawPacket());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearAll());
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
    }

    selectProtocol(protocol) {
        this.currentProtocol = protocol;
        
        // Update UI
        document.querySelectorAll('.protocol-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-protocol="${protocol}"]`).classList.add('active');

        // Show/hide fields based on protocol
        const sourceFields = document.getElementById('source-fields');
        const sourcePortField = document.getElementById('source-port-field');
        const macFields = document.getElementById('mac-fields');
        const targetMacField = document.getElementById('target-mac-field');
        const craftBtn = document.getElementById('craft-btn');
        const rawBtn = document.getElementById('raw-btn');
        const payloadTextarea = document.getElementById('payload');

        if (protocol === 'raw') {
            sourceFields.style.display = 'none';
            sourcePortField.style.display = 'none';
            macFields.style.display = 'block';
            targetMacField.style.display = 'block';
            craftBtn.style.display = 'none';
            rawBtn.style.display = 'block';
            payloadTextarea.placeholder = 'Enter hex bytes (e.g., 48656c6c6f576f726c64)';
            payloadTextarea.classList.add('hex-input');
        } else {
            sourceFields.style.display = 'block';
            sourcePortField.style.display = 'block';
            macFields.style.display = 'block';
            targetMacField.style.display = 'block';
            craftBtn.style.display = 'block';
            rawBtn.style.display = 'none';
            payloadTextarea.placeholder = 'Enter your payload here...';
            payloadTextarea.classList.remove('hex-input');
        }

        this.log(`Protocol switched to ${protocol.toUpperCase()}`, 'info');
    }

    loadPresetPayload(preset) {
        const payloadTextarea = document.getElementById('payload');
        
        switch (preset) {
            case 'EICAR':
                payloadTextarea.value = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
                break;
            case 'Hello World!':
                payloadTextarea.value = 'Hello World!';
                break;
            default:
                // For hex payloads, check if it's hex and convert if needed
                if (preset.match(/^[0-9a-fA-F]+$/)) {
                    payloadTextarea.value = preset;
                } else {
                    payloadTextarea.value = preset;
                }
        }
        
        this.updatePayloadStats();
        this.log(`Loaded preset payload: ${preset}`, 'info');
    }

    updatePayloadStats() {
        const payload = document.getElementById('payload').value;
        const statsDiv = document.getElementById('payload-stats');
        
        if (this.currentProtocol === 'raw') {
            // For raw packets, count hex bytes
            const cleanHex = payload.replace(/[^0-9a-fA-F]/g, '');
            const byteCount = Math.floor(cleanHex.length / 2);
            statsDiv.innerHTML = `Length: ${byteCount} bytes (${cleanHex.length} hex chars)`;
        } else {
            // For regular packets, count UTF-8 bytes
            const byteLength = new TextEncoder().encode(payload).length;
            statsDiv.innerHTML = `Length: ${byteLength} bytes (${payload.length} chars)`;
        }
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
            protocol: this.currentProtocol,
            payload: payload
        };

        this.log(`Crafting ${this.currentProtocol.toUpperCase()} packet to ${targetIP}:${targetPort}...`, 'info');
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

    async sendRawPacket() {
        const targetIP = document.getElementById('target-ip').value.trim();
        const targetPort = parseInt(document.getElementById('target-port').value);
        const hexPayload = document.getElementById('payload').value.trim();

        if (!targetIP || !targetPort || !hexPayload) {
            this.log('ERROR: Target IP, port, and hex payload are required', 'error');
            return;
        }

        // Validate hex payload
        const cleanHex = hexPayload.replace(/[^0-9a-fA-F]/g, '');
        if (cleanHex.length % 2 !== 0) {
            this.log('ERROR: Hex payload must have even number of characters', 'error');
            return;
        }

        const packetData = {
            target_ip: targetIP,
            target_port: targetPort,
            payload: cleanHex
        };

        this.log(`Sending raw packet to ${targetIP}:${targetPort}...`, 'info');
        this.animatePacketSend();

        try {
            const response = await fetch('/packet/send-raw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(packetData)
            });

            const result = await response.json();
            
            if (result.ok) {
                this.log(`SUCCESS: ${result.message}`, 'success');
                this.log(`Payload Size: ${result.payload_size} bytes`, 'info');
            } else {
                this.log(`ERROR: ${result.error}`, 'error');
            }
        } catch (error) {
            this.log(`ERROR: Failed to send raw packet - ${error.message}`, 'error');
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
            protocol: this.currentProtocol === 'raw' ? 'udp' : this.currentProtocol
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

// Initialize the packet builder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.packetBuilder = new MaliciousPacketBuilder();
});

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
