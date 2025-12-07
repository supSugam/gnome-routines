# GNOME Routines

Automate your GNOME desktop with powerful triggers and actions, inspired by Samsung Modes and Routines.

![GNOME Routines Banner](docs/images/banner.png)

## Table of Contents
- [Installation](#installation)
- [Features](#features)
  - [Triggers](#triggers)
  - [Actions](#actions)
- [Gallery & Examples](#gallery--examples)
- [Tutorial: Creating Your First Routine](#tutorial-creating-your-first-routine)
- [Development](#development)
- [License](#license)

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

## Features

GNOME Routines allows you to create automation rules using a simple **If -> Then** logic.

### Triggers
*Events that start a routine:*

- **Time**: Specific time, time range, or days of the week.
- **App Opened**: When one or more specific applications are running.
- **Network**:
  - **WiFi**: Connect/Disconnect from any or specific network.
  - **Bluetooth**: Device connected/disconnected.
- **Power**:
  - **Battery Level**: Below/Above a percentage.
  - **Charging Status**: Charging or Discharging.
  - **Power Saver**: When system power saver turns on/off.
- **System**:
  - **Airplane Mode**: On/Off.
  - **Dark Mode**: On/Off.
  - **Headphones**: Wired headphones plugged in/out.
- **Clipboard**: When clipboard content changes (supports regex matching).

### Actions
*What happens when a routine runs:*

- **Connectivity**:
  - Toggle **WiFi** / **Bluetooth** / **Airplane Mode**.
  - **Connect/Disconnect** specific WiFi networks or Bluetooth devices.
- **Display**:
  - Toggle **Dark Mode** / **Night Light**.
  - Set **Brightness**, **Screen Timeout**, **Screen Orientation**, **Refresh Rate**.
  - Change **Wallpaper**.
- **Audio**: Set **Volume** level.
- **Productivity**:
  - Toggle **Do Not Disturb**.
  - **Open Apps** or **Web Links**.
  - **Take Screenshot**.
  - **Manage Clipboard** (Clear or Sanitize URLs).

---

## Gallery & Examples

### 🔋 Battery Saver Focus
Automatically optimize settings when battery gets low.

**Trigger**: Battery Level < 20%
**Actions**:
- Turn on Power Saver
- Decrease Brightness to 30%
- Turn off Bluetooth

![Battery Saver Example](docs/images/example_battery.png)

### 🎧 Work Mode
Get into the zone when you launch your coding editor.

**Trigger**: VS Code is open
**Actions**:
- Turn on Do Not Disturb
- Connect to "Noise Cancelling Headphones"
- Set Volume to 40%

![Work Mode Example](docs/images/example_work.png)

### 🌙 Night Routine
Protect your eyes and wind down.

**Trigger**: Time 10:00 PM - 7:00 AM (Every Day)
**Actions**:
- Turn on Night Light
- Turn on Dark Mode
- Set Volume to 20%

![Night Routine Example](docs/images/example_night.png)

---

## Tutorial: Creating Your First Routine

Let's create a simple routine to **Turn on Night Light when Dark Mode is enabled**.

1. **Open Settings**: Go to GNOME Extensions app and open settings for "GNOME Routines".
2. **Add New**: Click the **"Add Routine"** button.
3. **Name It**: Enter "Dark Mode Sync" as the routine name.
4. **Add Trigger**:
   - Click **"Add what will trigger this routine"**.
   - Select **"Dark Mode"**.
   - Set State to **"On"** and click "Add".
5. **Add Action**:
   - Click **"Add what this routine will do"**.
   - Select **"Night Light"**.
   - Set State to **"On"** and click "Add".
6. **Save**: Click the **"Save"** button at the top right.

That's it! Toggle Dark Mode from your Quick Settings panel, and watch Night Light turn on automatically.

---

## Development

Prerequisites: `node`, `npm`, `gnome-shell` development headers.

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Build and watch for changes
npm run watch

# Package for distribution (creates zip in dist/)
npm run package
```

## License

Distributed under the [GPL-3.0 License](LICENSE).
