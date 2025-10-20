#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Configuration file for Raspberry Pi LED Server
Contains GPIO pin definitions and server settings
"""

# ===================== GPIO CONFIG =====================
# GPIO pins in order: [17, 27, 22, 10, 9, 5, 6, 26, 16, 14, 18, 23, 24, 25, 20, 21]
PIN_1 = 17   # LED 1 (active-HIGH)
PIN_2 = 27   # LED 2 (active-HIGH)
PIN_3 = 22   # LED 3 (active-HIGH)
PIN_4 = 10   # LED 4 (active-HIGH)
PIN_5 = 9    # LED 5 (active-HIGH)
PIN_6 = 5    # LED 6 (active-HIGH)
PIN_7 = 6    # LED 7 (active-HIGH)
PIN_8 = 26   # LED 8 (active-HIGH)
PIN_9 = 16   # LED 9 (active-HIGH)
PIN_10 = 14  # LED 10 (active-HIGH)
PIN_11 = 18  # LED 11 (active-HIGH)
PIN_12 = 23  # LED 12 (active-HIGH)
PIN_13 = 24  # LED 13 (active-HIGH)
PIN_14 = 25  # LED 14 (active-HIGH)
PIN_15 = 20  # LED 15 (active-HIGH)
PIN_16 = 21  # LED 16 (active-HIGH)

# Active low/high configuration for each pin
PIN_1_ACTIVE_LOW = False
PIN_2_ACTIVE_LOW = False
PIN_3_ACTIVE_LOW = False
PIN_4_ACTIVE_LOW = False
PIN_5_ACTIVE_LOW = False
PIN_6_ACTIVE_LOW = False
PIN_7_ACTIVE_LOW = False
PIN_8_ACTIVE_LOW = False
PIN_9_ACTIVE_LOW = False
PIN_10_ACTIVE_LOW = False
PIN_11_ACTIVE_LOW = False
PIN_12_ACTIVE_LOW = False
PIN_13_ACTIVE_LOW = False
PIN_14_ACTIVE_LOW = False
PIN_15_ACTIVE_LOW = False
PIN_16_ACTIVE_LOW = False

# Legacy aliases for backward compatibility
PIN_R = PIN_1   # RGB red (active-HIGH)
PIN_X = PIN_2   # LED (active-HIGH)
PIN_Y = PIN_3   # LED (active-HIGH)
PIN_A = PIN_4   # LED (active-HIGH)
PIN_B = PIN_5   # LED (active-HIGH)
PIN_C = PIN_6   # LED (active-HIGH)
PIN_D = PIN_7   # LED (active-HIGH)
R_ACTIVE_LOW = PIN_1_ACTIVE_LOW
X_ACTIVE_LOW = PIN_2_ACTIVE_LOW
Y_ACTIVE_LOW = PIN_3_ACTIVE_LOW
A_ACTIVE_LOW = PIN_4_ACTIVE_LOW
B_ACTIVE_LOW = PIN_5_ACTIVE_LOW
C_ACTIVE_LOW = PIN_6_ACTIVE_LOW
D_ACTIVE_LOW = PIN_7_ACTIVE_LOW

# Server configuration
PORT = 5050
HOST = "0.0.0.0"

# Animation settings
DEFAULT_WAVE_SPEED = 1.0  # Hz
DEFAULT_STEP_PERIOD = 0.16  # seconds
DEFAULT_ROUNDTRIP_PERIOD = 0.14  # seconds

# Command execution settings
DEFAULT_TIMEOUT = 6  # seconds
PING_TIMEOUT = 3  # seconds
SNMP_TIMEOUT = 8  # seconds

# LED animation settings
ERROR_BLINKS = 3
ERROR_ON_MS = 120
ERROR_OFF_MS = 120
