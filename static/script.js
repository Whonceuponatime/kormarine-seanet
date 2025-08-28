// Global state
let currentCommunity = 'public';
let targetIP = '192.168.1.100';
let interfaces = [];
let eventSource = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventHandlers();
    startLEDStatusUpdates();
    updateTargetIP();
});

// Initialize all event handlers
function initializeEventHandlers() {
    // Target IP input
    document.getElementById('target-ip').addEventListener('input', updateTargetIP);
    
    // Community string buttons
    document.querySelectorAll('.community-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectCommunity(this.dataset.community);
        });
    });
    
    // Discovery buttons
    document.getElementById('snmp-walk-btn').addEventListener('click', performSNMPWalk);
    document.getElementById('get-interfaces-btn').addEventListener('click', getInterfaces);
    
    // LED control buttons
    document.getElementById('demo-packet-btn').addEventListener('click', demoPacket);
    document.getElementById('start-chaser-btn').addEventListener('click', startChaser);
    document.getElementById('stop-animation-btn').addEventListener('click', stopAnimation);
    document.getElementById('all-off-btn').addEventListener('click', allOff);
    
    // Clear output button
    document.getElementById('clear-output').addEventListener('click', clearOutput);
}

// Update target IP
function updateTargetIP() {
    targetIP = document.getElementById('target-ip').value.trim();
}

