#!/bin/bash
# Startup script for Raspberry Pi LED Server

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Raspberry Pi LED Server..."
echo "Project directory: $SCRIPT_DIR"

# Check if pigpiod is installed
if ! command -v pigpiod &> /dev/null; then
    echo "pigpiod not found. Installing from source..."
    
    # Install dependencies
    sudo apt update
    sudo apt install -y gcc make python3-dev unzip wget
    
    # Download and build pigpio
    ORIG_DIR="$PWD"
    cd /tmp
    wget https://github.com/joan2937/pigpio/archive/master.zip -O pigpio.zip
    unzip -o pigpio.zip
    cd pigpio-master
    make
    sudo make install
    
    # Return to original directory
    cd "$ORIG_DIR"
    
    # Clean up
    rm -rf /tmp/pigpio.zip /tmp/pigpio-master
    
    # Verify installation
    if ! command -v pigpiod &> /dev/null; then
        echo "ERROR: Failed to install pigpiod"
        exit 1
    fi
    
    echo "pigpiod installed successfully"
fi

# Check if pigpiod is running
if ! pgrep -x "pigpiod" > /dev/null; then
    echo "Starting pigpiod daemon..."
    
    # Try to start via systemd first
    if systemctl list-unit-files | grep -q "pigpiod.service"; then
        sudo systemctl start pigpiod
    else
        # If systemd service doesn't exist, start manually
        sudo pigpiod
    fi
    
    # Wait for daemon to start
    sleep 2
    
    # Verify it's running
    if ! pgrep -x "pigpiod" > /dev/null; then
        echo "ERROR: Failed to start pigpiod daemon"
        echo "Try running manually: sudo pigpiod"
        exit 1
    fi
    
    echo "pigpiod daemon started successfully"
else
    echo "pigpiod daemon is already running"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed in venv
if ! python -c "import flask, pigpio, psutil, netifaces" 2>/dev/null; then
    echo "Installing Python dependencies in virtual environment..."
    pip install -r requirements.txt
fi

# Start the server with virtual environment
echo "Starting LED server..."
python app.py
