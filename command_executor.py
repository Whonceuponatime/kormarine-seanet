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
            # Success animation - 1234567 pattern for port down
            def port_down_animation():
                # Pattern: 1-2-3-4-5-6-7 (GPIO 17, 27, 22, 10, 9, 5, 6)
                seq = [
                    (True,  False, False, False, False, False, False),  # 17 (1)
                    (False, True,  False, False, False, False, False),  # 27 (2)
                    (False, False, True,  False, False, False, False),  # 22 (3)
                    (False, False, False, True,  False, False, False),  # 10 (4)
                    (False, False, False, False, True,  False, False),  # 9  (5)
                    (False, False, False, False, False, True,  False),  # 5  (6)
                    (False, False, False, False, False, False, True),   # 6  (7)
                ]
                for st in seq:
                    self.gpio._apply_states(*st)
                    time.sleep(0.15)
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
            # Success animation - 7654321 pattern for port up
            def port_up_animation():
                # Pattern: 7-6-5-4-3-2-1 (GPIO 6, 5, 9, 10, 22, 27, 17)
                seq = [
                    (False, False, False, False, False, False, True),   # 6  (7)
                    (False, False, False, False, False, True,  False),  # 5  (6)
                    (False, False, False, False, True,  False, False),  # 9  (5)
                    (False, False, False, True,  False, False, False),  # 10 (4)
                    (False, False, True,  False, False, False, False),  # 22 (3)
                    (False, True,  False, False, False, False, False),  # 27 (2)
                    (True,  False, False, False, False, False, False),  # 17 (1)
                ]
                for st in seq:
                    self.gpio._apply_states(*st)
                    time.sleep(0.15)
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
        try:
            # Extract packet parameters
            target_ip = packet_data.get('target_ip', '').strip()
            target_port = int(packet_data.get('target_port', 80))
            protocol = packet_data.get('protocol', 'tcp').lower()
            payload = packet_data.get('payload', '').encode('utf-8')
            source_ip = packet_data.get('source_ip', '')
            source_port = int(packet_data.get('source_port', 12345))
            
            if not target_ip:
                return {"ok": False, "error": "Target IP is required"}
            
            self.gpio.stop_anim()
            self.gpio._off_all()
            
            # LED animation for packet crafting
            self.gpio._set(PIN_R, R_ACTIVE_LOW, True)  # Red LED for crafting
            time.sleep(0.1)
            
            if protocol == 'tcp':
                result = self._send_tcp_packet(source_ip, source_port, target_ip, target_port, payload)
            elif protocol == 'udp':
                result = self._send_udp_packet(source_ip, source_port, target_ip, target_port, payload)
            else:
                return {"ok": False, "error": f"Unsupported protocol: {protocol}"}
            
            # Success animation
            if result["ok"]:
                # Green LED for success (using PIN_Y)
                self.gpio._set(PIN_R, R_ACTIVE_LOW, False)
                self.gpio._set(PIN_Y, Y_ACTIVE_LOW, True)
                time.sleep(0.2)
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
    
    def _send_tcp_packet(self, src_ip, src_port, dst_ip, dst_port, payload):
        """Send a TCP packet with custom payload"""
        try:
            # Create a raw socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_TCP)
            sock.setsockopt(socket.IPPROTO_IP, socket.IP_HDRINCL, 1)
            
            # Create IP header
            ip_header = self._create_ip_header(src_ip or '192.168.1.10', dst_ip, len(payload) + 20)
            
            # Create TCP header
            tcp_header = self._create_tcp_header(src_port, dst_port, payload)
            
            # Combine headers and payload
            packet = ip_header + tcp_header + payload
            
            # Send packet
            sock.sendto(packet, (dst_ip, dst_port))
            sock.close()
            
            return {
                "ok": True,
                "message": f"TCP packet sent to {dst_ip}:{dst_port}",
                "payload_size": len(payload),
                "protocol": "TCP"
            }
            
        except Exception as e:
            return {"ok": False, "error": f"TCP packet send failed: {str(e)}"}
    
    def _send_udp_packet(self, src_ip, src_port, dst_ip, dst_port, payload):
        """Send a UDP packet with custom payload"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            if src_ip:
                sock.bind((src_ip, src_port))
            
            sock.sendto(payload, (dst_ip, dst_port))
            sock.close()
            
            return {
                "ok": True,
                "message": f"UDP packet sent to {dst_ip}:{dst_port}",
                "payload_size": len(payload),
                "protocol": "UDP"
            }
            
        except Exception as e:
            return {"ok": False, "error": f"UDP packet send failed: {str(e)}"}
    
    def _create_ip_header(self, src_ip, dst_ip, payload_len):
        """Create IP header for raw socket"""
        version = 4
        ihl = 5
        type_of_service = 0
        total_length = 20 + payload_len  # IP header + payload
        identification = 54321
        flags = 0
        fragment_offset = 0
        ttl = 64
        protocol = socket.IPPROTO_TCP
        checksum = 0  # Will be calculated by kernel
        source_address = socket.inet_aton(src_ip)
        dest_address = socket.inet_aton(dst_ip)
        
        ver_ihl = (version << 4) + ihl
        flags_frag = (flags << 13) + fragment_offset
        
        ip_header = struct.pack('!BBHHHBBH4s4s',
                               ver_ihl, type_of_service, total_length,
                               identification, flags_frag, ttl, protocol, checksum,
                               source_address, dest_address)
        return ip_header
    
    def _create_tcp_header(self, src_port, dst_port, payload):
        """Create TCP header"""
        sequence = 0
        acknowledgment = 0
        data_offset = 5  # TCP header size
        reserved = 0
        flags = 0x18  # PSH + ACK
        window = socket.htons(5840)
        checksum = 0
        urgent_pointer = 0
        
        offset_res = (data_offset << 4) + reserved
        tcp_header = struct.pack('!HHLLBBHHH',
                                src_port, dst_port, sequence, acknowledgment,
                                offset_res, flags, window, checksum, urgent_pointer)
        return tcp_header
    
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
            time.sleep(0.1)
            
            # Send raw packet via UDP
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.sendto(raw_bytes, (target_ip, target_port))
            sock.close()
            
            # Success animation
            self.gpio._set(PIN_B, B_ACTIVE_LOW, False)
            self.gpio._set(PIN_Y, Y_ACTIVE_LOW, True)
            time.sleep(0.2)
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
            time.sleep(0.1)
            
            if protocol == 'tcp':
                result = self._send_tcp_packet('', 12345, target_ip, target_port, eicar_string.encode('utf-8'))
            else:
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.sendto(eicar_string.encode('utf-8'), (target_ip, target_port))
                sock.close()
                result = {
                    "ok": True,
                    "message": f"EICAR test packet sent to {target_ip}:{target_port}",
                    "payload_size": len(eicar_string),
                    "protocol": protocol.upper()
                }
            
            # Success animation with special EICAR pattern
            if result["ok"]:
                self.gpio._set(PIN_Y, Y_ACTIVE_LOW, False)
                # Special EICAR LED pattern (all LEDs flash twice)
                def eicar_animation():
                    for _ in range(2):
                        self.gpio._apply_states(True, True, True, True, True, True, True)
                        time.sleep(0.1)
                        self.gpio._off_all()
                        time.sleep(0.1)
                
                threading.Thread(target=eicar_animation, daemon=True).start()
            else:
                self.gpio._set(PIN_Y, Y_ACTIVE_LOW, False)
                self.gpio.strobe_error()
            
            result["eicar_payload"] = eicar_string
            return result
            
        except Exception as e:
            self.gpio.strobe_error()
            return {"ok": False, "error": f"EICAR packet send failed: {str(e)}"}
