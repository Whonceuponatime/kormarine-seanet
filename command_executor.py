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
