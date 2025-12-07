#!/bin/bash

echo "=== Bluetooth Routine Test ==="
echo "Pre-requisite: Create a Routine 'IF Bluetooth ON -> Connect to [Your Device]'"
echo "Make sure you have a paired bluetooth device ready."
echo ""

# 1. Setup
echo "[1/3] Turning Bluetooth OFF..."
rfkill block bluetooth
sleep 2

# 2. Trigger
echo "[2/3] Turning Bluetooth ON (Triggering Routine)..."
rfkill unblock bluetooth

# 3. Verification
echo "[3/3] Waiting 10 seconds for connection..."
sleep 10

echo "Checking connection status..."
# Simplify check: Just listed connected devices
bluetoothctl devices Connected

echo ""
echo "If your device ID is listed above, the test PASSED!"
echo "If not, check if routine is active or device is in range."
