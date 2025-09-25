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
        
        # Visual feedback - flash green LED for success
        if code == 0:
            self.gpio._set(PIN_Y, Y_ACTIVE_LOW, True)
            time.sleep(0.2)
            self.gpio._set(PIN_Y, Y_ACTIVE_LOW, False)
            # Start wave animation
            threading.Thread(target=self.gpio.wave_once, kwargs={"step_period": 0.16}, daemon=True).start()
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
            # Success animation - 1→15 pattern for port down
            def port_down_animation():
                # Pattern: 1→2→3→4→5→6→7→8→9→10→11→12→13→14→15 (all GPIO pins)
                seq = [
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 17 (1)
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),  # 27 (2)
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),  # 22 (3)
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),  # 10 (4)
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),  # 9  (5)
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),  # 5  (6)
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),  # 6  (7)
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),  # 26 (8)
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),  # 16 (9)
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),  # 14 (10)
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),  # 18 (11)
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),  # 23 (12)
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),  # 24 (13)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),  # 25 (14)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),   # 20 (15)
                ]
                for i, st in enumerate(seq):
                    self.gpio._apply_states(*st)
                    time.sleep(0.12)  # Slightly faster for better flow
                    # Send SNMP command when last LED lights up
                    if i == len(seq) - 1:
                        time.sleep(0.1)  # Brief pause to show last LED
                        # The SNMP command was already sent before this animation
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
            # Success animation - 15→1 pattern for port up
            def port_up_animation():
                # Pattern: 15→14→13→12→11→10→9→8→7→6→5→4→3→2→1 (reverse order)
                seq = [
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),   # 20 (15)
                    (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),  # 25 (14)
                    (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),  # 24 (13)
                    (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),  # 23 (12)
                    (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),  # 18 (11)
                    (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),  # 14 (10)
                    (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),  # 16 (9)
                    (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),  # 26 (8)
                    (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),  # 6  (7)
                    (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),  # 5  (6)
                    (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),  # 9  (5)
                    (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),  # 10 (4)
                    (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),  # 22 (3)
                    (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),  # 27 (2)
                    (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 17 (1)
                ]
                for i, st in enumerate(seq):
                    self.gpio._apply_states(*st)
                    time.sleep(0.12)  # Slightly faster for better flow
                    # Send SNMP command when last LED lights up
                    if i == len(seq) - 1:
                        time.sleep(0.1)  # Brief pause to show last LED
                        # The SNMP command was already sent before this animation
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
            # Visual feedback - flash blue LED
            self.gpio._set(PIN_A, A_ACTIVE_LOW, True)
            time.sleep(0.2)
            self.gpio._set(PIN_A, A_ACTIVE_LOW, False)
        
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
            
            # LED animation for packet crafting (no pause)
            print(f"DEBUG: Turning ON RED LED (PIN_R={PIN_R}) for crafting")
            self.gpio._set(PIN_R, R_ACTIVE_LOW, True)  # Red LED for crafting
            
            if protocol == 'tcp':
                result = self._send_tcp_packet(source_ip, source_port, target_ip, target_port, payload, source_mac, target_mac)
            elif protocol == 'udp':
                result = self._send_udp_packet(source_ip, source_port, target_ip, target_port, payload, source_mac, target_mac)
            else:
                return {"ok": False, "error": f"Unsupported protocol: {protocol}"}
            
            # Success animation
            if result["ok"]:
                # Yellow LED for success (using PIN_Y)
                print(f"DEBUG: Turning OFF RED LED (PIN_R={PIN_R})")
                self.gpio._set(PIN_R, R_ACTIVE_LOW, False)
                print(f"DEBUG: Turning ON YELLOW LED (PIN_Y={PIN_Y}) for success")
                self.gpio._set(PIN_Y, Y_ACTIVE_LOW, True)
                time.sleep(0.5)  # Slower timing for success indication
                print(f"DEBUG: Turning OFF YELLOW LED (PIN_Y={PIN_Y})")
                self.gpio._set(PIN_Y, Y_ACTIVE_LOW, False)
                # Start wave animation
                threading.Thread(target=self.gpio.wave_once, kwargs={"step_period": 0.16}, daemon=True).start()
            else:
                # Error animation
                self.gpio._set(PIN_R, R_ACTIVE_LOW, False)
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
            
            # LED animation for raw packet
            self.gpio._set(PIN_B, B_ACTIVE_LOW, True)  # Blue LED for raw packet
            time.sleep(0.3)  # Slower timing for malicious packet builder
            
            # Send raw packet via UDP
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(raw_bytes, (target_ip, target_port))
            sock.close()
            
            # Success animation
            self.gpio._set(PIN_B, B_ACTIVE_LOW, False)
            self.gpio._set(PIN_Y, Y_ACTIVE_LOW, True)
            time.sleep(0.5)  # Slower timing for success indication
            self.gpio._set(PIN_Y, Y_ACTIVE_LOW, False)
            threading.Thread(target=self.gpio.wave_once, kwargs={"step_period": 0.16}, daemon=True).start()
            
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
            
            # LED animation for EICAR test
            self.gpio._set(PIN_Y, Y_ACTIVE_LOW, True)  # Yellow LED for EICAR
            time.sleep(0.3)  # Slower timing for malicious packet builder
            
            if protocol == 'tcp':
                result = self._send_tcp_packet('', 12345, target_ip, target_port, eicar_string)
            else:
                result = self._send_udp_packet('', 12345, target_ip, target_port, eicar_string)
            
            # Success animation with special EICAR pattern
            if result["ok"]:
                self.gpio._set(PIN_Y, Y_ACTIVE_LOW, False)
                # Special EICAR LED pattern (all LEDs flash twice)
                def eicar_animation():
                    for _ in range(2):
                        self.gpio._apply_states(True, True, True, True, True, True, True)
                        time.sleep(0.3)  # Slower flash timing
                        self.gpio._off_all()
                        time.sleep(0.3)  # Slower flash timing
                
                threading.Thread(target=eicar_animation, daemon=True).start()
            else:
                self.gpio._set(PIN_Y, Y_ACTIVE_LOW, False)
                self.gpio.strobe_error()
            
            result["eicar_payload"] = eicar_string
            return result
            
        except Exception as e:
            self.gpio.strobe_error()
            return {"ok": False, "error": f"EICAR packet send failed: {str(e)}"}
