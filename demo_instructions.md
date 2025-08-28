# SNMP Attack Demonstration Instructions

## Setup for Demonstration

### 1. Raspberry Pi Setup
```bash
# On your Raspberry Pi, pull the latest code
git pull origin main

# Make sure pigpiod is running
sudo systemctl enable --now pigpiod

# Start the server
python app.py
```

### 2. Target Switch Configuration
Configure your target switch with:
- SNMP v1 or v2c enabled
- Community string "public" (read access)
- Community string "private" (write access)
- Default settings for demonstration purposes

### 3. Network Setup
- Ensure Raspberry Pi and target switch are on the same network
- Note the target switch IP address (e.g., 192.168.1.100)

## Demonstration Flow

### Step 1: Access the Web Interface
1. Open browser to `http://<raspberry-pi-ip>:5050`
2. You'll see the modern interactive interface with LED status display
3. The LED grid shows real-time status of all 7 LEDs

### Step 2: Configure Target
1. Enter the target switch IP address (e.g., 192.168.1.100)
2. Select "Public" community for read operations
3. The interface will default to appropriate community strings for each operation

### Step 3: Discovery Phase
1. Click **"SNMP Walk"** - This will:
   - Execute an SNMP walk to discover interfaces
   - Show LED animation representing the packet flow
   - Display results in the command output console

2. Click **"Get Interfaces"** - This will:
   - Query all network interfaces on the target
   - Parse and display interface names and status
   - Create interactive buttons for each discovered port

### Step 4: Attack Demonstration
1. **Port Selection**: The interface will show discovered ports like:
   - FastEthernet0/1 (Index: 1) - Admin: UP | Oper: UP
   - FastEthernet0/2 (Index: 2) - Admin: UP | Oper: DOWN
   - etc.

2. **Execute Attack**: Click **"Set Down"** on any active port:
   - LED sequence will show the attack in progress (LEDs 1-2-3-4-5-6-7)
   - SNMP SET command executed with private community
   - Port status updated in real-time
   - Command output shows the actual SNMP commands executed

3. **Restore Service**: Click **"Set Up"** to restore the port:
   - LED sequence runs in reverse (LEDs 7-6-5-4-3-2-1)
   - Port is restored to operational status

### Step 5: Visual LED Feedback
Throughout the demonstration, observe:
- **LED 1-7**: Sequence animations during SNMP operations
- **Real-time Updates**: LED status updates via WebSocket connection
- **Color Coding**: Success (green flash) vs. Error (red flash) visual feedback

## Key Features to Highlight

### 1. Educational Value
- Shows actual SNMP commands being executed
- Real-time visual representation of network attacks
- Clear separation between discovery and attack phases

### 2. Security Implications
- Demonstrates how default SNMP community strings pose risks
- Shows the ease of network disruption via SNMP
- Highlights the importance of proper SNMP security

### 3. Visual Learning
- LED sequences represent packet flow and attack progression
- Real-time status updates show immediate impact
- Command console provides transparency of executed operations

### 4. Interactive Control
- Point-and-click interface for selecting target ports
- No need for command-line knowledge
- Immediate visual feedback for all operations

## Troubleshooting

### No Interfaces Found
- Verify target IP is reachable
- Check SNMP community strings are correct
- Ensure SNMP is enabled on target device

### SNMP Operations Fail
- Switch to "Private" community for write operations
- Verify write access is enabled on target
- Check network connectivity

### LEDs Not Working
- Verify pigpiod service is running: `sudo systemctl status pigpiod`
- Check GPIO connections
- Use LED control panel to test individual LEDs

## Safety Notes

⚠️ **IMPORTANT REMINDERS**
- Only use on your own lab equipment or with explicit permission
- This is for educational demonstration purposes only
- Always restore port status after demonstration
- Ensure audience understands the security implications
- Use isolated network environment for demonstrations

## Advanced Features

### Manual LED Control
- Use the LED Control Panel to trigger animations manually
- Demo packet animation shows typical packet flow
- Chaser animation for continuous visual effect

### Real-time Monitoring
- Live LED status updates via Server-Sent Events
- Command output console for transparency
- Visual feedback for all operations

This demonstration effectively shows how network security vulnerabilities can be exploited while providing clear visual feedback through the LED system, making it perfect for educational presentations and security awareness training.
