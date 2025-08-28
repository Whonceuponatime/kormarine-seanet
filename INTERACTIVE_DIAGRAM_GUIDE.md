# Interactive Network Diagram Guide

## Overview

The interactive network diagram provides a visual representation of your SNMP attack demonstration, similar to your existing draw.io diagrams but with real-time interactivity and animations.

## Features

### 🎯 **Visual Network Topology**
- **Raspberry Pi (Attacker)**: Purple device with 7 LED indicators showing real-time GPIO status
- **Network Switch (Target)**: Blue switch showing IP address and SNMP status
- **Connected Devices**: Green devices (workstation, printer, IoT device, IP camera) with port connections
- **Network Cloud**: Represents internet/network connectivity

### 🔍 **Interactive Discovery**
1. **Target Configuration**: Enter target switch IP address
2. **Network Discovery**: Click "Discover Network" to scan for interfaces
3. **Real-time SNMP**: Executes actual SNMP walks and interface queries
4. **Port Visualization**: Discovered ports appear as clickable elements

### ⚔️ **Attack Visualization**
- **Clickable Ports**: Each discovered port has "Attack" and "Restore" buttons
- **Animated Packets**: SNMP packets animate from attacker to switch to target device
- **LED Sequences**: Physical LEDs mirror the attack progression (1→2→3→4→5→6→7)
- **Status Updates**: Device connections change color based on port status

### 📊 **Real-time Feedback**
- **LED Monitoring**: Live GPIO status via Server-Sent Events
- **Attack Log**: Real-time console showing all commands and results
- **Visual Indicators**: Color-coded success/error states
- **Connection Status**: Dynamic line styles showing up/down states

## How to Access

1. **Start your server**: `python app.py`
2. **Navigate to diagram**: `http://<pi-ip>:5050/diagram`
3. **Or use navigation**: Click "Interactive Diagram" from main interface

## Usage Flow

### Step 1: Network Discovery
```
1. Enter target IP (e.g., 192.168.1.100)
2. Click "Discover Network"
3. Watch animated packets flow from Pi to Switch
4. See discovered ports populate in control panel
```

### Step 2: Attack Demonstration
```
1. Select a target port from discovered interfaces
2. Click "Attack" button for chosen port
3. Watch:
   - Animated attack packet flow
   - LED sequence 1→2→3→4→5→6→7
   - Device connection turn red
   - Log entries showing SNMP commands
```

### Step 3: Service Restoration
```
1. Click "Restore" button for attacked port
2. Watch:
   - Reverse LED sequence 7→6→5→4→3→2→1
   - Device connection return to green
   - Port status update to UP
```

## Visual Elements Explained

### Network Components
- **Raspberry Pi**: Shows your attacking device with real-time LED status
- **Switch**: Central hub with activity indicators and power status
- **Target Devices**: Represent network endpoints that can be affected
- **Connections**: Dynamic lines showing network connectivity and status

### Animation Types
- **Discovery Packets**: Blue/purple packets for SNMP walks and queries
- **Attack Packets**: Red pulsing packets for port manipulation
- **LED Sequences**: Physical LED mirroring on both actual hardware and diagram

### Status Indicators
- **Green Connections**: Port is up and functioning
- **Red Connections**: Port is down (attacked)
- **Pulsing Elements**: Active attack in progress
- **Activity LEDs**: Switch activity and power indicators

## Integration with Physical Hardware

The diagram synchronizes with your physical setup:

1. **Real GPIO Control**: Diagram LEDs mirror actual LED hardware
2. **Actual SNMP Commands**: All operations execute real network commands
3. **Live Status Updates**: Real-time monitoring via WebSocket connection
4. **Hardware Feedback**: Physical LEDs provide tangible demonstration

## Demonstration Benefits

### For Your Audience
- **Visual Understanding**: Clear topology representation
- **Interactive Engagement**: Click-to-attack interface
- **Real-time Feedback**: Immediate visual and physical responses
- **Educational Value**: Shows actual network security concepts

### For Your Presentation
- **Professional Appearance**: Modern, clean interface design
- **Easy Operation**: Point-and-click demonstrations
- **Flexible Scenarios**: Attack any discovered port
- **Clear Progression**: Step-by-step visual workflow

## Technical Details

### SVG-Based Graphics
- Scalable vector graphics for crisp display
- CSS animations for smooth transitions
- Responsive design for different screen sizes

### Real-time Communication
- Server-Sent Events for LED status updates
- AJAX calls for SNMP operations
- WebSocket-style live monitoring

### Integration Points
- Uses existing SNMP API endpoints
- Leverages current GPIO controller
- Maintains compatibility with original interface

## Comparison to Static Diagrams

| Feature | Static Draw.io | Interactive Diagram |
|---------|---------------|-------------------|
| Visual Appeal | ✅ Professional | ✅ Professional + Animated |
| Interactivity | ❌ None | ✅ Full Click-to-Attack |
| Real-time Updates | ❌ Static | ✅ Live LED/Status Updates |
| SNMP Integration | ❌ Illustration Only | ✅ Actual Commands |
| Audience Engagement | ⚡ Visual Only | ✅ Interactive Demonstration |
| Hardware Sync | ❌ No Connection | ✅ Real GPIO Control |

## Best Practices for Demonstration

1. **Pre-configure**: Set target IP before audience arrives
2. **Test Connection**: Run discovery to ensure network connectivity
3. **Explain Components**: Walk through diagram elements first
4. **Show Progression**: Demonstrate discovery → attack → restore cycle
5. **Highlight Hardware**: Point out physical LEDs during attacks
6. **Use Log Output**: Show actual SNMP commands being executed

This interactive diagram transforms your static network illustration into a dynamic, engaging demonstration tool that combines visual learning with hands-on interaction and real hardware feedback.
