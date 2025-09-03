// Interactive Network Diagram JavaScript
class NetworkDiagram {
    constructor() {
        this.targetIP = '192.168.1.100';
        this.interfaces = [];
        this.eventSource = null;
        this.isAttacking = false;
        this.currentAttackPort = null;
        this.isDragging = false;
        this.dragElement = null;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        // LED monitoring removed per user request
        this.updateTargetIP();
        this.loadCustomizations();
        this.loadComponentPositions();
        this.loadDeviceVisibilitySettings();
        this.setupDragAndDrop();
        this.setupImageResize();
        this.addInitialLog('System initialized and ready for demonstration');
    }
    
    setupEventListeners() {
        // Target IP input
        document.getElementById('target-ip').addEventListener('input', (e) => {
            this.targetIP = e.target.value.trim();
            this.updateTargetIP();
        });
        
        // Community string is now hardcoded: public for read, private for write
        
        // Port control buttons
        document.getElementById('discover-btn').addEventListener('click', () => {
            this.performSNMPWalk();
        });
        
        document.getElementById('port-down-btn').addEventListener('click', () => {
            this.portDown();
        });
        
        document.getElementById('port-up-btn').addEventListener('click', () => {
            this.portUp();
        });
        
        document.getElementById('check-status-btn').addEventListener('click', () => {
            this.checkPortStatus();
        });
        
        // LED control buttons removed - available on settings page
        
        // Manual LED control removed per user request
        
        // Clear log button
        document.getElementById('clear-log').addEventListener('click', () => {
            this.clearLog();
        });
        
        // Target port selection
        document.getElementById('target-port').addEventListener('input', (e) => {
            this.selectedPort = e.target.value;
            this.highlightTargetPort(e.target.value);
            if (e.target.value) {
                this.addLog(`Target port selected: ${e.target.value}`, 'info');
            }
        });
        
        // Connected devices toggle moved to admin panel
        
        // Raspberry Pi click functionality removed
        
        // Listen for device visibility changes from admin panel
        window.addEventListener('storage', (e) => {
            if (e.key === 'deviceVisibilityUpdate') {
                const data = JSON.parse(e.newValue);
                this.toggleSingleDevice(data.deviceId, data.show);
            }
        });
        
        // Drag and drop setup moved to init() to ensure proper initialization
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
                    // LED monitoring removed per user request
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
                
                // Update manual control LEDs
                const manualLED = document.getElementById(`manual-led-${pin}`);
                if (manualLED) {
                    manualLED.classList.toggle('on', value === 1);
                }
                
                // Update manual button state
                const manualBtn = document.querySelector(`[data-pin="${pin}"]`);
                if (manualBtn) {
                    manualBtn.classList.toggle('active', value === 1);
                }
            });
        }
    }
    
    // Community strings are now hardcoded: public for read, private for write
    
    // Port Control Functions
    async portDown() {
        // Get current target IP from input field
        const targetIP = document.getElementById('target-ip').value.trim();
        if (!targetIP) {
            this.addLog('Please enter a target IP address', 'error');
            return;
        }
        
        const selectedPort = document.getElementById('target-port').value;
        if (!selectedPort) {
            this.addLog('Please select a target port number', 'error');
            return;
        }
        
        this.targetIP = targetIP; // Update stored value
        this.addLog(`Setting port ${selectedPort} DOWN on ${targetIP}`, 'attack');
        
        try {
            const response = await fetch(`/snmp/portdown?target=${encodeURIComponent(this.targetIP)}&ifindex=${selectedPort}&community=private`);
            const data = await response.json();
            
            if (data.ok) {
                // Check the actual status from confirmation
                if (data.confirm_stdout) {
                    const statusMatch = data.confirm_stdout.match(/INTEGER:\s*(\d+)/);
                    const actualStatus = statusMatch ? statusMatch[1] : 'unknown';
                    const statusText = actualStatus === '1' ? 'UP' : actualStatus === '2' ? 'DOWN' : `Unknown (${actualStatus})`;
                    
                    this.addLog(`Port ${selectedPort} command executed - Current status: ${statusText}`, actualStatus === '2' ? 'success' : 'warning');
                    this.addLog(`Status confirmation: ${data.confirm_stdout}`, 'info');
                } else {
                    this.addLog(`Port ${selectedPort} DOWN command sent`, 'success');
                }
            } else {
                this.addLog(`Port DOWN failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.addLog(`Port DOWN error: ${error.message}`, 'error');
        }
    }
    
    async portUp() {
        // Get current target IP from input field
        const targetIP = document.getElementById('target-ip').value.trim();
        if (!targetIP) {
            this.addLog('Please enter a target IP address', 'error');
            return;
        }
        
        const selectedPort = document.getElementById('target-port').value;
        if (!selectedPort) {
            this.addLog('Please select a target port number', 'error');
            return;
        }
        
        this.targetIP = targetIP; // Update stored value
        this.addLog(`Setting port ${selectedPort} UP on ${targetIP}`, 'info');
        
        try {
            const response = await fetch(`/snmp/portup?target=${encodeURIComponent(this.targetIP)}&ifindex=${selectedPort}&community=private`);
            const data = await response.json();
            
            if (data.ok) {
                // Check the actual status from confirmation
                if (data.confirm_stdout) {
                    const statusMatch = data.confirm_stdout.match(/INTEGER:\s*(\d+)/);
                    const actualStatus = statusMatch ? statusMatch[1] : 'unknown';
                    const statusText = actualStatus === '1' ? 'UP' : actualStatus === '2' ? 'DOWN' : `Unknown (${actualStatus})`;
                    
                    this.addLog(`Port ${selectedPort} command executed - Current status: ${statusText}`, actualStatus === '1' ? 'success' : 'warning');
                    this.addLog(`Status confirmation: ${data.confirm_stdout}`, 'info');
                } else {
                    this.addLog(`Port ${selectedPort} UP command sent`, 'success');
                }
            } else {
                this.addLog(`Port UP failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.addLog(`Port UP error: ${error.message}`, 'error');
        }
    }
    
    async checkPortStatus() {
        // Get current target IP from input field
        const targetIP = document.getElementById('target-ip').value.trim();
        if (!targetIP) {
            this.addLog('Please enter a target IP address', 'error');
            return;
        }
        
        const selectedPort = document.getElementById('target-port').value;
        if (!selectedPort) {
            this.addLog('Please select a target port number', 'error');
            return;
        }
        
        this.targetIP = targetIP; // Update stored value
        this.addLog(`Checking status of port ${selectedPort} on ${targetIP}`, 'info');
        
        try {
            const response = await fetch(`/snmp/portstatus?target=${encodeURIComponent(this.targetIP)}&ifindex=${selectedPort}&community=public`);
            const data = await response.json();
            
            if (data.ok) {
                const status = data.status === '1' ? 'UP' : data.status === '2' ? 'DOWN' : `Unknown (${data.status})`;
                this.addLog(`Port ${selectedPort} status: ${status}`, 'info');
            } else {
                this.addLog(`Status check failed: ${data.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.addLog(`Status check error: ${error.message}`, 'error');
        }
    }
    
    async performSNMPWalk() {
        // Get current target IP from input field
        const targetIP = document.getElementById('target-ip').value.trim();
        if (!targetIP) {
            this.addLog('Please enter a target IP address', 'error');
            return;
        }
        
        this.targetIP = targetIP; // Update stored value
        this.addLog(`Performing SNMP walk on ${targetIP} to discover ports`, 'info');
        
        this.animatePacket('snmp-walk');
        
        try {
            const response = await fetch(`/snmp/walk?target=${encodeURIComponent(this.targetIP)}&community=public`);
            const data = await response.json();
            
            if (data.ok) {
                this.addLog(`SNMP walk completed successfully - ports discovered`, 'success');
                this.addLog(`Command: ${data.cmd}`, 'info');
                
                // Parse SNMP walk output and populate discovered ports
                if (data.stdout) {
                    this.parseSNMPWalkResults(data.stdout);
                }
            } else {
                this.addLog(`SNMP walk failed: ${data.error || 'Unknown error'}`, 'error');
                if (data.stderr) {
                    this.addLog(`Error: ${data.stderr}`, 'error');
                }
            }
        } catch (error) {
            this.addLog(`SNMP walk error: ${error.message}`, 'error');
        }
    }
    
    parseSNMPWalkResults(output) {
        const lines = output.split('\n');
        const ports = [];
        
        lines.forEach(line => {
            if (line.trim()) {
                // Parse SNMP output - handle multiple formats:
                // "IF-MIB::ifName.7 = STRING: Ethernet Port 7"
                // "iso.3.6.1.2.1.31.1.1.1.1.7 = STRING: Ethernet Port 7"
                let match = line.match(/ifName\.(\d+)\s*=\s*STRING:\s*(.+)/);
                if (!match) {
                    // Try OID format: iso.3.6.1.2.1.31.1.1.1.1.X = STRING: name
                    match = line.match(/iso\.3\.6\.1\.2\.1\.31\.1\.1\.1\.1\.(\d+)\s*=\s*STRING:\s*(.+)/);
                }
                if (!match) {
                    // Try numeric OID format: 1.3.6.1.2.1.31.1.1.1.1.X = STRING: name
                    match = line.match(/1\.3\.6\.1\.2\.1\.31\.1\.1\.1\.1\.(\d+)\s*=\s*STRING:\s*(.+)/);
                }
                
                if (match) {
                    const ifIndex = match[1];
                    const portName = match[2].trim().replace(/"/g, '');
                    
                    // Filter out non-physical ports
                    if (!portName.toLowerCase().includes('loopback') && 
                        !portName.toLowerCase().includes('null') &&
                        !portName.toLowerCase().includes('vlan') &&
                        !portName.toLowerCase().includes('management') &&
                        portName.trim() !== '') {
                        ports.push({
                            ifIndex: ifIndex,
                            name: portName,
                            adminStatus: 'unknown',
                            operStatus: 'unknown'
                        });
                    }
                } else {
                    // Log unmatched lines for debugging
                    this.addLog(`Debug - Unmatched line: ${line.trim()}`, 'info');
                }
            }
        });
        
        this.interfaces = ports;
        this.addLog(`Found ${ports.length} network interfaces`, ports.length > 0 ? 'success' : 'warning');
        
        // Log discovered ports directly in the log
        if (ports.length > 0) {
            ports.forEach(port => {
                this.addLog(`Port ${port.ifIndex}: ${port.name}`, 'info');
            });
        } else {
            this.addLog('No valid network interfaces found - check SNMP output format', 'warning');
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
                // Activity LED flash removed
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
    
    // displayPorts function removed - discovered ports section eliminated
    
    // Old attackPort function removed - using direct port control buttons now
    
    // updatePortStatus function removed - no longer needed without discovered ports panel
    
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
    
    // Activity LED flash removed per user request
    
    updatePortLabels(components) {
        // Update port labels on the switch based on configuration
        if (components && components.device1 && components.device1.port) {
            const port1Label = document.getElementById('switch-port-1');
            if (port1Label) port1Label.textContent = components.device1.port;
        }
        
        if (components && components.device2 && components.device2.port) {
            const port2Label = document.getElementById('switch-port-2');
            if (port2Label) port2Label.textContent = components.device2.port;
        }
        
        if (components && components.device3 && components.device3.port) {
            const port3Label = document.getElementById('switch-port-3');
            if (port3Label) port3Label.textContent = components.device3.port;
        }
        
        if (components && components.device4 && components.device4.port) {
            const port4Label = document.getElementById('switch-port-4');
            if (port4Label) port4Label.textContent = components.device4.port;
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
    
    // LED demo function removed per user request
    
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
    
    // Individual device visibility toggle (controlled from admin panel)
    toggleSingleDevice(deviceId, show) {
        const device = document.getElementById(deviceId);
        const connectionLine = document.getElementById(`connection-${deviceId}`);
        const portNum = deviceId.split('-')[1];
        const portLabel = document.getElementById(`switch-port-${portNum}`);
        
        // Toggle device visibility
        if (device) {
            device.style.display = show ? 'block' : 'none';
        }
        
        // Toggle connection line visibility
        if (connectionLine) {
            connectionLine.style.display = show ? 'block' : 'none';
        }
        
        // Toggle corresponding port label on switch
        if (portLabel) {
            portLabel.style.display = show ? 'block' : 'none';
        }
        
        this.addLog(`${deviceId.replace('-', ' ')} ${show ? 'shown' : 'hidden'}`, 'info');
    }

    // Load device visibility settings on page load
    async loadDeviceVisibilitySettings() {
        try {
            const response = await fetch('/load-config');
            const data = await response.json();
            
            if (data.ok && data.config && data.config.display) {
                const config = data.config;
                this.toggleSingleDevice('device-1', config.display.showDevice1 !== false);
                this.toggleSingleDevice('device-2', config.display.showDevice2 !== false);
                this.toggleSingleDevice('device-3', config.display.showDevice3 !== false);
                this.toggleSingleDevice('device-4', config.display.showDevice4 !== false);
            } else {
                // Fallback to localStorage
                const saved = localStorage.getItem('kormarineSeaNetConfig');
                if (saved) {
                    try {
                        const config = JSON.parse(saved);
                        if (config.display) {
                            this.toggleSingleDevice('device-1', config.display.showDevice1 !== false);
                            this.toggleSingleDevice('device-2', config.display.showDevice2 !== false);
                            this.toggleSingleDevice('device-3', config.display.showDevice3 !== false);
                            this.toggleSingleDevice('device-4', config.display.showDevice4 !== false);
                        }
                    } catch (error) {
                        console.error('Error loading local device visibility settings:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading server device visibility settings:', error);
        }
    }
    
    // Target port highlighting
    highlightTargetPort(portNum) {
        // Remove previous highlights
        document.querySelectorAll('.port-label').forEach(label => {
            label.style.fill = '#2c3e50';
            label.style.fontWeight = 'bold';
        });
        
        document.querySelectorAll('.device-connection').forEach(line => {
            line.style.stroke = '#27ae60';
            line.style.strokeWidth = '3';
        });
        
        // Highlight selected port
        if (portNum) {
            const portLabel = document.getElementById(`switch-port-${portNum}`);
            const connectionLine = document.getElementById(`connection-device-${portNum}`);
            
            if (portLabel) {
                portLabel.style.fill = '#dc3545';
                portLabel.style.fontWeight = 'bold';
            }
            
            if (connectionLine) {
                connectionLine.style.stroke = '#dc3545';
                connectionLine.style.strokeWidth = '4';
            }
        }
    }
    
    // LED Control Functions removed - available on settings page
    
    async toggleManualLED(pin) {
        this.addLog(`Toggling LED ${pin}`, 'info');
        
        try {
            const response = await fetch(`/on${pin}`);
            const data = await response.json();
            
            if (data.ok) {
                this.addLog(`LED ${pin} activated`, 'success');
                // Activity LED flash removed
            } else {
                this.addLog(`Failed to activate LED ${pin}`, 'error');
            }
        } catch (error) {
            this.addLog(`Error toggling LED ${pin}: ${error.message}`, 'error');
        }
    }
    
    // Load customizations from server
    async loadCustomizations() {
        try {
            const response = await fetch('/load-config');
            const data = await response.json();
            
            if (data.ok && data.config && Object.keys(data.config).length > 0) {
                this.applyCustomizations(data.config);
                if (data.config.components) {
                    this.updatePortLabels(data.config.components);
                }
                this.addLog('Applied server-side customizations', 'info');
            } else {
                // Fallback to localStorage for backward compatibility
                const saved = localStorage.getItem('kormarineSeaNetConfig');
                if (saved) {
                    try {
                        const config = JSON.parse(saved);
                        this.applyCustomizations(config);
                        this.updatePortLabels(config.components);
                        this.addLog('Applied local customizations', 'info');
                    } catch (error) {
                        console.error('Error loading local customizations:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading server customizations:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('kormarineSeaNetConfig');
            if (saved) {
                try {
                    const config = JSON.parse(saved);
                    this.applyCustomizations(config);
                    this.updatePortLabels(config.components);
                    this.addLog('Applied local customizations (fallback)', 'info');
                } catch (error) {
                    console.error('Error loading local customizations:', error);
                }
            }
        }
    }
    
    applyCustomizations(config) {
        if (!config.components) return;
        
        // Update component names and descriptions
        const switchIP = document.getElementById('switch-ip');
        if (switchIP && config.components.switch) {
            // Update default target IP if configured
            if (config.components.switch.defaultIP && config.components.switch.defaultIP !== this.targetIP) {
                document.getElementById('target-ip').value = config.components.switch.defaultIP;
                this.targetIP = config.components.switch.defaultIP;
                this.updateTargetIP();
            }
        }
        
        // Update device names, descriptions, and images in the SVG
        this.updateDeviceLabels(config.components);
        this.updateDeviceImages(config.components);
        
        // Apply device visibility settings
        if (config.display) {
            this.applyDeviceVisibility(config.display);
        }
    }
    
    updateDeviceLabels(components) {
        // Update Raspberry Pi
        if (components.rpi) {
            const rpiName = document.getElementById('rpi-device-name');
            const rpiDesc = document.getElementById('rpi-device-desc');
            if (rpiName) rpiName.textContent = components.rpi.name;
            if (rpiDesc) rpiDesc.textContent = components.rpi.description;
        }
        
        // Update Switch
        if (components.switch) {
            const switchName = document.getElementById('switch-device-name');
            const switchDesc = document.getElementById('switch-device-desc');
            if (switchName) switchName.textContent = components.switch.name;
            if (switchDesc) switchDesc.textContent = components.switch.description;
        }
        
        // Update device text elements in SVG
        if (components.device1) {
            const device1Text = document.getElementById('device1-device-name');
            const device1Port = document.getElementById('device1-port-label');
            if (device1Text) device1Text.textContent = components.device1.name;
            if (device1Port) device1Port.textContent = components.device1.port;
        }
        
        if (components.device2) {
            const device2Text = document.getElementById('device2-device-name');
            const device2Port = document.getElementById('device2-port-label');
            if (device2Text) device2Text.textContent = components.device2.name;
            if (device2Port) device2Port.textContent = components.device2.port;
        }
        
        if (components.device3) {
            const device3Text = document.getElementById('device3-device-name');
            const device3Port = document.getElementById('device3-port-label');
            if (device3Text) device3Text.textContent = components.device3.name;
            if (device3Port) device3Port.textContent = components.device3.port;
        }
        
        if (components.device4) {
            const device4Text = document.getElementById('device4-device-name');
            const device4Port = document.getElementById('device4-port-label');
            if (device4Text) device4Text.textContent = components.device4.name;
            if (device4Port) device4Port.textContent = components.device4.port;
        }
    }
    
    updateDeviceImages(components) {
        // Update main device images (that replace the colored boxes)
        if (components.rpi && components.rpi.imageUrl) {
            const rpiImage = document.getElementById('rpi-main-image');
            if (rpiImage) {
                rpiImage.setAttribute('href', components.rpi.imageUrl);
            }
        }
        
        if (components.switch && components.switch.imageUrl) {
            const switchImage = document.getElementById('switch-main-image');
            if (switchImage) {
                switchImage.setAttribute('href', components.switch.imageUrl);
            }
        }
        
        if (components.device1 && components.device1.imageUrl) {
            const device1Image = document.getElementById('device1-main-image');
            if (device1Image) {
                device1Image.setAttribute('href', components.device1.imageUrl);
            }
        }
        
        if (components.device2 && components.device2.imageUrl) {
            const device2Image = document.getElementById('device2-main-image');
            if (device2Image) {
                device2Image.setAttribute('href', components.device2.imageUrl);
            }
        }
        
        if (components.device3 && components.device3.imageUrl) {
            const device3Image = document.getElementById('device3-main-image');
            if (device3Image) {
                device3Image.setAttribute('href', components.device3.imageUrl);
            }
        }
        
        if (components.device4 && components.device4.imageUrl) {
            const device4Image = document.getElementById('device4-main-image');
            if (device4Image) {
                device4Image.setAttribute('href', components.device4.imageUrl);
            }
        }
    }
    
    // Image resizing functionality
    setupImageResize() {
        this.isResizing = false;
        this.resizeElement = null;
        this.resizeStartSize = { width: 0, height: 0 };
        this.resizeStartMouse = { x: 0, y: 0 };

        // Add event listeners for resize handles
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', this.startResize.bind(this));
        });

        document.addEventListener('mousemove', this.resize.bind(this));
        document.addEventListener('mouseup', this.endResize.bind(this));
    }

    startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        const deviceType = e.target.dataset.device;
        
        // Find the corresponding image element
        if (deviceType === 'rpi') {
            this.resizeElement = document.getElementById('rpi-main-image');
        } else if (deviceType === 'switch') {
            this.resizeElement = document.getElementById('switch-main-image');
        } else if (deviceType.startsWith('device')) {
            this.resizeElement = document.getElementById(`${deviceType}-main-image`);
        }
        
        if (this.resizeElement) {
            const currentWidth = parseInt(this.resizeElement.getAttribute('width'));
            const currentHeight = parseInt(this.resizeElement.getAttribute('height'));
            
            this.resizeStartSize = { width: currentWidth, height: currentHeight };
            this.resizeStartMouse = { x: e.clientX, y: e.clientY };
            
            // Prevent dragging while resizing
            this.isDragging = false;
        }
    }

    resize(e) {
        if (!this.isResizing || !this.resizeElement) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - this.resizeStartMouse.x;
        const deltaY = e.clientY - this.resizeStartMouse.y;
        
        // Calculate new size (maintain aspect ratio)
        const aspectRatio = this.resizeStartSize.width / this.resizeStartSize.height;
        let newWidth = Math.max(50, this.resizeStartSize.width + deltaX);
        let newHeight = newWidth / aspectRatio;
        
        // Set minimum and maximum sizes
        newWidth = Math.max(50, Math.min(300, newWidth));
        newHeight = Math.max(35, Math.min(200, newHeight));
        
        this.resizeElement.setAttribute('width', newWidth);
        this.resizeElement.setAttribute('height', newHeight);
        
        // Update fallback box if it exists
        const deviceId = this.resizeElement.id.replace('-main-image', '-fallback-box');
        const fallbackBox = document.getElementById(deviceId);
        if (fallbackBox) {
            fallbackBox.setAttribute('width', newWidth);
            fallbackBox.setAttribute('height', newHeight);
        }
        
        // Update text positions and connection lines
        this.updateElementPositionsAfterResize(newWidth, newHeight);
    }

    endResize(e) {
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeElement = null;
        }
    }
    
    updateElementPositionsAfterResize(newWidth, newHeight) {
        if (!this.resizeElement) return;
        
        const imageId = this.resizeElement.id;
        let deviceType = '';
        let deviceGroup = null;
        
        // Determine device type and get the parent group
        if (imageId.includes('rpi')) {
            deviceType = 'rpi';
            deviceGroup = document.getElementById('raspberry-pi');
        } else if (imageId.includes('switch')) {
            deviceType = 'switch';
            deviceGroup = document.getElementById('network-switch');
        } else if (imageId.includes('device1')) {
            deviceType = 'device1';
            deviceGroup = document.getElementById('device-1');
        } else if (imageId.includes('device2')) {
            deviceType = 'device2';
            deviceGroup = document.getElementById('device-2');
        } else if (imageId.includes('device3')) {
            deviceType = 'device3';
            deviceGroup = document.getElementById('device-3');
        } else if (imageId.includes('device4')) {
            deviceType = 'device4';
            deviceGroup = document.getElementById('device-4');
        }
        
        if (!deviceGroup) return;
        
        // Update text positions based on new image size
        this.updateTextPositions(deviceGroup, deviceType, newWidth, newHeight);
        
        // Update resize handle position
        this.updateResizeHandle(deviceGroup, newWidth, newHeight);
        
        // Update connection lines
        this.updateConnectionsAfterResize(deviceType, newWidth, newHeight);
    }
    
    updateTextPositions(deviceGroup, deviceType, width, height) {
        const centerX = width / 2;
        const textY = height + 15; // Position text below the image
        const subtextY = height + 28;
        
        if (deviceType === 'rpi') {
            const nameText = deviceGroup.querySelector('#rpi-device-name');
            const descText = deviceGroup.querySelector('#rpi-device-desc');
            if (nameText) {
                nameText.setAttribute('x', centerX);
                nameText.setAttribute('y', textY);
            }
            if (descText) {
                descText.setAttribute('x', centerX);
                descText.setAttribute('y', subtextY);
            }
        } else if (deviceType === 'switch') {
            const nameText = deviceGroup.querySelector('#switch-device-name');
            const descText = deviceGroup.querySelector('#switch-device-desc');
            if (nameText) {
                nameText.setAttribute('x', centerX);
                nameText.setAttribute('y', textY);
            }
            if (descText) {
                descText.setAttribute('x', centerX);
                descText.setAttribute('y', textY + 13);
            }
            
            // Update port labels on the switch
            for (let i = 1; i <= 4; i++) {
                const portLabel = deviceGroup.querySelector(`#switch-port-${i}`);
                if (portLabel) {
                    portLabel.setAttribute('x', width - 10);
                    portLabel.setAttribute('y', -10 + (i * 30)); // Increased spacing to 30px
                }
            }
        } else {
            // Target devices - only device name now
            const deviceNum = deviceType.replace('device', '');
            const nameText = deviceGroup.querySelector(`#device${deviceNum}-device-name`);
            if (nameText) {
                nameText.setAttribute('x', centerX);
                nameText.setAttribute('y', textY);
            }
            
            // Update connection status indicator position
            const statusIndicator = deviceGroup.querySelector('.connection-status');
            if (statusIndicator) {
                statusIndicator.setAttribute('cx', width - 15);
            }
        }
    }
    
    updateResizeHandle(deviceGroup, width, height) {
        const resizeHandle = deviceGroup.querySelector('.resize-handle');
        if (resizeHandle) {
            resizeHandle.setAttribute('cx', width - 5);
        }
    }
    
    updateConnectionsAfterResize(deviceType, width, height) {
        // Get current device position
        let deviceGroup = null;
        let connectionId = '';
        
        if (deviceType === 'rpi') {
            deviceGroup = document.getElementById('raspberry-pi');
            connectionId = 'connection-attacker';
        } else if (deviceType.startsWith('device')) {
            const deviceNum = deviceType.replace('device', '');
            deviceGroup = document.getElementById(`device-${deviceNum}`);
            connectionId = `connection-device-${deviceNum}`;
        } else if (deviceType === 'switch') {
            // Handle switch resizing connections
            deviceGroup = document.getElementById('network-switch');
            // Switch has multiple connections, handle differently
            this.updateSwitchConnectionsAfterResize(width, height);
            return; // Early return since we handle connections differently for switch
        }
        
        if (!deviceGroup) return;
        
        // Get current transform position
        const transform = deviceGroup.getAttribute('transform');
        const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (!translateMatch) return;
        
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        
        // Update connection line endpoints
        const connection = document.getElementById(connectionId);
        if (connection && deviceType === 'rpi') {
            // For raspberry pi, connect from right edge middle
            connection.setAttribute('x1', x + width);
            connection.setAttribute('y1', y + height / 2);
        } else if (connection && deviceType.startsWith('device')) {
            // For target devices, connect to left edge middle
            connection.setAttribute('x2', x);
            connection.setAttribute('y2', y + height / 2);
        }
    }
    
    updateSwitchConnectionsAfterResize(width, height) {
        const switchGroup = document.getElementById('network-switch');
        if (!switchGroup) return;
        
        // Get current switch position
        const transform = switchGroup.getAttribute('transform');
        const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (!translateMatch) return;
        
        const x = parseFloat(translateMatch[1]);
        const y = parseFloat(translateMatch[2]);
        
        // Update attacker connection (incoming to switch)
        const attackerConnection = document.getElementById('connection-attacker');
        if (attackerConnection) {
            attackerConnection.setAttribute('x2', x);
            attackerConnection.setAttribute('y2', y + height / 2);
        }
        
                        // Update device connections (outgoing from switch)
                for (let i = 1; i <= 4; i++) {
                    const deviceConnection = document.getElementById(`connection-device-${i}`);
                    if (deviceConnection) {
                        deviceConnection.setAttribute('x1', x + width);
                        deviceConnection.setAttribute('y1', y + height / 2 - 45 + (i * 30)); // Increased spacing to 30px
                    }
                }
    }
    
    // Drag and Drop Setup
    setupDragAndDrop() {
        const draggableElements = ['raspberry-pi', 'network-switch', 'device-1', 'device-2', 'device-3', 'device-4'];
        
        draggableElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.style.cursor = 'move';
                
                element.addEventListener('mousedown', (e) => {
                    this.startDrag(e, element);
                });
            }
        });
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => {
            this.drag(e);
        });
        
        document.addEventListener('mouseup', () => {
            this.stopDrag();
        });
    }
    
    startDrag(e, element) {
        e.preventDefault();
        this.isDragging = true;
        this.dragElement = element;
        
        // Get current transform
        const transform = element.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        
        if (match) {
            const currentX = parseFloat(match[1]);
            const currentY = parseFloat(match[2]);
            
            // Calculate offset from mouse to element origin
            const rect = element.getBoundingClientRect();
            const svg = document.getElementById('network-svg');
            const svgRect = svg.getBoundingClientRect();
            
            // Convert mouse coordinates to SVG coordinates
                    const svgX = ((e.clientX - svgRect.left) / svgRect.width) * 1400;
        const svgY = ((e.clientY - svgRect.top) / svgRect.height) * 300;
            
            this.dragOffset.x = svgX - currentX;
            this.dragOffset.y = svgY - currentY;
        }
        
        // Add visual feedback
        element.classList.add('dragging');
        this.addLog(`Started dragging ${element.id.replace('-', ' ')}`, 'info');
    }
    
    drag(e) {
        if (!this.isDragging || !this.dragElement) return;
        
        e.preventDefault();
        
        // Get SVG coordinates
        const svg = document.getElementById('network-svg');
        const rect = svg.getBoundingClientRect();
        
        const svgX = ((e.clientX - rect.left) / rect.width) * 1400;
        const svgY = ((e.clientY - rect.top) / rect.height) * 300;
        
        // Calculate new position
        const newX = Math.max(0, Math.min(1300, svgX - this.dragOffset.x));
        const newY = Math.max(0, Math.min(250, svgY - this.dragOffset.y));
        
        // Update transform
        this.dragElement.setAttribute('transform', `translate(${newX}, ${newY})`);
        
        // Update connections if it's a device
        this.updateConnectionsForDevice(this.dragElement.id, newX, newY);
    }
    
    stopDrag() {
        if (this.isDragging && this.dragElement) {
            // Remove visual feedback
            this.dragElement.classList.remove('dragging');
            
            // Save new position
            const transform = this.dragElement.getAttribute('transform');
            this.addLog(`Moved ${this.dragElement.id.replace('-', ' ')} - position saved`, 'success');
            
            // Save positions to localStorage
            this.saveComponentPositions();
            
            // Add small delay before resetting drag state to prevent accidental clicks
            setTimeout(() => {
                this.isDragging = false;
                this.dragElement = null;
            }, 100);
        }
    }
    
    updateConnectionsForDevice(deviceId, x, y) {
        // Update connection lines when devices are moved
        if (deviceId === 'raspberry-pi') {
            const connection = document.getElementById('connection-attacker');
            const rpiImage = document.getElementById('rpi-main-image');
            if (connection && rpiImage) {
                const width = parseInt(rpiImage.getAttribute('width'));
                const height = parseInt(rpiImage.getAttribute('height'));
                connection.setAttribute('x1', x + width); // Connect from right edge of image
                connection.setAttribute('y1', y + height / 2);  // Connect from middle of image
            }
        }
        
        if (deviceId === 'network-switch') {
            // Update all connections from the switch
            const switchImage = document.getElementById('switch-main-image');
            if (switchImage) {
                const width = parseInt(switchImage.getAttribute('width'));
                const height = parseInt(switchImage.getAttribute('height'));
                
                // Update attacker connection (incoming)
                const attackerConnection = document.getElementById('connection-attacker');
                if (attackerConnection) {
                    attackerConnection.setAttribute('x2', x);
                    attackerConnection.setAttribute('y2', y + height / 2);
                }
                
                // Update device connections (outgoing)
                for (let i = 1; i <= 4; i++) {
                    const deviceConnection = document.getElementById(`connection-device-${i}`);
                    if (deviceConnection) {
                        deviceConnection.setAttribute('x1', x + width);
                        deviceConnection.setAttribute('y1', y + height / 2 - 20 + (i * 10)); // Spread out connection points
                    }
                }
            }
        }
        
        if (deviceId.startsWith('device-')) {
            const deviceNum = deviceId.split('-')[1];
            const connection = document.getElementById(`connection-device-${deviceNum}`);
            const deviceImage = document.getElementById(`device${deviceNum}-main-image`);
            if (connection && deviceImage) {
                const height = parseInt(deviceImage.getAttribute('height'));
                connection.setAttribute('x2', x);
                connection.setAttribute('y2', y + height / 2); // Connect to middle of device image
            }
        }
    }
    
    saveComponentPositions() {
        const positions = {};
        const draggableElements = ['raspberry-pi', 'network-switch', 'device-1', 'device-2', 'device-3', 'device-4'];
        
        draggableElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                const transform = element.getAttribute('transform');
                const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                if (match) {
                    positions[elementId] = {
                        x: parseFloat(match[1]),
                        y: parseFloat(match[2])
                    };
                }
            }
        });
        
        // Save to localStorage
        localStorage.setItem('componentPositions', JSON.stringify(positions));
        
        // Also send to server
        fetch('/save-positions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(positions)
        }).catch(error => {
            console.error('Error saving positions to server:', error);
        });
    }
    
    async loadComponentPositions() {
        try {
            const response = await fetch('/load-positions');
            const data = await response.json();
            
            if (data.ok && data.positions && Object.keys(data.positions).length > 0) {
                Object.entries(data.positions).forEach(([elementId, pos]) => {
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
                        this.updateConnectionsForDevice(elementId, pos.x, pos.y);
                    }
                });
                this.addLog('Loaded server-side component positions', 'info');
            } else {
                // Fallback to localStorage
                const saved = localStorage.getItem('componentPositions');
                if (saved) {
                    try {
                        const positions = JSON.parse(saved);
                        Object.entries(positions).forEach(([elementId, pos]) => {
                            const element = document.getElementById(elementId);
                            if (element) {
                                element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
                                this.updateConnectionsForDevice(elementId, pos.x, pos.y);
                            }
                        });
                        this.addLog('Loaded local component positions', 'info');
                    } catch (error) {
                        console.error('Error loading local positions:', error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading server positions:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('componentPositions');
            if (saved) {
                try {
                    const positions = JSON.parse(saved);
                    Object.entries(positions).forEach(([elementId, pos]) => {
                        const element = document.getElementById(elementId);
                        if (element) {
                            element.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
                            this.updateConnectionsForDevice(elementId, pos.x, pos.y);
                        }
                    });
                    this.addLog('Loaded local component positions (fallback)', 'info');
                } catch (error) {
                    console.error('Error loading local positions:', error);
                }
            }
        }
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
    // Make it globally accessible for admin panel integration
    window.networkDiagram = networkDiagram;
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (networkDiagram) {
        networkDiagram.destroy();
    }
});
