#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Main application file for Raspberry Pi LED Server
Entry point for the HTTP server with GPIO control
"""

import signal
import sys
from gpio_controller import GPIOController
from command_executor import CommandExecutor
from routes import Routes
from config import HOST, PORT


class LEDServer:
    def __init__(self):
        """Initialize the LED server with all components"""
        try:
            self.gpio = GPIOController()
            self.cmd = CommandExecutor(self.gpio)
            self.routes = Routes(self.gpio, self.cmd)
            self.app = self.routes.get_app()
        except Exception as e:
            print(f"Failed to initialize server: {e}")
            sys.exit(1)
    
    def cleanup(self):
        """Clean up resources before shutdown"""
        print("\nShutting down LED server...")
        if hasattr(self, 'gpio'):
            self.gpio.cleanup()
        print("Cleanup complete.")
    
    def run(self):
        """Run the Flask server"""
        print(f"Starting LED server on {HOST}:{PORT}")
        print("Press Ctrl+C to stop the server")
        
        try:
            self.app.run(host=HOST, port=PORT, debug=False)
        except KeyboardInterrupt:
            print("\nReceived interrupt signal")
        finally:
            self.cleanup()


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    print(f"\nReceived signal {signum}")
    sys.exit(0)


if __name__ == "__main__":
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and run the server
    server = LEDServer()
    server.run()
