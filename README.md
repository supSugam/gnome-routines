# GNOME Routines

![GPLv3](https://img.shields.io/badge/License-GPLv3-yellow.svg)
![Linux](https://img.shields.io/badge/Linux-FCC624?style=flat&logo=linux&logoColor=black)
![GNOME](https://img.shields.io/badge/GNOME-4A90D9?style=flat&logo=gnome&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![D-Bus](https://img.shields.io/badge/D--Bus-000000?style=flat&logo=dbus&logoColor=white)
[![Download from GNOME Extensions](https://img.shields.io/badge/Download%20from-GNOME%20Extensions-blue)](https://extensions.gnome.org/extension/8238/gnome-routines/)

Automate your GNOME desktop with powerful triggers and actions. Create routines to automatically change settings, launch apps, run commands and more based on the conditions you define (if/then).

![GNOME Routines Banner](docs/images/banner.png)

## Table of Contents
- [Installation](#installation)
- [Features](#features)
  - [Triggers](#triggers)
  - [Actions](#actions)
- [Gallery & Examples](#gallery--examples)
- [Tutorial: Creating Your First Routine](#tutorial-creating-your-first-routine)
- [Development](#development)
- [Contributing](#contributing)
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

### 🎧 Bluetooth Auto-Connect
Automatically connect to your headphones when Bluetooth is turned on.

**Trigger**: Bluetooth turned On
**Action**: Connect to "Galaxy Buds2 Pro"

![Bluetooth Example](docs/images/example_bluetooth.png)

### 📋 Smart Clipboard
Remove tracking parameters from URLs automatically when you copy them.

**Trigger**: Clipboard Content Changes (Regex Match)
**Action**: Sanitize URL (Remove `utm_source`, `igsh`, etc.)

![Clipboard Example](docs/images/example_clipboard.png)

### ⌨️ Late Night Typing
Turn on keyboard backlight automatically during night hours.

**Trigger**: Time 8:00 PM - 6:00 AM
**Action**: Turn On Keyboard Brightness (50%)

![Keyboard Example](docs/images/example_keyboard.png)

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

## Inspiration

- [Samsung's Modes and Routines](https://www.samsung.com/us/support/answer/ANS10002538/)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and suggest improvements.

This project uses the [Contributor Covenant](CODE_OF_CONDUCT.md) to ensure a welcoming community.

## License

Distributed under the [GPL-3.0 License](LICENSE).
