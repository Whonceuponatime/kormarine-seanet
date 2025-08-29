# Raspberry Pi LED Server

A modular HTTP server for Raspberry Pi that controls GPIO LEDs and provides network testing capabilities with visual feedback.

## Features

- **GPIO LED Control**: Control 7 LEDs connected to GPIO pins with various animations
- **SNMP Attack Demonstration**: Execute SNMP walks and port manipulation attacks with LED visualization
- **Interactive Web Interface**: Modern, responsive web UI for demonstrating network security concepts
- **Real-time LED Feedback**: Visual representation of SNMP operations through LED sequences
- **Educational Security Tool**: Designed for authorized network security demonstrations
- **Real-time Status**: Server-Sent Events (SSE) for live LED status updates
- **Modular Architecture**: Clean separation of concerns with dedicated modules

## Project Structure

```
├── app.py                 # Main application entry point
├── config.py              # Configuration and GPIO pin definitions
├── gpio_controller.py     # GPIO control and LED animations
├── command_executor.py    # Shell command execution (ping, SNMP)
├── routes.py              # Flask routes and API endpoints
├── templates/
│   ├── network_diagram.html  # Main interactive topology diagram
│   ├── settings.html         # GPIO testing and wave animations
│   └── admin.html            # Component customization and admin panel
├── static/
│   ├── diagram.css        # Comprehensive CSS styling for all pages
│   ├── diagram.js         # Main topology functionality
│   ├── settings.js        # GPIO testing and wave controls
│   └── admin.js           # Admin panel and customization features
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## GPIO Pin Configuration

| Pin | GPIO | Purpose | Active Level |
|-----|------|---------|--------------|
| R   | 17   | RGB Red | Active-LOW   |
| X   | 27   | LED     | Active-HIGH  |
| Y   | 22   | LED     | Active-HIGH  |
| A   | 10   | LED     | Active-HIGH  |
| B   | 9    | LED     | Active-HIGH  |
| C   | 5    | LED     | Active-HIGH  |
| D   | 6    | LED     | Active-HIGH  |

## Installation

### Prerequisites

1. **Raspberry Pi** with GPIO access
2. **Python 3.7+**
3. **pigpiod** daemon running

### Setup

1. **Install pigpiod** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install pigpiod
   sudo systemctl enable --now pigpiod
   ```

2. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd kormarine-seanet
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**:
   ```bash
   python app.py
   ```

The server will start on `http://0.0.0.0:5050`

## Usage

### Multi-Page Interface System

Access the interface at `http://<raspberry-pi-ip>:5050`

The system now includes **three specialized interfaces**:

#### 🎯 **Main Topology** (`/`) 
Interactive network diagram with SNMP attack demonstrations

#### ⚙️ **Settings & Testing** (`/settings`)
GPIO pin testing and wave animation controls

#### 🛡️ **Admin Panel** (`/admin`)
Component customization and configuration management

### Interface Features

#### Target Configuration
- **Target IP**: Set the IP address of the vulnerable switch
- **Community String**: Choose between 'public' (read) and 'private' (write) access

#### Discovery & Reconnaissance
- **SNMP Walk**: Discover available network interfaces with LED animation
- **Get Interfaces**: List all interfaces with their current status (up/down)

#### SNMP Attack Demonstration
- **Port Selection**: Choose specific network ports from discovered interfaces
- **Set Port Down**: Demonstrate SNMP-based port shutdown attacks
- **Set Port Up**: Restore port functionality
- **Visual Feedback**: LED sequence animations show attack progress

#### LED Control Panel
- **Demo Packet**: Trigger packet transmission animation
- **LED Chaser**: Start continuous LED sequence animation
- **Manual Control**: Individual LED control and animation management

#### Real-time Features
- **Live LED Status**: Real-time LED state updates via Server-Sent Events
- **Command Output**: Live console showing executed commands and results
- **Visual Feedback**: Color-coded success/error indicators

#### 🎯 **Visual Network Topology**
- **Animated SVG Diagram**: Professional network topology visualization
- **Real-time LED Sync**: Diagram LEDs mirror physical GPIO status  
- **Device Representations**: Raspberry Pi (attacker), switch (target), connected devices
- **Connection Visualization**: Dynamic network links with status indicators

#### 🔍 **Interactive Discovery & Reconnaissance**
- **SNMP Walk**: Execute SNMP walks with visual packet animations
- **Network Discovery**: Single-click interface scanning with real-time results
- **Port Discovery**: Live interface detection and status display
- **Community String Selection**: Toggle between 'public' (read) and 'private' (write) access

#### ⚔️ **Visual Attack Demonstration**
- **Click-to-Attack**: Select any discovered port for demonstration
- **Packet Animation**: Attack packets flow from Pi → Switch → Target Device
- **LED Choreography**: Physical LEDs show attack progression (1→2→3→4→5→6→7)
- **Restore Functionality**: Reverse LED sequence for service restoration (7→6→5→4→3→2→1)
- **Live Status Updates**: Real-time changes on both diagram and physical hardware

