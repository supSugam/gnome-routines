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
- **WiFi**: On/Off, Auto-connect to specific SSID (with retry timeout/interval)
- **Bluetooth**: On/Off, Auto-connect to specific Device (with retry timeout/interval)
- **Airplane Mode**: On/Off

### Display
- **Dark Mode**: On/Off
- **Night Light**: On/Off
- **Screen Timeout**: Set delay in seconds
- **Screen Orientation**: Portrait/Landscape
- **Refresh Rate**: Set specific refresh rate (Hz)

### Sounds
- **Volume**: Set level (0-100%)
- **Brightness**: Set level (0-100%)

### Power
- **Power Saver**: On/Off

### System
- **Do Not Disturb**: On/Off
- **Wallpaper**: Set from file path or URI

### Functions
- **Open Link**: Open URL in default browser
- **Take Screenshot**: Capture screen
- **Open Apps**: Launch multiple applications

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
  - Set refresh rate to 60Hz
```

### Focus Mode
```
IF: VS Code OR Terminal is running
THEN:
  - Enable Do Not Disturb
  - Disable Bluetooth
  - Connect to "Work WiFi" (Try for 30s)
```

### Gaming
```
IF: Steam is running
THEN:
  - Disable Night Light
  - Set volume to 80%
  - Disable screen timeout
  - Set refresh rate to 144Hz
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

**Key Features:**
- **Logic**: Routines activate when ALL triggers match (AND logic).
- **Reactivity**: Changes take effect immediately without restarting.
- **State Persistence**: When a routine ends, actions revert to their previous state (e.g., Wi-Fi reconnects to the previous network, Bluetooth state restores).

---

## Development

```bash
npm run reinstall    # Build, package, and install extension (requires shell restart)
npm run build        # Build only
npm run watch        # Watch mode
```

### Architecture
- **Engine**: Platform-agnostic TypeScript core
- **Adapters**: GNOME Shell integration
- **UI**: LibAdwaita preferences


Inspired by Samsung Modes and Routines
