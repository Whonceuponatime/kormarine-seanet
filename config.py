#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Configuration file for Raspberry Pi LED Server
Contains GPIO pin definitions and server settings
"""

# ===================== GPIO CONFIG =====================
PIN_R = 17   # RGB red (active-HIGH)
PIN_X = 27   # LED (active-HIGH)
PIN_Y = 22   # LED (active-HIGH)
PIN_A = 10   # LED (active-HIGH)
PIN_B = 9    # LED (active-HIGH)
PIN_C = 5    # LED (active-HIGH)
PIN_D = 6    # LED (active-HIGH)

# Active low/high configuration for each pin
R_ACTIVE_LOW = False
X_ACTIVE_LOW = False
Y_ACTIVE_LOW = False
A_ACTIVE_LOW = False
B_ACTIVE_LOW = False
C_ACTIVE_LOW = False
D_ACTIVE_LOW = False

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
