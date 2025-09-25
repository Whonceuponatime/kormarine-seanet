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
        pins = [PIN_1, PIN_2, PIN_3, PIN_4, PIN_5, PIN_6, PIN_7, PIN_8, PIN_9, PIN_10, PIN_11, PIN_12, PIN_13, PIN_14, PIN_15]
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
        self._set(PIN_1, PIN_1_ACTIVE_LOW, False)
        self._set(PIN_2, PIN_2_ACTIVE_LOW, False)
        self._set(PIN_3, PIN_3_ACTIVE_LOW, False)
        self._set(PIN_4, PIN_4_ACTIVE_LOW, False)
        self._set(PIN_5, PIN_5_ACTIVE_LOW, False)
        self._set(PIN_6, PIN_6_ACTIVE_LOW, False)
        self._set(PIN_7, PIN_7_ACTIVE_LOW, False)
        self._set(PIN_8, PIN_8_ACTIVE_LOW, False)
        self._set(PIN_9, PIN_9_ACTIVE_LOW, False)
        self._set(PIN_10, PIN_10_ACTIVE_LOW, False)
        self._set(PIN_11, PIN_11_ACTIVE_LOW, False)
        self._set(PIN_12, PIN_12_ACTIVE_LOW, False)
        self._set(PIN_13, PIN_13_ACTIVE_LOW, False)
        self._set(PIN_14, PIN_14_ACTIVE_LOW, False)
        self._set(PIN_15, PIN_15_ACTIVE_LOW, False)
    
    def _apply_states(self, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14, p15):
        """Apply states to all LEDs at once"""
        self._set(PIN_1, PIN_1_ACTIVE_LOW, p1)
        self._set(PIN_2, PIN_2_ACTIVE_LOW, p2)
        self._set(PIN_3, PIN_3_ACTIVE_LOW, p3)
        self._set(PIN_4, PIN_4_ACTIVE_LOW, p4)
        self._set(PIN_5, PIN_5_ACTIVE_LOW, p5)
        self._set(PIN_6, PIN_6_ACTIVE_LOW, p6)
        self._set(PIN_7, PIN_7_ACTIVE_LOW, p7)
        self._set(PIN_8, PIN_8_ACTIVE_LOW, p8)
        self._set(PIN_9, PIN_9_ACTIVE_LOW, p9)
        self._set(PIN_10, PIN_10_ACTIVE_LOW, p10)
        self._set(PIN_11, PIN_11_ACTIVE_LOW, p11)
        self._set(PIN_12, PIN_12_ACTIVE_LOW, p12)
        self._set(PIN_13, PIN_13_ACTIVE_LOW, p13)
        self._set(PIN_14, PIN_14_ACTIVE_LOW, p14)
        self._set(PIN_15, PIN_15_ACTIVE_LOW, p15)
    
    def wave_once(self, step_period=DEFAULT_STEP_PERIOD):
        """Execute a single left-to-right wave animation"""
        # Left-to-right one pass: 17→27→22→10→9→5→6→26→16→14→18→23→24→25→20
        seq = [
            (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),  # 17
            (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),  # 27
            (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),  # 22
            (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),  # 10
            (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),  # 9
            (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),  # 5
            (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),  # 6
            (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),  # 26
            (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),  # 16
            (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),  # 14
            (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),  # 18
            (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),  # 23
            (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),  # 24
            (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),  # 25
            (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),   # 20
        ]
        for st in seq:
            self._apply_states(*st)
            time.sleep(step_period)
        self._off_all()
    
    def roundtrip_wave(self, step_period=DEFAULT_ROUNDTRIP_PERIOD):
        """Execute a roundtrip wave animation (forward then backward)"""
        fwd = [
            (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
            (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
            (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
            (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
            (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
            (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
            (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
            (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
            (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
            (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
            (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
            (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
            (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
            (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
            (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),
        ]
        back = [
            (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
            (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
            (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
            (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
            (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
            (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
            (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
            (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
            (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
            (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
            (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
            (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
            (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
            (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
        ]
        for st in fwd:
            self._apply_states(*st)
            time.sleep(step_period)
        self._apply_states(False, False, False, False, False, False, False, False, False, False, False, False, False, False, True)
        time.sleep(step_period)  # hold @15
        for st in back:
            self._apply_states(*st)
            time.sleep(step_period)
        self._off_all()
    
    def strobe_error(self, blinks=ERROR_BLINKS, on_ms=ERROR_ON_MS, off_ms=ERROR_OFF_MS):
        """Flash red LED to indicate error"""
        for _ in range(blinks):
            self._set(PIN_1, PIN_1_ACTIVE_LOW, True)
            time.sleep(on_ms/1000.0)
            self._set(PIN_1, PIN_1_ACTIVE_LOW, False)
            time.sleep(off_ms/1000.0)
    
    def chaser(self, step_period=0.5):
        """Continuous chaser animation"""
        order = [
            (True,  False, False, False, False, False, False, False, False, False, False, False, False, False, False),
            (False, True,  False, False, False, False, False, False, False, False, False, False, False, False, False),
            (False, False, True,  False, False, False, False, False, False, False, False, False, False, False, False),
            (False, False, False, True,  False, False, False, False, False, False, False, False, False, False, False),
            (False, False, False, False, True,  False, False, False, False, False, False, False, False, False, False),
            (False, False, False, False, False, True,  False, False, False, False, False, False, False, False, False),
            (False, False, False, False, False, False, True,  False, False, False, False, False, False, False, False),
            (False, False, False, False, False, False, False, True,  False, False, False, False, False, False, False),
            (False, False, False, False, False, False, False, False, True,  False, False, False, False, False, False),
            (False, False, False, False, False, False, False, False, False, True,  False, False, False, False, False),
            (False, False, False, False, False, False, False, False, False, False, True,  False, False, False, False),
            (False, False, False, False, False, False, False, False, False, False, False, True,  False, False, False),
            (False, False, False, False, False, False, False, False, False, False, False, False, True,  False, False),
            (False, False, False, False, False, False, False, False, False, False, False, False, False, True,  False),
            (False, False, False, False, False, False, False, False, False, False, False, False, False, False, True),
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
            '17': (PIN_1, PIN_1_ACTIVE_LOW),
            '27': (PIN_2, PIN_2_ACTIVE_LOW),
            '22': (PIN_3, PIN_3_ACTIVE_LOW),
            '10': (PIN_4, PIN_4_ACTIVE_LOW),
            '9': (PIN_5, PIN_5_ACTIVE_LOW),
            '5': (PIN_6, PIN_6_ACTIVE_LOW),
            '6': (PIN_7, PIN_7_ACTIVE_LOW),
            '26': (PIN_8, PIN_8_ACTIVE_LOW),
            '16': (PIN_9, PIN_9_ACTIVE_LOW),
            '14': (PIN_10, PIN_10_ACTIVE_LOW),
            '18': (PIN_11, PIN_11_ACTIVE_LOW),
            '23': (PIN_12, PIN_12_ACTIVE_LOW),
            '24': (PIN_13, PIN_13_ACTIVE_LOW),
            '25': (PIN_14, PIN_14_ACTIVE_LOW),
            '20': (PIN_15, PIN_15_ACTIVE_LOW),
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
                "17": self.pi.read(PIN_1),
                "27": self.pi.read(PIN_2),
                "22": self.pi.read(PIN_3),
                "10": self.pi.read(PIN_4),
                "9": self.pi.read(PIN_5),
                "5": self.pi.read(PIN_6),
                "6": self.pi.read(PIN_7),
                "26": self.pi.read(PIN_8),
                "16": self.pi.read(PIN_9),
                "14": self.pi.read(PIN_10),
                "18": self.pi.read(PIN_11),
                "23": self.pi.read(PIN_12),
                "24": self.pi.read(PIN_13),
                "25": self.pi.read(PIN_14),
                "20": self.pi.read(PIN_15),
            }
        }
    
    def cleanup(self):
        """Clean up GPIO resources"""
        self.stop_anim()
        self._off_all()
        if self.pi.connected:
            self.pi.stop()
