# Changelog

## V4 - 2026-02-03

- Fixed a race condition where volume settings were not applying correctly upon Bluetooth connection
- Improved build process to ensure consistent line breaks and formatting in compiled output files

---

## V3 - 2026-01-09

- Audio volume control now uses `getMixerControl()` instead of subprocess commands
- Updated extension description to declare clipboard usage as per review guidelines
- Refactored RoutineManager into multiple service classes
- Triggers and actions are now conditionally rendered based on machine capabilities
- Removed spawn/subprocess commands from audio and bluetooth handlers in favor of D-Bus
- Iimeout cleanup on disable/destroy and before creating new timeouts
- Fixed various bugs and general stability improvements

---

## V2 - 2024-12-12

- Initial release with modular file structure
- Automation with triggers (Time, App, Network, Power, etc.) and actions
- Preferences window for managing routines
- Background service for monitoring triggers
