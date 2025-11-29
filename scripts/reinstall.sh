#!/bin/bash
set -e # Exit on error

EXTENSION_ID="gnome-routines@supSugam.com"
ZIP_FILE="dist/gnome-routines@supSugam.com.shell-extension.zip"

echo "Cleaning up old zip..."
rm -f "$ZIP_FILE"

echo "Installing dependencies..."
npm install

echo "Building extension..."
npm run build

echo "Removing existing extension if present..."
# Try to uninstall via gnome-extensions CLI, ignore error if not installed
gnome-extensions uninstall "$EXTENSION_ID" 2>/dev/null || rm -rf "$HOME/.local/share/gnome-shell/extensions/$EXTENSION_ID" || true

echo "Installing new extension..."
# We use the direct command here to ensure we use the freshly built zip
gnome-extensions install --force "$ZIP_FILE"

echo "----------------------------------------------------------------"
echo "Done! The extension has been reinstalled."
echo "IMPORTANT: You MUST restart GNOME Shell for the changes to take effect."
echo "  - X11: Press Alt+F2, type 'r', and press Enter."
echo "  - Wayland: Log out and log back in."
echo "Then enable the extension: gnome-extensions enable $EXTENSION_ID"
echo "----------------------------------------------------------------"
