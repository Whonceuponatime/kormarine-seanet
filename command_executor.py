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
        self.ping_lock = threading.Lock()
    
    def _run(self, cmd: str, timeout=DEFAULT_TIMEOUT):
        """Execute a shell command with timeout"""
        try:
            cp = subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=timeout)
            return cp.returncode, cp.stdout.strip(), cp.stderr.strip()
        except subprocess.TimeoutExpired:
            return 124, "", f"timeout after {timeout}s"
    
    def ping_target(self, target: str):
        """Ping a target with LED visualization"""
        if not target.strip():
            return {"ok": False, "error": "target required"}
        
        if not self.ping_lock.acquire(blocking=False):
            return {"ok": False, "error": "busy"}
        
        def _do_ping():
            try:
                self.gpio.roundtrip_wave(step_period=0.14)
            finally:
                self.ping_lock.release()
        
        # Start LED animation in background
        threading.Thread(target=_do_ping, daemon=True).start()
        
        # Execute ping command
        code, out, err = self._run(f"ping -c 1 -W 1 {target}", timeout=PING_TIMEOUT)
        
        return {
            "ok": (code == 0),
            "code": code,
            "stdout": out,
            "stderr": err
        }
    
    def snmp_walk(self, target: str, community: str = "public"):
        """Execute SNMP walk with LED visualization"""
        if not target.strip():
            return {"ok": False, "error": "target required"}
        
        self.gpio.stop_anim()
        self.gpio._off_all()
        
        cmd = f"snmpwalk -v2c -c {community} {target} 1.3.6.1.2.1.31.1.1.1.1"
        code, out, err = self._run(cmd, timeout=SNMP_TIMEOUT)
        
        # Visual feedback
        self.gpio._set(PIN_X, X_ACTIVE_LOW, True)
        time.sleep(0.12)
        self.gpio._set(PIN_X, X_ACTIVE_LOW, False)
        
        # Start wave animation
        threading.Thread(target=self.gpio.wave_once, kwargs={"step_period": 0.16}, daemon=True).start()
        
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
            # Success animation
            threading.Thread(target=self.gpio.wave_once, kwargs={"step_period": 0.16}, daemon=True).start()
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
