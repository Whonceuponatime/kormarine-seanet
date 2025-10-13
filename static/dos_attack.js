// DOS Attack Controller JavaScript
class DOSAttackController {
    constructor() {
        this.isFloodActive = false;
        this.statusInterval = null;
        this.animationInterval = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateUI();
        this.addInitialLog('DOS Attack Simulator ready - Target: 192.168.127.98');
    }
    
    setupEventListeners() {
        // Start flood button
        document.getElementById('start-flood-btn').addEventListener('click', () => {
            this.startFlood();
        });
        
        // Stop flood button
        document.getElementById('stop-flood-btn').addEventListener('click', () => {
            this.stopFlood();
        });
        
        // Clear log button
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });
        
        // Target IP change
        document.getElementById('target-ip').addEventListener('input', (e) => {
            this.updateTargetDisplay();
        });
        
        // Target port change
        document.getElementById('target-port').addEventListener('input', (e) => {
            this.updateTargetDisplay();
        });
    }
    
    async startFlood() {
        try {
            const targetIP = document.getElementById('target-ip').value.trim();
            const targetPort = parseInt(document.getElementById('target-port').value) || 53;
            const packetSize = parseInt(document.getElementById('packet-size').value) || 1024;
            const duration = parseInt(document.getElementById('duration').value) || 0;
            
            if (!targetIP) {
                this.addLog('error', 'Target IP is required');
                return;
            }
            
            // Validate packet size
            if (packetSize < 64 || packetSize > 65507) {
                this.addLog('error', 'Packet size must be between 64 and 65507 bytes');
                return;
            }
            
            this.addLog('info', `Starting UDP flood attack...`);
            this.addLog('info', `Target: ${targetIP}:${targetPort}`);
            this.addLog('info', `Packet Size: ${packetSize} bytes`);
            this.addLog('info', `Duration: ${duration === 0 ? 'Continuous' : duration + ' seconds'}`);
            this.addLog('info', `Target Bandwidth: ~80 Mbps`);
            
            const floodData = {
                target_ip: targetIP,
                target_port: targetPort,
                packet_size: packetSize,
                duration: duration
            };
            
            const response = await fetch('/dos/start-flood', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(floodData)
            });
            
            const result = await response.json();
            
            if (result.ok) {
                this.isFloodActive = true;
                this.updateUI();
                this.startAttackAnimation();
                this.startStatusMonitoring();
                
                this.addLog('success', `UDP flood started successfully!`);
                this.addLog('info', `Packets per second: ${result.packets_per_second}`);
                this.addLog('info', `Target bandwidth: ${result.target_bandwidth_mbps} Mbps`);
                
                // Update status display
                document.getElementById('flood-status').innerHTML = `
                    <strong>Status:</strong> ATTACKING • 
                    <strong>Target:</strong> ${targetIP}:${targetPort} • 
                    <strong>Bandwidth:</strong> ~80 Mbps
                `;
                document.getElementById('flood-status').classList.add('active');
                
            } else {
                this.addLog('error', `Failed to start flood: ${result.error}`);
            }
            
        } catch (error) {
            this.addLog('error', `Network error: ${error.message}`);
        }
    }
    
    async stopFlood() {
        try {
            this.addLog('info', 'Stopping UDP flood attack...');
            
            const response = await fetch('/dos/stop-flood', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.ok) {
                this.isFloodActive = false;
                this.updateUI();
                this.stopAttackAnimation();
                this.stopStatusMonitoring();
                
                this.addLog('success', 'UDP flood stopped');
                if (result.packets_sent) {
                    this.addLog('info', `Final Statistics:`);
                    this.addLog('info', `• Packets sent: ${result.packets_sent.toLocaleString()}`);
                    this.addLog('info', `• Bytes sent: ${result.bytes_sent.toLocaleString()}`);
                    this.addLog('info', `• Duration: ${result.duration_seconds} seconds`);
                    this.addLog('info', `• Average bandwidth: ${result.average_bandwidth_mbps} Mbps`);
                }
                
                // Reset status display
                const targetIP = document.getElementById('target-ip').value.trim();
                const targetPort = document.getElementById('target-port').value;
                document.getElementById('flood-status').innerHTML = `
                    <strong>Status:</strong> Ready to attack • 
                    <strong>Target:</strong> ${targetIP}:${targetPort} • 
                    <strong>Mode:</strong> UDP Flood
                `;
                document.getElementById('flood-status').classList.remove('active');
                
                // Reset bandwidth display
                document.getElementById('bandwidth-display').innerHTML = `
                    Target: 80 Mbps<br>
                    Current: 0 Mbps<br>
                    Packets: 0
                `;
                document.getElementById('bandwidth-display').classList.remove('active');
                
            } else {
                this.addLog('error', `Failed to stop flood: ${result.error}`);
            }
            
        } catch (error) {
            this.addLog('error', `Network error: ${error.message}`);
        }
    }
    
    startStatusMonitoring() {
        this.statusInterval = setInterval(async () => {
            try {
                const response = await fetch('/dos/flood-status');
                const result = await response.json();
                
                if (result.ok && result.active) {
                    // Update bandwidth display
                    const bandwidthDisplay = document.getElementById('bandwidth-display');
                    bandwidthDisplay.innerHTML = `
                        Target: 80 Mbps<br>
                        Current: ${result.current_bandwidth_mbps || 0} Mbps<br>
                        Packets: ${(result.packets_sent || 0).toLocaleString()}
                    `;
                    bandwidthDisplay.classList.add('active');
                    
                    // Update target status indicator
                    const targetStatus = document.getElementById('target-status');
                    if (targetStatus) {
                        targetStatus.setAttribute('fill', '#e74c3c'); // Red when under attack
                    }
                } else if (result.ok && !result.active) {
                    // Flood stopped
                    this.isFloodActive = false;
                    this.updateUI();
                    this.stopStatusMonitoring();
                }
                
            } catch (error) {
                console.error('Status monitoring error:', error);
            }
        }, 1000); // Update every second
    }
    
    stopStatusMonitoring() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        
        // Reset target status indicator
        const targetStatus = document.getElementById('target-status');
        if (targetStatus) {
            targetStatus.setAttribute('fill', '#27ae60'); // Green when not under attack
        }
    }
    
    startAttackAnimation() {
        // Show attack indicators
        const attackIndicators = document.getElementById('attack-indicators');
        if (attackIndicators) {
            attackIndicators.setAttribute('opacity', '1');
        }
        
        // Start packet animation
        this.animationInterval = setInterval(() => {
            this.animateFloodPacket();
        }, 100); // Fast packet animation for flood effect
    }
    
    stopAttackAnimation() {
        // Hide attack indicators
        const attackIndicators = document.getElementById('attack-indicators');
        if (attackIndicators) {
            attackIndicators.setAttribute('opacity', '0');
        }
        
        // Stop packet animation
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
        
        // Clear existing packets
        const packetLayer = document.getElementById('packet-layer');
        if (packetLayer) {
            packetLayer.innerHTML = '';
        }
    }
    
    animateFloodPacket() {
        const packetLayer = document.getElementById('packet-layer');
        if (!packetLayer) return;
        
        // Create multiple packets for flood effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                packet.setAttribute('r', '4');
                packet.setAttribute('fill', '#e74c3c');
                packet.setAttribute('opacity', '0.8');
                
                // Start from attacker position
                const startX = 170;
                const startY = 290;
                const endX = 960; // Target device position
                const endY = 240;
                
                packet.setAttribute('cx', startX);
                packet.setAttribute('cy', startY);
                
                // Animate packet movement
                const animateX = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
                animateX.setAttribute('attributeName', 'cx');
                animateX.setAttribute('values', `${startX};${endX}`);
                animateX.setAttribute('dur', '0.5s');
                animateX.setAttribute('fill', 'freeze');
                
                const animateY = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
                animateY.setAttribute('attributeName', 'cy');
                animateY.setAttribute('values', `${startY};${endY}`);
                animateY.setAttribute('dur', '0.5s');
                animateY.setAttribute('fill', 'freeze');
                
                const animateOpacity = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
                animateOpacity.setAttribute('attributeName', 'opacity');
                animateOpacity.setAttribute('values', '0.8;0.8;0');
                animateOpacity.setAttribute('dur', '0.5s');
                animateOpacity.setAttribute('fill', 'freeze');
                
                packet.appendChild(animateX);
                packet.appendChild(animateY);
                packet.appendChild(animateOpacity);
                
                packetLayer.appendChild(packet);
                
                // Remove packet after animation
                setTimeout(() => {
                    if (packet.parentNode) {
                        packet.parentNode.removeChild(packet);
                    }
                }, 500);
                
            }, i * 50); // Stagger packet creation
        }
    }
    
    updateUI() {
        const startBtn = document.getElementById('start-flood-btn');
        const stopBtn = document.getElementById('stop-flood-btn');
        
        if (this.isFloodActive) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            startBtn.style.opacity = '0.5';
            stopBtn.style.opacity = '1';
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            startBtn.style.opacity = '1';
            stopBtn.style.opacity = '0.5';
        }
    }
    
    updateTargetDisplay() {
        const targetIP = document.getElementById('target-ip').value.trim();
        const targetPort = document.getElementById('target-port').value;
        
        // Update target device description
        const targetDesc = document.getElementById('target-device-desc');
        if (targetDesc) {
            targetDesc.textContent = targetIP || '192.168.127.98';
        }
        
        // Update status display if not attacking
        if (!this.isFloodActive) {
            document.getElementById('flood-status').innerHTML = `
                <strong>Status:</strong> Ready to attack • 
                <strong>Target:</strong> ${targetIP || '192.168.127.98'}:${targetPort || '53'} • 
                <strong>Mode:</strong> UDP Flood
            `;
        }
    }
    
    addLog(type, message) {
        const logContainer = document.getElementById('log-container');
        if (!logContainer) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        logEntry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    
    addInitialLog(message) {
        const logContainer = document.getElementById('log-container');
        if (!logContainer) return;
        
        // Clear existing logs
        logContainer.innerHTML = '';
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry info';
        
        logEntry.innerHTML = `
            <span class="timestamp">[Ready]</span>
            <span class="message">${message}</span>
        `;
        
        logContainer.appendChild(logEntry);
    }
    
    clearLog() {
        const logContainer = document.getElementById('log-container');
        if (logContainer) {
            logContainer.innerHTML = '';
            this.addInitialLog('DOS Attack Simulator ready - Target: 192.168.127.98');
        }
    }
}

// Export for use in HTML
window.DOSAttackController = DOSAttackController;
