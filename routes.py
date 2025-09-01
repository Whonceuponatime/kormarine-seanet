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
import shutil
from werkzeug.utils import secure_filename
from flask import Flask, jsonify, request, Response, render_template, send_from_directory, redirect
from config import *

# Image upload configuration
UPLOAD_FOLDER = 'uploads'
STATIC_IMAGES_FOLDER = 'static/images'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


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
        
        @self.app.get("/snmp/portstatus")
        def snmp_portstatus():
            target = request.args.get("target", "").strip()
            community = request.args.get("community", "public").strip()
            ifindex = request.args.get("ifindex", "").strip()
            
            result = self.cmd.snmp_get_port_status(target, ifindex, community)
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
        
        # Main page route - Interactive Network Diagram
        @self.app.get("/")
        def index():
            return render_template('network_diagram.html')
        
        # Keep diagram route for backward compatibility
        @self.app.get("/diagram")
        def network_diagram():
            return render_template('network_diagram.html')
        
        # Settings page route
        @self.app.get("/settings")
        def settings():
            return render_template('settings.html')
        
        # Admin panel route
        @self.app.get("/admin")
        def admin():
            return render_template('admin.html')
        
        # Image upload route
        @self.app.post("/upload-image")
        def upload_image():
            try:
                # Ensure directories exist
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                os.makedirs(STATIC_IMAGES_FOLDER, exist_ok=True)
                
                if 'file' not in request.files:
                    return jsonify({"ok": False, "error": "No file provided"}), 400
                
                file = request.files['file']
                component = request.form.get('component', '')
                
                if file.filename == '':
                    return jsonify({"ok": False, "error": "No file selected"}), 400
                
                if not allowed_file(file.filename):
                    return jsonify({"ok": False, "error": "Invalid file type. Use PNG, JPG, JPEG, GIF, or SVG"}), 400
                
                if file and allowed_file(file.filename):
                    # Create secure filename
                    filename = secure_filename(file.filename)
                    timestamp = str(int(time.time()))
                    filename = f"{component}_{timestamp}_{filename}"
                    
                    # Save to uploads folder
                    upload_path = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(upload_path)
                    
                    # Copy to static/images for serving
                    static_path = os.path.join(STATIC_IMAGES_FOLDER, filename)
                    shutil.copy2(upload_path, static_path)
                    
                    # Return the URL path for the image
                    image_url = f"/static/images/{filename}"
                    
                    return jsonify({
                        "ok": True, 
                        "filename": filename,
                        "url": image_url,
                        "component": component
                    })
                
                return jsonify({"ok": False, "error": "Upload failed"}), 500
                
            except Exception as e:
                print(f"Upload error: {e}")
                return jsonify({"ok": False, "error": f"Server error: {str(e)}"}), 500
        
        # Delete image route
        @self.app.delete("/delete-image/<filename>")
        def delete_image(filename):
            try:
                # Remove from both locations
                upload_path = os.path.join(UPLOAD_FOLDER, filename)
                static_path = os.path.join(STATIC_IMAGES_FOLDER, filename)
                
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                if os.path.exists(static_path):
                    os.remove(static_path)
                
                return jsonify({"ok": True, "message": "Image deleted successfully"})
            except Exception as e:
                print(f"Delete error: {e}")
                return jsonify({"ok": False, "error": str(e)}), 500
        
        # Save component positions route
        @self.app.post("/save-positions")
        def save_positions():
            try:
                positions = request.get_json()
                if not positions:
                    return jsonify({"ok": False, "error": "No position data provided"}), 400
                
                # Save positions to a file
                positions_file = os.path.join(os.path.dirname(__file__), 'component_positions.json')
                with open(positions_file, 'w') as f:
                    json.dump(positions, f, indent=2)
                
                return jsonify({"ok": True, "message": "Positions saved successfully"})
            except Exception as e:
                print(f"Save positions error: {e}")
                return jsonify({"ok": False, "error": str(e)}), 500
        
        # Load component positions route
        @self.app.get("/load-positions")
        def load_positions():
            try:
                positions_file = os.path.join(os.path.dirname(__file__), 'component_positions.json')
                if os.path.exists(positions_file):
                    with open(positions_file, 'r') as f:
                        positions = json.load(f)
                    return jsonify({"ok": True, "positions": positions})
                else:
                    return jsonify({"ok": True, "positions": {}})
            except Exception as e:
                print(f"Load positions error: {e}")
                return jsonify({"ok": False, "error": str(e)}), 500
        
        # Save configuration route
        @self.app.post("/save-config")
        def save_config():
            try:
                config = request.get_json()
                if not config:
                    return jsonify({"ok": False, "error": "No configuration data provided"}), 400
                
                # Save configuration to a file
                config_file = os.path.join(os.path.dirname(__file__), 'app_config.json')
                with open(config_file, 'w') as f:
                    json.dump(config, f, indent=2)
                
                return jsonify({"ok": True, "message": "Configuration saved successfully"})
            except Exception as e:
                print(f"Save config error: {e}")
                return jsonify({"ok": False, "error": str(e)}), 500
        
        # Load configuration route
        @self.app.get("/load-config")
        def load_config():
            try:
                config_file = os.path.join(os.path.dirname(__file__), 'app_config.json')
                if os.path.exists(config_file):
                    with open(config_file, 'r') as f:
                        config = json.load(f)
                    return jsonify({"ok": True, "config": config})
                else:
                    return jsonify({"ok": True, "config": {}})
            except Exception as e:
                print(f"Load config error: {e}")
                return jsonify({"ok": False, "error": str(e)}), 500
        
        # List available images route
        @self.app.get("/list-images")
        def list_images():
            try:
                images_dir = os.path.join(os.path.dirname(__file__), 'static', 'images')
                if not os.path.exists(images_dir):
                    return jsonify({"ok": True, "images": []})
                
                images = []
                for filename in os.listdir(images_dir):
                    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg')):
                        images.append({
                            'filename': filename,
                            'url': f'/static/images/{filename}'
                        })
                
                return jsonify({"ok": True, "images": images})
            except Exception as e:
                print(f"List images error: {e}")
                return jsonify({"ok": False, "error": str(e)}), 500
        
        # Debug image serving route
        @self.app.get("/debug-images")
        def debug_images():
            try:
                images_dir = os.path.join(os.path.dirname(__file__), 'static', 'images')
                debug_info = {
                    'images_dir': images_dir,
                    'dir_exists': os.path.exists(images_dir),
                    'files': []
                }
                
                if os.path.exists(images_dir):
                    for filename in os.listdir(images_dir):
                        file_path = os.path.join(images_dir, filename)
                        debug_info['files'].append({
                            'filename': filename,
                            'exists': os.path.exists(file_path),
                            'size': os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                            'url': f'/static/images/{filename}'
                        })
                
                return jsonify({"ok": True, "debug": debug_info})
            except Exception as e:
                return jsonify({"ok": False, "error": str(e)}), 500
        
        # Serve images from static/images directory
        @self.app.route('/static/images/<path:filename>')
        def serve_image(filename):
            try:
                images_dir = os.path.join(os.path.dirname(__file__), 'static', 'images')
                if os.path.exists(os.path.join(images_dir, filename)):
                    return send_from_directory(images_dir, filename)
                else:
                    # Redirect to placeholder if image not found
                    component_type = filename.split('-')[0] if '-' in filename else filename.split('_')[0] if '_' in filename else 'device'
                    return redirect(f'/placeholder/{component_type}')
            except Exception as e:
                print(f"Image serving error: {e}")
                component_type = filename.split('-')[0] if '-' in filename else 'device'
                return redirect(f'/placeholder/{component_type}')
        
        # Generate placeholder SVG for missing images
        @self.app.route('/placeholder/<component_type>')
        def generate_placeholder_svg(component_type):
            icons = {
                'rpi': '🍓',
                'raspberry': '🍓', 
                'switch': '🔀',
                'device1': '🖥️',
                'workstation': '🖥️',
                'device2': '🖨️',
                'printer': '🖨️',
                'device3': '📱',
                'iot': '📱',
                'device4': '📹',
                'camera': '📹'
            }
            
            icon = icons.get(component_type, '📦')
            
            svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="#34495e" rx="8"/>
    <text x="32" y="40" text-anchor="middle" font-size="24" fill="white">{icon}</text>
</svg>'''
            return svg_content, 200, {'Content-Type': 'image/svg+xml'}
        
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
