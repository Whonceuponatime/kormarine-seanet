#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GPIO Controller for Raspberry Pi LED Server
Handles all LED operations and GPIO management
"""

import pigpio
import time
import threading
from config import *


class GPIOController:
    def __init__(self):
        """Initialize GPIO controller and set up pins"""
        self.pi = pigpio.pi()
        if not self.pi.connected:
            raise SystemExit("pigpiod not running. Start with: sudo systemctl enable --now pigpiod")
        
        self.anim_thread = None
        self.anim_stop = threading.Event()
        self.anim_lock = threading.Lock()
        
        self._setup_pins()
        self._off_all()
    
    def _setup_pins(self):
        """Set up GPIO pins as outputs, handling reserved pins gracefully"""
        pins = [PIN_R, PIN_X, PIN_Y, PIN_A, PIN_B, PIN_C, PIN_D]
        for pin in pins:
            try:
                self.pi.set_mode(pin, pigpio.OUTPUT)
            except pigpio.error:
                print(f"[warn] cannot control GPIO {pin} (reserved?)")
    
    def _set(self, pin, active_low, on: bool):
        """Set a GPIO pin to on/off state considering active low/high configuration"""
        # on=True -> LED emits light
        level = 0 if (on and active_low) else (1 if on else (1 if active_low else 0))
        self.pi.write(pin, level)
    
    def _off_all(self):
        """Turn off all LEDs"""
        self._set(PIN_R, R_ACTIVE_LOW, False)
        self._set(PIN_X, X_ACTIVE_LOW, False)
        self._set(PIN_Y, Y_ACTIVE_LOW, False)
        self._set(PIN_A, A_ACTIVE_LOW, False)
        self._set(PIN_B, B_ACTIVE_LOW, False)
        self._set(PIN_C, C_ACTIVE_LOW, False)
        self._set(PIN_D, D_ACTIVE_LOW, False)
    
    def _apply_states(self, r, x, y, a, b, c, d):
        """Apply states to all LEDs at once"""
        self._set(PIN_R, R_ACTIVE_LOW, r)
        self._set(PIN_X, X_ACTIVE_LOW, x)
        self._set(PIN_Y, Y_ACTIVE_LOW, y)
        self._set(PIN_A, A_ACTIVE_LOW, a)
        self._set(PIN_B, B_ACTIVE_LOW, b)
        self._set(PIN_C, C_ACTIVE_LOW, c)
        self._set(PIN_D, D_ACTIVE_LOW, d)
    
    def wave_once(self, step_period=DEFAULT_STEP_PERIOD):
        """Execute a single left-to-right wave animation"""
        # Left-to-right one pass: 17→27→22→10→9→5→6
        seq = [
            (True,  False, False, False, False, False, False),  # 17
            (False, True,  False, False, False, False, False),  # 27
            (False, False, True,  False, False, False, False),  # 22
            (False, False, False, True,  False, False, False),  # 10
            (False, False, False, False, True,  False, False),  # 9
            (False, False, False, False, False, True,  False),  # 5
            (False, False, False, False, False, False, True),   # 6
        ]
        for st in seq:
            self._apply_states(*st)
            time.sleep(step_period)
        self._off_all()
    
    def roundtrip_wave(self, step_period=DEFAULT_ROUNDTRIP_PERIOD):
        """Execute a roundtrip wave animation (forward then backward)"""
        fwd = [
            (True,  False, False, False, False, False, False),
            (False, True,  False, False, False, False, False),
            (False, False, True,  False, False, False, False),
            (False, False, False, True,  False, False, False),
            (False, False, False, False, True,  False, False),
            (False, False, False, False, False, True,  False),
            (False, False, False, False, False, False, True),
        ]
        back = [
            (False, False, False, False, False, True,  False),
            (False, False, False, False, True,  False, False),
            (False, False, False, True,  False, False, False),
            (False, False, True,  False, False, False, False),
            (False, True,  False, False, False, False, False),
            (True,  False, False, False, False, False, False),
        ]
        for st in fwd:
            self._apply_states(*st)
            time.sleep(step_period)
        self._apply_states(False, False, False, False, False, False, True)
        time.sleep(step_period)  # hold @7
        for st in back:
            self._apply_states(*st)
            time.sleep(step_period)
        self._off_all()
    
    def strobe_error(self, blinks=ERROR_BLINKS, on_ms=ERROR_ON_MS, off_ms=ERROR_OFF_MS):
        """Flash red LED to indicate error"""
        for _ in range(blinks):
            self._set(PIN_R, R_ACTIVE_LOW, True)
            time.sleep(on_ms/1000.0)
            self._set(PIN_R, R_ACTIVE_LOW, False)
            time.sleep(off_ms/1000.0)
    
    def chaser(self, step_period=0.5):
        """Continuous chaser animation"""
        order = [
            (True,  False, False, False, False, False, False),
            (False, True,  False, False, False, False, False),
            (False, False, True,  False, False, False, False),
            (False, False, False, True,  False, False, False),
            (False, False, False, False, True,  False, False),
            (False, False, False, False, False, True,  False),
            (False, False, False, False, False, False, True),
        ]
        idx = 0
        while not self.anim_stop.is_set():
            self._apply_states(*order[idx])
            time.sleep(step_period)
            idx = (idx + 1) % len(order)
    
    def start_chaser(self, step_period):
        """Start chaser animation in a separate thread"""
        with self.anim_lock:
            if self.anim_thread and self.anim_thread.is_alive():
                return False
            self.anim_stop.clear()
            self.anim_thread = threading.Thread(target=self.chaser, args=(step_period,), daemon=True)
            self.anim_thread.start()
            return True
    
    def stop_anim(self):
        """Stop any running animation"""
        with self.anim_lock:
            self.anim_stop.set()
            if self.anim_thread and self.anim_thread.is_alive():
                self.anim_thread.join(timeout=0.5)
            self.anim_thread = None
            self._off_all()
    
    def turn_on_pin(self, pin_name):
        """Turn on a specific pin by name"""
        pin_map = {
            '17': (PIN_R, R_ACTIVE_LOW),
            '27': (PIN_X, X_ACTIVE_LOW),
            '22': (PIN_Y, Y_ACTIVE_LOW),
            '10': (PIN_A, A_ACTIVE_LOW),
            '9': (PIN_B, B_ACTIVE_LOW),
            '5': (PIN_C, C_ACTIVE_LOW),
            '6': (PIN_D, D_ACTIVE_LOW),
        }
        
        if pin_name in pin_map:
            pin, active_low = pin_map[pin_name]
            self.stop_anim()
            self._off_all()
            self._set(pin, active_low, True)
            return True
        return False
    
    def get_status(self):
        """Get current status of all pins"""
        return {
            "pins": {
                "17": self.pi.read(PIN_R),
                "27": self.pi.read(PIN_X),
                "22": self.pi.read(PIN_Y),
                "10": self.pi.read(PIN_A),
                "9": self.pi.read(PIN_B),
                "5": self.pi.read(PIN_C),
                "6": self.pi.read(PIN_D),
            }
        }
    
    def cleanup(self):
        """Clean up GPIO resources"""
        self.stop_anim()
        self._off_all()
        if self.pi.connected:
            self.pi.stop()
