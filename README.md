# GNOME Routines

Automate your GNOME desktop based on triggers and actions.

---

## Installation

### From Source

```bash
git clone https://github.com/supSugam/gnome-routines.git
cd gnome-routines
npm install
npm run reinstall
```

Restart GNOME Shell:
- **X11**: `Alt+F2` → type `r` → Enter
- **Wayland**: Log out and log back in

Enable the extension:
```bash
gnome-extensions enable gnome-routines@supSugam.com
```

---

## Triggers

### Time
- Specific time (e.g., 9:00 AM)
- Time period (e.g., 9 AM - 5 PM)
- Day selection (weekdays, weekends, specific days)
- Everyday toggle

### App
- Trigger when specific apps are running
- Multi-app selection with search

### WiFi
- Connected to network
- Disconnected from network
- WiFi on/off
- SSID selection

### Bluetooth
- Device connected/disconnected
- Bluetooth on/off
- Device selection

### Battery
- Battery level (percentage)
- Charging status (charging/not charging)

### System
- Power Saver mode on/off
- Dark Mode on/off
- Airplane Mode on/off
- Wired headphones connected/disconnected

---

## Actions

### Connections
- WiFi on/off
- Bluetooth on/off
- Connect/disconnect specific Bluetooth device
- Airplane Mode on/off

### Display
- Dark Mode on/off
- Night Light on/off
- Screen timeout (seconds)
- Screen orientation (portrait/landscape)

### Sounds
- Volume level (0-100%)
- Brightness level (0-100%)

### Power
- Battery Saver on/off

### System
- Do Not Disturb on/off
- Wallpaper (file path or URI)

### Functions
- Open link (URL)
- Take screenshot
- Open apps (multi-select)

---

## Examples

### Work Hours
```
IF: Time is 9 AM - 5 PM on weekdays
THEN: 
  - Enable Do Not Disturb
  - Set volume to 50%
  - Enable Dark Mode
```

### Night Mode
```
IF: Time is after 8 PM
THEN:
  - Enable Night Light
  - Enable Dark Mode
  - Set screen timeout to 5 minutes
```

### Focus Mode
```
IF: VS Code OR Terminal is running
THEN:
  - Enable Do Not Disturb
  - Disable Bluetooth
```

### Gaming
```
IF: Steam is running
THEN:
  - Disable Night Light
  - Set volume to 80%
  - Disable screen timeout
```

### Home WiFi
```
IF: Connected to "Home WiFi"
THEN:
  - Connect to Bluetooth speaker
  - Set wallpaper to ~/Pictures/home.jpg
```

---

## Usage

1. Open GNOME Extensions → GNOME Routines settings
2. Click "Add Routine"
3. Add triggers (IF conditions)
4. Add actions (THEN behaviors)
5. Save

Routines activate when ALL triggers match (AND logic by default). Change to OR logic in routine settings if needed.

When a routine deactivates, actions revert to their previous state (not just toggle).

---

## Development

```bash
npm run build        # Build once
npm run watch        # Watch mode
```

### Architecture
- **Engine**: Platform-agnostic TypeScript core
- **Adapters**: GNOME Shell integration
- **UI**: LibAdwaita preferences


Inspired by Samsung Modes and Routines