// Select community string
function selectCommunity(community) {
    currentCommunity = community;
    document.getElementById('community-string').value = community;
    
    // Update button states
    document.querySelectorAll('.community-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-community="${community}"]`).classList.add('active');
}

// Show loading modal
function showLoading() {
    document.getElementById('loading-modal').style.display = 'block';
}

// Hide loading modal
function hideLoading() {
    document.getElementById('loading-modal').style.display = 'none';
}

// Add output to the console
function addOutput(text, type = 'info') {
    const output = document.getElementById('output');
    const timestamp = new Date().toLocaleTimeString();
    
    let prefix = '';
    switch(type) {
        case 'success':
            prefix = '✅ SUCCESS';
            break;
        case 'error':
            prefix = '❌ ERROR';
            break;
        case 'warning':
            prefix = '⚠️ WARNING';
            break;
        case 'command':
            prefix = '💻 COMMAND';
            break;
        default:
            prefix = 'ℹ️ INFO';
    }
    
    const line = `[${timestamp}] ${prefix}: ${text}\n`;
    output.textContent += line;
    output.scrollTop = output.scrollHeight;
}

// Clear output console
function clearOutput() {
    document.getElementById('output').textContent = '';
}

// Flash section for visual feedback
function flashSection(element, type = 'success') {
    element.classList.add(`flash-${type}`);
    setTimeout(() => {
        element.classList.remove(`flash-${type}`);
    }, 500);
}

// Handle API responses
function handleAPIResponse(response, successMessage, errorMessage) {
    if (response.ok) {
        addOutput(successMessage, 'success');
        return true;
    } else {
        addOutput(`${errorMessage}: ${response.error || 'Unknown error'}`, 'error');
        return false;
    }
}

// SNMP Walk
async function performSNMPWalk() {
    if (!targetIP) {
        addOutput('Please enter a target IP address', 'error');
        return;
    }
    
    showLoading();
    addOutput(`Performing SNMP walk on ${targetIP} with community '${currentCommunity}'`, 'command');
    
    try {
        const response = await fetch(`/snmp/walk?target=${encodeURIComponent(targetIP)}&community=${encodeURIComponent(currentCommunity)}`);
        const data = await response.json();
        
        if (data.ok) {
            addOutput('SNMP walk completed successfully', 'success');
            addOutput(`Command: ${data.cmd}`, 'info');
            if (data.stdout) {
                addOutput(`Output:\n${data.stdout}`, 'info');
            }
            flashSection(document.querySelector('.discovery'), 'success');
        } else {
            addOutput(`SNMP walk failed: ${data.error || 'Unknown error'}`, 'error');
            if (data.stderr) {
                addOutput(`Error details: ${data.stderr}`, 'error');
            }
            flashSection(document.querySelector('.discovery'), 'error');
        }
    } catch (error) {
        addOutput(`Network error during SNMP walk: ${error.message}`, 'error');
        flashSection(document.querySelector('.discovery'), 'error');
    }
    
    hideLoading();
}

// Get Interfaces
async function getInterfaces() {
    if (!targetIP) {
        addOutput('Please enter a target IP address', 'error');
        return;
    }
    
    showLoading();
    addOutput(`Discovering interfaces on ${targetIP}`, 'command');
    
    try {
        const response = await fetch(`/snmp/interfaces?target=${encodeURIComponent(targetIP)}&community=${encodeURIComponent(currentCommunity)}`);
        const data = await response.json();
        
        if (data.ok) {
            addOutput('Interface discovery completed successfully', 'success');
            parseAndDisplayInterfaces(data.interfaces);
            flashSection(document.querySelector('.discovery'), 'success');
        } else {
            addOutput(`Interface discovery failed: ${data.error || 'Unknown error'}`, 'error');
            if (data.errors) {
                Object.entries(data.errors).forEach(([key, error]) => {
                    if (error) addOutput(`${key} error: ${error}`, 'error');
                });
            }
            flashSection(document.querySelector('.discovery'), 'error');
        }
    } catch (error) {
        addOutput(`Network error during interface discovery: ${error.message}`, 'error');
        flashSection(document.querySelector('.discovery'), 'error');
    }
    
    hideLoading();
}

// Parse and display interfaces
function parseAndDisplayInterfaces(interfaceData) {
    const interfaceList = document.getElementById('interface-list');
    interfaces = [];
    
    try {
        // Parse interface names
        const names = parseSnmpOutput(interfaceData.names);
        const adminStatus = parseSnmpOutput(interfaceData.admin_status);
        const operStatus = parseSnmpOutput(interfaceData.oper_status);
        
        // Combine the data
        const combinedData = {};
        
        names.forEach(item => {
            const ifIndex = item.oid.split('.').pop();
            combinedData[ifIndex] = { name: item.value, ifIndex: ifIndex };
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
        
        // Convert to array and filter out unwanted interfaces
        interfaces = Object.values(combinedData).filter(iface => 
            iface.name && 
            !iface.name.toLowerCase().includes('loopback') &&
            !iface.name.toLowerCase().includes('null')
        );
        
        addOutput(`Found ${interfaces.length} network interfaces`, 'info');
        
        // Display interfaces
        if (interfaces.length > 0) {
            displayInterfaceButtons();
        } else {
            interfaceList.innerHTML = '<p class="no-interfaces">No network interfaces found</p>';
        }
        
    } catch (error) {
        addOutput(`Error parsing interface data: ${error.message}`, 'error');
        interfaceList.innerHTML = '<p class="no-interfaces">Error parsing interface data</p>';
    }
}

// Parse SNMP output
function parseSnmpOutput(output) {
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

// Display interface buttons
function displayInterfaceButtons() {
    const interfaceList = document.getElementById('interface-list');
    
    let html = '';
    interfaces.forEach(iface => {
        const statusClass = iface.operStatus === 'up' ? 'status-up' : 'status-down';
        const adminClass = iface.adminStatus === 'up' ? 'status-up' : 'status-down';
        
        html += `
            <div class="interface-item">
                <div class="interface-info">
                    <div class="interface-name">${iface.name} (Index: ${iface.ifIndex})</div>
                    <div class="interface-status">
                        Admin: <span class="${adminClass}">${iface.adminStatus.toUpperCase()}</span> | 
                        Oper: <span class="${statusClass}">${iface.operStatus.toUpperCase()}</span>
                    </div>
                </div>
                <div class="interface-actions">
                    <button class="interface-btn attack-btn" onclick="attackPort('${iface.ifIndex}', 'down')">
                        <i class="fas fa-arrow-down"></i> Set Down
                    </button>
                    <button class="interface-btn success-btn" onclick="attackPort('${iface.ifIndex}', 'up')">
                        <i class="fas fa-arrow-up"></i> Set Up
                    </button>
                </div>
            </div>
        `;
    });
    
    interfaceList.innerHTML = html;
}

// Attack port (set up/down)
async function attackPort(ifIndex, action) {
    if (!targetIP) {
        addOutput('Please enter a target IP address', 'error');
        return;
    }
    
    // Use private community for write operations
    const writeCommunity = 'private';
    
    showLoading();
    addOutput(`Setting port ${ifIndex} to ${action.toUpperCase()} on ${targetIP}`, 'command');
    
    try {
        const endpoint = action === 'down' ? 'portdown' : 'portup';
        const response = await fetch(`/snmp/${endpoint}?target=${encodeURIComponent(targetIP)}&ifindex=${encodeURIComponent(ifIndex)}&community=${encodeURIComponent(writeCommunity)}`);
        const data = await response.json();
        
        if (data.ok) {
            addOutput(`Successfully set port ${ifIndex} to ${action.toUpperCase()}`, 'success');
            addOutput(`Set command: ${data.set_cmd}`, 'info');
            if (data.confirm_stdout) {
                addOutput(`Confirmation: ${data.confirm_stdout}`, 'info');
            }
            
            // Update interface status
            const iface = interfaces.find(i => i.ifIndex === ifIndex);
            if (iface) {
                iface.adminStatus = action;
                displayInterfaceButtons();
            }
            
            flashSection(document.querySelector('.attack'), 'success');
        } else {
            addOutput(`Failed to set port ${ifIndex} to ${action.toUpperCase()}: ${data.error || 'Unknown error'}`, 'error');
            if (data.set_stderr) {
                addOutput(`Error details: ${data.set_stderr}`, 'error');
            }
            flashSection(document.querySelector('.attack'), 'error');
        }
    } catch (error) {
        addOutput(`Network error during port ${action}: ${error.message}`, 'error');
        flashSection(document.querySelector('.attack'), 'error');
    }
    
    hideLoading();
}

// LED Control Functions
async function demoPacket() {
    addOutput('Triggering demo packet animation', 'command');
    
    try {
        const response = await fetch('/demo/packet', { method: 'POST' });
        const data = await response.json();
        
        if (data.ok) {
            addOutput('Demo packet animation triggered', 'success');
            flashSection(document.querySelector('.led-control'), 'success');
        } else {
            addOutput('Failed to trigger demo packet animation', 'error');
            flashSection(document.querySelector('.led-control'), 'error');
        }
    } catch (error) {
        addOutput(`Error triggering demo packet: ${error.message}`, 'error');
        flashSection(document.querySelector('.led-control'), 'error');
    }
}

async function startChaser() {
    addOutput('Starting LED chaser animation', 'command');
    
    try {
        const response = await fetch('/start?hz=2');
        const data = await response.json();
        
        if (data.ok) {
            addOutput(`LED chaser started at ${data.hz} Hz`, 'success');
            flashSection(document.querySelector('.led-control'), 'success');
        } else {
            addOutput('Failed to start LED chaser', 'error');
            flashSection(document.querySelector('.led-control'), 'error');
        }
    } catch (error) {
        addOutput(`Error starting LED chaser: ${error.message}`, 'error');
        flashSection(document.querySelector('.led-control'), 'error');
    }
}

async function stopAnimation() {
    addOutput('Stopping LED animations', 'command');
    
    try {
        const response = await fetch('/stop');
        const data = await response.json();
        
        if (data.ok) {
            addOutput('LED animations stopped', 'success');
            flashSection(document.querySelector('.led-control'), 'success');
        } else {
            addOutput('Failed to stop LED animations', 'error');
            flashSection(document.querySelector('.led-control'), 'error');
        }
    } catch (error) {
        addOutput(`Error stopping LED animations: ${error.message}`, 'error');
        flashSection(document.querySelector('.led-control'), 'error');
    }
}

async function allOff() {
    addOutput('Turning off all LEDs', 'command');
    
    try {
        const response = await fetch('/off');
        const data = await response.json();
        
        if (data.ok) {
            addOutput('All LEDs turned off', 'success');
            flashSection(document.querySelector('.led-control'), 'success');
        } else {
            addOutput('Failed to turn off LEDs', 'error');
            flashSection(document.querySelector('.led-control'), 'error');
        }
    } catch (error) {
        addOutput(`Error turning off LEDs: ${error.message}`, 'error');
        flashSection(document.querySelector('.led-control'), 'error');
    }
}

// LED Status Updates via Server-Sent Events
function startLEDStatusUpdates() {
    if (eventSource) {
        eventSource.close();
    }
    
    eventSource = new EventSource('/events');
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            updateLEDStatus(data);
        } catch (error) {
            console.error('Error parsing LED status:', error);
        }
    };
    
    eventSource.onerror = function(event) {
        console.error('LED status connection error:', event);
        // Reconnect after 5 seconds
        setTimeout(() => {
            if (eventSource.readyState === EventSource.CLOSED) {
                startLEDStatusUpdates();
            }
        }, 5000);
    };
}

// Update LED visual status
function updateLEDStatus(status) {
    if (status.pins) {
        Object.entries(status.pins).forEach(([pin, value]) => {
            const ledElement = document.getElementById(`led-${pin}`);
            if (ledElement) {
                const ledLight = ledElement.querySelector('.led-light');
                if (value === 1) {
                    ledLight.classList.add('on');
                } else {
                    ledLight.classList.remove('on');
                }
            }
        });
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (eventSource) {
        eventSource.close();
    }
});

// Error handling for fetch requests
function handleFetchError(error) {
    addOutput(`Network error: ${error.message}`, 'error');
    hideLoading();
}
