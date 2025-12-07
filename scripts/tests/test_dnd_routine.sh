#!/bin/bash

echo "=== Do Not Disturb Routine Test ==="
echo "Pre-requisite: Create a Routine 'IF DND ON -> Enable Dark Mode'"
echo ""

# 1. Setup
echo "[1/3] Disabling DND and Light Mode..."
gsettings set org.gnome.desktop.notifications show-banners true
gsettings set org.gnome.desktop.interface color-scheme 'default'
sleep 2

# 2. Trigger
echo "[2/3] Enabling DND (Triggering Routine)..."
gsettings set org.gnome.desktop.notifications show-banners false

# 3. Verification
echo "[3/3] Waiting 3 seconds..."
sleep 3

CURRENT_SCHEME=$(gsettings get org.gnome.desktop.interface color-scheme)
echo "Current Color Scheme: $CURRENT_SCHEME"

if [[ "$CURRENT_SCHEME" == *'prefer-dark'* ]]; then
    echo "RESULT: PASSED (Dark Mode enabled)"
else
    echo "RESULT: FAILED (Dark Mode not enabled)"
fi
