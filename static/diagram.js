// Interactive Network Diagram JavaScript
class NetworkDiagram {
    constructor() {
        this.targetIP = '192.168.1.100';
        this.interfaces = [];
        this.eventSource = null;
        this.isAttacking = false;
        this.currentAttackPort = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.startLEDMonitoring();
        this.updateTargetIP();
        this.addInitialLog('System initialized and ready for demonstration');
    }
    
    setupEventListeners() {
        // Target IP input
        document.getElementById('target-ip').addEventListener('input', (e) => {
            this.targetIP = e.target.value.trim();
            this.updateTargetIP();
        });
        
        // Discover button
        document.getElementById('discover-btn').addEventListener('click', () => {
            this.discoverNetwork();
        });
        
        // Clear log button
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });
        
        // Raspberry Pi click for LED demo
        document.getElementById('raspberry-pi').addEventListener('click', () => {
            this.triggerLEDDemo();
        });
    }
    
    updateTargetIP() {
        const switchElement = document.getElementById('switch-ip');
        if (switchElement) {
            switchElement.textContent = this.targetIP;
        }
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
                this.updateLEDDisplay(data);
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
    
    updateLEDDisplay(data) {
        if (data.pins) {
            Object.entries(data.pins).forEach(([pin, value]) => {
                // Update mini LEDs in header
                const headerLED = document.getElementById(`led-${pin}`);
                if (headerLED) {
                    headerLED.classList.toggle('on', value === 1);
                }
                
                // Update SVG LEDs in Raspberry Pi
                const svgLED = document.getElementById(`rpi-led-${pin}`);
                if (svgLED) {
                    svgLED.classList.toggle('on', value === 1);
                }
            });
        }
    }
    
    // Network Discovery
    async discoverNetwork() {
        if (!this.targetIP) {
            this.addLog('Please enter a target IP address', 'error');
            return;
        }
        
        this.setDiscovering(true);
        this.addLog(`Starting network discovery on ${this.targetIP}`, 'info');
        
        try {
            // First, do SNMP walk
            await this.performSNMPWalk();
            
            // Then get interfaces
            await this.getInterfaces();
            
        } catch (error) {
            this.addLog(`Discovery failed: ${error.message}`, 'error');
        }
        
        this.setDiscovering(false);
    }
    
    async performSNMPWalk() {
        this.addLog('Performing SNMP walk...', 'info');
        this.animatePacket('snmp-walk');
        
        try {
            const response = await fetch(`/snmp/walk?target=${encodeURIComponent(this.targetIP)}&community=public`);
            const data = await response.json();
            
            if (data.ok) {
                this.addLog('SNMP walk completed successfully', 'success');
                this.flashActivityLED();
            } else {
                this.addLog(`SNMP walk failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.addLog(`SNMP walk error: ${error.message}`, 'error');
        }
    }
    
    async getInterfaces() {
        this.addLog('Discovering network interfaces...', 'info');
        this.animatePacket('interface-discovery');
        
        try {
            const response = await fetch(`/snmp/interfaces?target=${encodeURIComponent(this.targetIP)}&community=public`);
            const data = await response.json();
            
            if (data.ok) {
                this.addLog('Interface discovery completed', 'success');
                this.parseInterfaces(data.interfaces);
                this.flashActivityLED();
            } else {
                this.addLog(`Interface discovery failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.addLog(`Interface discovery error: ${error.message}`, 'error');
        }
    }
    
    parseInterfaces(interfaceData) {
        try {
            const names = this.parseSnmpOutput(interfaceData.names);
            const adminStatus = this.parseSnmpOutput(interfaceData.admin_status);
            const operStatus = this.parseSnmpOutput(interfaceData.oper_status);
            
            // Combine the data
            const combinedData = {};
            
            names.forEach(item => {
                const ifIndex = item.oid.split('.').pop();
                combinedData[ifIndex] = { 
                    name: item.value, 
                    ifIndex: ifIndex 
                };
            });
            
            adminStatus.forEach(item => {
                const ifIndex = item.oid.split('.').pop();
                if (combinedData[ifIndex]) {
                    combinedData[ifIndex].adminStatus = item.value === '1' ? 'up' : 'down';
                }
            });
            
            operStatus.forEach(item => {
                const ifIndex = item.oid.split('.').pop();
                if (combinedData[ifIndex]) {
                    combinedData[ifIndex].operStatus = item.value === '1' ? 'up' : 'down';
                }
            });
            
            // Filter and store interfaces
            this.interfaces = Object.values(combinedData).filter(iface => 
                iface.name && 
                !iface.name.toLowerCase().includes('loopback') &&
                !iface.name.toLowerCase().includes('null') &&
                !iface.name.toLowerCase().includes('vlan')
            );
            
            this.addLog(`Found ${this.interfaces.length} network interfaces`, 'success');
            this.displayPorts();
            this.updateDeviceConnections();
            
        } catch (error) {
            this.addLog(`Error parsing interface data: ${error.message}`, 'error');
        }
    }
    
    parseSnmpOutput(output) {
        const results = [];
        if (!output) return results;
        
        const lines = output.split('\n');
        lines.forEach(line => {
            const match = line.match(/^(.+?)\s*=\s*(.+?):\s*(.+)$/);
            if (match) {
                results.push({
                    oid: match[1].trim(),
                    type: match[2].trim(),
                    value: match[3].trim().replace(/"/g, '')
                });
            }
        });
        
        return results;
    }
    
    displayPorts() {
        const container = document.getElementById('ports-container');
        
        if (this.interfaces.length === 0) {
            container.innerHTML = '<div class="port-placeholder">No network interfaces found</div>';
            return;
        }
        
        let html = '';
        this.interfaces.forEach((iface, index) => {
            const statusClass = iface.operStatus === 'up' ? 'status-up' : 'status-down';
            const adminClass = iface.adminStatus === 'up' ? 'status-up' : 'status-down';
            
            html += `
                <div class="port-item" data-ifindex="${iface.ifIndex}" data-port="${index + 1}">
                    <div class="port-name">${iface.name}</div>
                    <div class="port-status">
                        <span>Admin: <span class="${adminClass}">${iface.adminStatus.toUpperCase()}</span></span>
                        <span>Oper: <span class="${statusClass}">${iface.operStatus.toUpperCase()}</span></span>
                    </div>
                    <div class="port-actions">
                        <button class="port-btn attack" onclick="networkDiagram.attackPort('${iface.ifIndex}', 'down', ${index + 1})">
                            <i class="fas fa-arrow-down"></i> Attack
                        </button>
                        <button class="port-btn restore" onclick="networkDiagram.attackPort('${iface.ifIndex}', 'up', ${index + 1})">
                            <i class="fas fa-arrow-up"></i> Restore
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Attack Port Function
    async attackPort(ifIndex, action, portNumber) {
        if (this.isAttacking) {
            this.addLog('Attack already in progress, please wait...', 'warning');
            return;
        }
        
        this.isAttacking = true;
        this.currentAttackPort = portNumber;
        
        const actionText = action === 'down' ? 'ATTACK' : 'RESTORE';
        const community = 'private'; // Use write community
        
        this.addLog(`${actionText}: Targeting port ${ifIndex} (${action.toUpperCase()})`, 'attack');
        this.setAttackMode(true);
        this.highlightTargetDevice(portNumber, true);
        
        try {
            // Animate attack packet
            this.animateAttackPacket(portNumber, action);
            
            // Execute SNMP command
            const endpoint = action === 'down' ? 'portdown' : 'portup';
            const response = await fetch(`/snmp/${endpoint}?target=${encodeURIComponent(this.targetIP)}&ifindex=${encodeURIComponent(ifIndex)}&community=${encodeURIComponent(community)}`);
            const data = await response.json();
            
            if (data.ok) {
                this.addLog(`${actionText} successful on port ${ifIndex}`, 'success');
                this.updatePortStatus(ifIndex, action);
                this.updateDeviceStatus(portNumber, action);
                this.flashActivityLED();
            } else {
                this.addLog(`${actionText} failed: ${data.error || 'Unknown error'}`, 'error');
            }
            
        } catch (error) {
            this.addLog(`${actionText} error: ${error.message}`, 'error');
        }
        
        // Clean up attack state
        setTimeout(() => {
            this.setAttackMode(false);
            this.highlightTargetDevice(portNumber, false);
            this.isAttacking = false;
            this.currentAttackPort = null;
        }, 2000);
    }
    
    updatePortStatus(ifIndex, action) {
        // Update the port display
        const portElement = document.querySelector(`[data-ifindex="${ifIndex}"]`);
        if (portElement) {
            const adminSpan = portElement.querySelector('.port-status span:first-child span');
            if (adminSpan) {
                adminSpan.textContent = action.toUpperCase();
                adminSpan.className = action === 'up' ? 'status-up' : 'status-down';
            }
        }
        
        // Update interface data
        const iface = this.interfaces.find(i => i.ifIndex === ifIndex);
        if (iface) {
            iface.adminStatus = action;
        }
    }
    
    updateDeviceStatus(portNumber, action) {
        const deviceStatus = document.getElementById(`device-${portNumber}-status`);
        const deviceConnection = document.getElementById(`connection-device-${portNumber}`);
        
        if (deviceStatus) {
            deviceStatus.classList.toggle('down', action === 'down');
            deviceStatus.classList.toggle('up', action === 'up');
        }
        
        if (deviceConnection) {
            deviceConnection.classList.toggle('down', action === 'down');
        }
    }
    
    updateDeviceConnections() {
        // Update device connections based on discovered interfaces
        for (let i = 1; i <= 4; i++) {
            const connection = document.getElementById(`connection-device-${i}`);
            const status = document.getElementById(`device-${i}-status`);
            
            if (i <= this.interfaces.length) {
                const iface = this.interfaces[i - 1];
                const isUp = iface.operStatus === 'up';
                
                if (connection) {
                    connection.classList.toggle('down', !isUp);
                }
                if (status) {
                    status.classList.toggle('up', isUp);
                    status.classList.toggle('down', !isUp);
                }
            }
        }
    }
    
    // Animation Functions
    animatePacket(type) {
        const svg = document.getElementById('network-svg');
        const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        
        packet.setAttribute('r', '6');
        packet.setAttribute('class', `packet packet-${type}`);
        packet.setAttribute('cx', '170');
        packet.setAttribute('cy', '390');
        
        svg.appendChild(packet);
        
        // Animate packet movement
        const animation = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        animation.setAttribute('attributeName', 'transform');
        animation.setAttribute('type', 'translate');
        animation.setAttribute('values', '0,0; 330,-30; 330,-30');
        animation.setAttribute('dur', '1.5s');
        animation.setAttribute('repeatCount', '1');
        
        packet.appendChild(animation);
        
        // Remove packet after animation
        setTimeout(() => {
            if (packet.parentNode) {
                packet.parentNode.removeChild(packet);
            }
        }, 1500);
    }
    
    animateAttackPacket(portNumber, action) {
        const svg = document.getElementById('network-svg');
        const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        
        packet.setAttribute('r', '8');
        packet.setAttribute('class', 'packet packet-attack');
        packet.setAttribute('cx', '170');
        packet.setAttribute('cy', '390');
        
        svg.appendChild(packet);
        
        // Calculate target position based on port
        const targetY = 200 + (portNumber - 1) * 100;
        
        // Animate to switch first
        const toSwitch = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        toSwitch.setAttribute('attributeName', 'transform');
        toSwitch.setAttribute('type', 'translate');
        toSwitch.setAttribute('values', '0,0; 430,-30');
        toSwitch.setAttribute('dur', '1s');
        toSwitch.setAttribute('begin', '0s');
        
        packet.appendChild(toSwitch);
        
        // Then to target device
        const toDevice = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        toDevice.setAttribute('attributeName', 'transform');
        toDevice.setAttribute('type', 'translate');
        toDevice.setAttribute('values', `430,-30; 730,${targetY - 390}`);
        toDevice.setAttribute('dur', '1s');
        toDevice.setAttribute('begin', '1s');
        
        packet.appendChild(toDevice);
        
        // Color change animation
        const colorChange = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        colorChange.setAttribute('attributeName', 'fill');
        colorChange.setAttribute('values', '#e74c3c; #f39c12; #e74c3c');
        colorChange.setAttribute('dur', '2s');
        colorChange.setAttribute('repeatCount', '1');
        
        packet.appendChild(colorChange);
        
        // Remove packet after animation
        setTimeout(() => {
            if (packet.parentNode) {
                packet.parentNode.removeChild(packet);
            }
        }, 2000);
    }
    
    flashActivityLED() {
        const activityLED = document.getElementById('switch-activity');
        if (activityLED) {
            activityLED.style.fill = '#27ae60';
            setTimeout(() => {
                activityLED.style.fill = '#f39c12';
            }, 500);
        }
    }
    
    setAttackMode(active) {
        const svg = document.getElementById('network-svg');
        if (active) {
            svg.classList.add('attack-active');
        } else {
            svg.classList.remove('attack-active');
        }
    }
    
    highlightTargetDevice(portNumber, highlight) {
        const device = document.getElementById(`device-${portNumber}`);
        const connection = document.getElementById(`connection-device-${portNumber}`);
        
        if (device) {
            device.classList.toggle('device-compromised', highlight);
        }
        if (connection) {
            connection.classList.toggle('attacking', highlight);
        }
    }
    
    setDiscovering(discovering) {
        const btn = document.getElementById('discover-btn');
        const statusText = document.getElementById('status-text');
        
        if (discovering) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Discovering...';
            statusText.textContent = 'Scanning network...';
            statusText.style.color = '#f39c12';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search"></i> Discover Network';
            statusText.textContent = 'Network discovery complete';
            statusText.style.color = '#27ae60';
        }
    }
    
    // LED Demo Function
    async triggerLEDDemo() {
        this.addLog('Triggering LED demonstration', 'info');
        
        try {
            const response = await fetch('/demo/packet', { method: 'POST' });
            const data = await response.json();
            
            if (data.ok) {
                this.addLog('LED demo animation triggered', 'success');
            } else {
                this.addLog('LED demo failed', 'error');
            }
        } catch (error) {
            this.addLog(`LED demo error: ${error.message}`, 'error');
        }
    }
    
    // Logging Functions
    addLog(message, type = 'info') {
        const container = document.getElementById('log-container');
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
    
    addInitialLog(message) {
        const container = document.getElementById('log-container');
        container.innerHTML = `
            <div class="log-entry info">
                <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                <span class="message">${message}</span>
            </div>
        `;
    }
    
    clearLog() {
        const container = document.getElementById('log-container');
        container.innerHTML = '';
        this.addInitialLog('Log cleared - ready for new demonstration');
    }
    
    // Cleanup
    destroy() {
        if (this.eventSource) {
            this.eventSource.close();
        }
    }
}

// Initialize the network diagram when page loads
let networkDiagram;

document.addEventListener('DOMContentLoaded', function() {
    networkDiagram = new NetworkDiagram();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (networkDiagram) {
        networkDiagram.destroy();
    }
});
