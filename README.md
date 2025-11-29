# GNOME Routines

Automate your GNOME desktop with powerful triggers and actions.

GNOME Routines brings intelligent automation to your Linux desktop. Set up rules that automatically adjust your system settings based on what you're doing, when you're working, or which apps you're using. Inspired by Samsung's Modes and Routines, reimagined for GNOME.

---

## Features

### Smart Triggers
- **Time-based**: Activate routines at specific times or during time periods
- **Day-specific**: Run routines only on selected days of the week
- **App-based**: Trigger when specific applications are running
- **Logic Control**: Combine multiple triggers with AND/OR logic

### Powerful Actions
- **Wallpaper Control**: Automatically change backgrounds
- **Do Not Disturb**: Toggle notifications on/off
- More actions coming soon

### Modern Interface
- Clean, native GNOME interface using LibAdwaita
- Intuitive routine editor with clear trigger/action management
- 12-hour time picker with AM/PM support
- Multi-app selection with search
- Edit, delete, and restart routines with ease

---

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/supSugam/gnome-routines.git
   cd gnome-routines
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and install:
   ```bash
   npm run reinstall
   ```

4. Restart GNOME Shell:
   - **X11**: Press `Alt+F2`, type `r`, and press Enter
   - **Wayland**: Log out and log back in

5. Enable the extension:
   ```bash
   gnome-extensions enable gnome-routines@supSugam.com
   ```

---

## Usage

### Creating Your First Routine

1. Open GNOME Extensions and find GNOME Routines settings
2. Click "Add Routine" to create a new automation
3. Give your routine a descriptive name
4. Add triggers (when should this run?)
   - Example: "Chrome is running" or "After 6 PM on weekdays"
5. Add actions (what should happen?)
   - Example: "Change wallpaper" or "Enable Do Not Disturb"
6. Save and watch your desktop adapt to you

### Example Routines

**Night Mode**
- Trigger: After 8 PM, every day
- Action: Change to dark wallpaper

**Focus Mode**
- Trigger: Work apps running (IDE, Terminal)
- Action: Enable Do Not Disturb

**Gaming Setup**
- Trigger: Steam is running
- Action: Change wallpaper to gaming theme

---

## Development

### Building

```bash
npm run build        # Build once
npm run watch        # Watch mode for development
```

### Project Structure

```
gnome-routines/
├── src/
│   ├── engine/          # Core logic (platform-agnostic)
│   │   ├── triggers/    # Trigger implementations
│   │   ├── actions/     # Action implementations
│   │   └── manager.ts   # Routine manager
│   ├── gnome/           # GNOME-specific adapters
│   │   └── adapters/    # System adapters (GSettings, etc)
│   └── ui/              # User interface
│       ├── prefs.ts     # Preferences window
│       └── editor.ts    # Routine editor
└── schemas/             # GSettings schemas
```

### Architecture

GNOME Routines follows a modular architecture:
- **Engine**: Pure TypeScript core logic, platform-agnostic
- **Adapters**: GNOME Shell integration layer
- **UI**: LibAdwaita-based preferences interface

This design allows the core logic to be tested independently and potentially ported to other platforms.

---

## Contributing

Contributions are welcome. Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Keep the engine platform-agnostic
- Use LibAdwaita HIG for UI components
- Add logging for debugging triggers/actions

---

## Roadmap

- More trigger types (Location, Battery, WiFi network)
- More actions (Brightness, WiFi toggle, App launcher)
- Routine priorities and conflicts resolution
- Import/Export routines
- Quick toggle from panel menu

---

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Inspired by Samsung Modes and Routines
- Built for the GNOME desktop environment
- Uses LibAdwaita for the modern GNOME interface

---

<div align="center">
  <sub>Made with ❤️ for the GNOME community</sub>
</div>