#### 🎛️ **Comprehensive LED Control**
- **Manual LED Control**: Individual LED activation (pins 17, 27, 22, 10, 9, 5, 6)
- **Animation Controls**: Start/stop chaser animations, demo packet sequences
- **Real-time Synchronization**: All LED controls sync with physical hardware
- **Visual Feedback**: LED status indicators throughout the interface

#### 📊 **Enhanced Feedback & Monitoring**
- **Command Output Console**: Real-time SNMP command execution and results
- **Attack Progress Visualization**: Color-coded status indicators and animations
- **Live LED Status**: Header display showing real-time GPIO pin states
- **Professional Presentation**: Clean, modern interface suitable for demonstrations

### API Endpoints

#### Basic Control
- `GET /start?hz=<frequency>` - Start wave animation
- `GET /stop` - Stop animation
- `GET /off` - Turn off all LEDs

#### Individual LED Control
- `GET /on17` - Turn on GPIO 17
- `GET /on27` - Turn on GPIO 27
- `GET /on22` - Turn on GPIO 22
- `GET /on10` - Turn on GPIO 10
- `GET /on9` - Turn on GPIO 9
- `GET /on5` - Turn on GPIO 5
- `GET /on6` - Turn on GPIO 6

#### Status
- `GET /status` - Get current LED states
- `GET /events` - Server-Sent Events stream for real-time updates

#### SNMP Operations
- `GET /snmp/walk?target=<ip>&community=<string>` - SNMP walk with LED feedback
- `GET /snmp/interfaces?target=<ip>&community=<string>` - Get interface list and status
- `GET /snmp/portdown?target=<ip>&ifindex=<number>&community=<string>` - Set port to down
- `GET /snmp/portup?target=<ip>&ifindex=<number>&community=<string>` - Set port to up

#### Demo
- `POST /demo/packet` - Trigger demo packet animation

## Development

### Adding New Features

1. **New GPIO Functions**: Add methods to `gpio_controller.py`
2. **New Commands**: Add methods to `command_executor.py`
3. **New Routes**: Add routes to `routes.py`
4. **Configuration**: Update `config.py` for new settings

### Testing

Test individual components:

```bash
# Test GPIO controller
python -c "from gpio_controller import GPIOController; gpio = GPIOController(); gpio.wave_once()"

# Test command executor
python -c "from gpio_controller import GPIOController; from command_executor import CommandExecutor; cmd = CommandExecutor(GPIOController()); print(cmd.ping_target('8.8.8.8'))"
```

## Troubleshooting

### Common Issues

1. **"pigpiod not running"**
   ```bash
   sudo systemctl enable --now pigpiod
   ```

2. **Permission denied for GPIO**
   ```bash
   sudo usermod -a -G gpio $USER
   # Log out and back in
   ```

3. **Port already in use**
   - Change `PORT` in `config.py`
   - Or kill existing process: `sudo pkill -f app.py`

4. **SNMP commands fail**
   - Install SNMP tools: `sudo apt install snmp`
   - Ensure target device is accessible

### Logs

The server outputs status messages to console. Check for:
- GPIO initialization warnings
- Command execution results
- Error messages

## Security Considerations

⚠️ **IMPORTANT: This tool is designed for educational purposes only**

- **Authorized Use Only**: Only use on networks you own or have explicit permission to test
- **Vulnerable Target Required**: Designed to work with switches configured for SNMP v1/v2c with default community strings
- **No Authentication**: The web interface has no authentication - secure your network accordingly
- **SNMP Plaintext**: Community strings are transmitted in plain text
- **Network Exposure**: Server runs on all interfaces (`0.0.0.0`) by default

### Recommended Lab Setup
- Isolated network environment
- Manageable switch with SNMP v1/v2c enabled
- Default community strings: 'public' (read) and 'private' (write)
- Firewall rules to restrict access to demonstration network only

## Quick Start Demo

1. **Start Server**: `python app.py`
2. **Main Interface**: Navigate to `http://<pi-ip>:5050`
3. **Configure Target**: Enter your switch IP address
4. **Discover Network**: Click "Discover Network" to scan for ports
5. **Attack Demo**: Click "Attack" on any discovered port
6. **Watch LEDs**: Observe the 1→2→3→4→5→6→7 LED sequence during attacks
7. **Restore Service**: Click "Restore" to bring ports back up with reverse LED sequence

### Additional Features

- **Settings Page**: Test individual GPIO pins and control wave animations
- **Admin Panel**: Customize component names, icons, and network topology appearance
- **No LED Status**: Removed header LED display as requested - you can see the physical LEDs directly

## License

[Add your license information here]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
