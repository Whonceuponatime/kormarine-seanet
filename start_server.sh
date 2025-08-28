#!/bin/bash
# Startup script for Raspberry Pi LED Server

echo "Starting Raspberry Pi LED Server..."

# Check if pigpiod is running
if ! pgrep -x "pigpiod" > /dev/null; then
    echo "Starting pigpiod daemon..."
    sudo systemctl start pigpiod
    sleep 2
fi

# Check if Python dependencies are installed
if ! python3 -c "import flask, pigpio" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements.txt
fi

# Start the server
echo "Starting LED server..."
python3 app.py
