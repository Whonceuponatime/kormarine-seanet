#!/bin/bash
# Startup script for Raspberry Pi LED Server

echo "Starting Raspberry Pi LED Server..."

# Check if pigpiod is running
if ! pgrep -x "pigpiod" > /dev/null; then
    echo "Starting pigpiod daemon..."
    sudo systemctl start pigpiod
    sleep 2
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
