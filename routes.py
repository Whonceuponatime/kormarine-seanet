#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Routes for Raspberry Pi LED Server
Handles all Flask routes and API endpoints
"""

import json
import time
import threading
import os
from flask import Flask, jsonify, request, Response, render_template, send_from_directory
from config import *


class Routes:
    def __init__(self, gpio_controller, command_executor):
        """Initialize routes with GPIO controller and command executor"""
        self.gpio = gpio_controller
        self.cmd = command_executor
        # Create Flask app with proper template and static folder paths
        template_dir = os.path.join(os.path.dirname(__file__), 'templates')
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        self.app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
        self._register_routes()
    
    def _register_routes(self):
        """Register all Flask routes"""
        
        # Basic control routes
        @self.app.get("/start")
        def start():
            try:
                hz = float(request.args.get("hz", str(DEFAULT_WAVE_SPEED)))
                step_period = 1.0 / max(0.1, hz)
            except:
                hz = DEFAULT_WAVE_SPEED
                step_period = 1.0
            started = self.gpio.start_chaser(step_period)
            return jsonify(ok=started, anim="7-step wave", hz=hz)
        
        @self.app.get("/stop")
        def stop():
            self.gpio.stop_anim()
            return jsonify(ok=True, stopped=True)
        
        @self.app.get("/off")
        def off():
            self.gpio.stop_anim()
            self.gpio._off_all()
            return jsonify(ok=True)
        
        # Manual pin control routes
        @self.app.get("/on17")
        def on17():
            success = self.gpio.turn_on_pin('17')
            return jsonify(ok=success)
        
        @self.app.get("/on27")
        def on27():
            success = self.gpio.turn_on_pin('27')
            return jsonify(ok=success)
        
        @self.app.get("/on22")
        def on22():
            success = self.gpio.turn_on_pin('22')
            return jsonify(ok=success)
        
        @self.app.get("/on10")
        def on10():
            success = self.gpio.turn_on_pin('10')
            return jsonify(ok=success)
        
        @self.app.get("/on9")
        def on9():
            success = self.gpio.turn_on_pin('9')
            return jsonify(ok=success)
        
        @self.app.get("/on5")
        def on5():
            success = self.gpio.turn_on_pin('5')
            return jsonify(ok=success)
        
        @self.app.get("/on6")
        def on6():
            success = self.gpio.turn_on_pin('6')
            return jsonify(ok=success)
        
        # Status routes
        @self.app.get("/events")
        def events():
            def gen():
                while True:
                    data = json.dumps(self.gpio.get_status())
                    yield f"data: {data}\n\n"
                    time.sleep(1.0)
            return Response(gen(), mimetype="text/event-stream")
        
        @self.app.get("/status")
        def status():
            return jsonify(ok=True, **self.gpio.get_status())
        
        # Demo routes
        @self.app.post("/demo/packet")
        def demo_packet():
            threading.Thread(
                target=self.gpio.wave_once, 
                kwargs={"step_period": DEFAULT_STEP_PERIOD}, 
                daemon=True
            ).start()
            return jsonify(ok=True)
        

        
        # SNMP routes
        @self.app.get("/snmp/walk")
        def snmp_walk():
            target = request.args.get("target", "").strip()
            community = request.args.get("community", "public").strip()
            
            result = self.cmd.snmp_walk(target, community)
            if not result["ok"] and "error" in result:
                return jsonify(**result), 400
            return jsonify(**result)
        
        @self.app.get("/snmp/portdown")
        def snmp_portdown():
            target = request.args.get("target", "").strip()
            community = request.args.get("community", "private").strip()
            ifindex = request.args.get("ifindex", "").strip()
            
            result = self.cmd.snmp_portdown(target, ifindex, community)
            if not result["ok"] and "error" in result:
                return jsonify(**result), 400
            return jsonify(**result)
        
        @self.app.get("/snmp/portup")
        def snmp_portup():
            target = request.args.get("target", "").strip()
            community = request.args.get("community", "private").strip()
            ifindex = request.args.get("ifindex", "").strip()
            
            result = self.cmd.snmp_portup(target, ifindex, community)
            if not result["ok"] and "error" in result:
                return jsonify(**result), 400
            return jsonify(**result)
        
        @self.app.get("/snmp/interfaces")
        def snmp_interfaces():
            target = request.args.get("target", "").strip()
            community = request.args.get("community", "public").strip()
            
            result = self.cmd.snmp_get_interfaces(target, community)
            if not result["ok"] and "error" in result:
                return jsonify(**result), 400
            return jsonify(**result)
        
        # Main page route
        @self.app.get("/")
        def index():
            return render_template('index.html')
        
        # Additional CORS headers for development
        @self.app.after_request
        def after_request(response):
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            return response
    
    def get_app(self):
        """Get the Flask app instance"""
        return self.app
