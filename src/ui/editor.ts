// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GObject from 'gi://GObject';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Gio from 'gi://Gio';

export class RoutineEditor {
  private routine: any;
  private onSave: (routine: any) => void;
  private window: any;

  constructor(routine: any | null, onSave: (routine: any) => void) {
    this.routine = routine || {
      id: GLib.uuid_string_random(),
      name: 'New Routine',
      enabled: true,
      triggers: [],
      actions: [],
    };
    this.onSave = onSave;
  }

  show(parentWindow: any) {
    const winConfig: any = {
      title: this.routine.name,
      modal: true,
      default_width: 600,
      default_height: 500,
    };
    if (parentWindow) {
      winConfig.transient_for = parentWindow;
    }

    this.window = new Adw.Window(winConfig);

    // Main Navigation View
    const navView = new Adw.NavigationView();
    this.window.content = navView;

    // Main Page (Routine List)
    const mainPage = new Adw.NavigationPage({
      title: 'Edit Routine',
      tag: 'main',
    });
    navView.add(mainPage);

    const toolbarView = new Adw.ToolbarView();
    mainPage.child = toolbarView;

    const headerBar = new Adw.HeaderBar();
    toolbarView.add_top_bar(headerBar);

    const saveBtn = new Gtk.Button({
      label: 'Save',
      css_classes: ['suggested-action'],
    });
    // @ts-ignore
    saveBtn.connect('clicked', () => {
      console.log('[Editor] Save clicked');
      // Update name from entry
      this.routine.name = nameEntry.text;

      if (!this.routine.name) {
        console.log('[Editor] Name is empty');
        // TODO: Show error
        return;
      }
      try {
        console.log('[Editor] Calling onSave', JSON.stringify(this.routine));
        this.onSave(this.routine);
        console.log('[Editor] onSave completed');
        this.window.close();
      } catch (e) {
        console.error('[Editor] Save failed', e);
      }
    });
    headerBar.pack_end(saveBtn);

    const content = new Adw.PreferencesPage();
    toolbarView.content = content;

    const group = new Adw.PreferencesGroup({ title: 'General' });
    content.add(group);

    const nameEntry = new Adw.EntryRow({
      title: 'Name',
      text: this.routine.name,
    });
    group.add(nameEntry);

    // If Section (Triggers)
    const triggerGroup = new Adw.PreferencesGroup({
      title: 'If',
      description: 'Add what will trigger this routine',
    });
    content.add(triggerGroup);

    // Match Type Selector
    const matchTypeRow = new Adw.ComboRow({
      title: 'Condition Logic',
      model: new Gtk.StringList({
        strings: ['All conditions met', 'Any condition met'],
      }),
      selected: this.routine.matchType === 'any' ? 1 : 0,
    });
    // @ts-ignore
    matchTypeRow.connect('notify::selected', () => {
      this.routine.matchType = matchTypeRow.selected === 1 ? 'any' : 'all';
    });
    triggerGroup.add(matchTypeRow);

    const getTriggerSummary = (trigger: any) => {
      if (trigger.type === 'time') {
        const days = trigger.config.days || [];
        let dayText = '';
        if (days.length === 7) dayText = 'Everyday';
        else if (days.length === 0)
          dayText = 'Never'; // Should not happen if validated
        else if (days.length === 5 && !days.includes(0) && !days.includes(6))
          dayText = 'Weekdays';
        else if (days.length === 2 && days.includes(0) && days.includes(6))
          dayText = 'Weekends';
        else
          dayText = days
            .map(
              (d: number) =>
                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
            )
            .join(', ');

        if (trigger.config.time) return `At ${trigger.config.time}, ${dayText}`;
        if (trigger.config.startTime)
          return `From ${trigger.config.startTime} to ${trigger.config.endTime}, ${dayText}`;
      }
      if (trigger.type === 'app') {
        const count = trigger.config.appIds ? trigger.config.appIds.length : 0;
        return `App: ${count} selected`;
      }
      if (trigger.type === 'wifi') {
        const ssids = trigger.config.ssids || [];
        const state = trigger.config.state;
        if (ssids.length > 0) {
          return `Wifi: ${state} (${ssids.length} networks)`;
        }
        return `Wifi: ${state}`;
      }
      if (trigger.type === 'bluetooth') {
        const devices = trigger.config.deviceIds || [];
        const state = trigger.config.state;
        if (devices.length > 0) {
          return `Bluetooth: ${state} (${devices.length} devices)`;
        }
        return `Bluetooth: ${state}`;
      }
      if (trigger.type === 'battery') {
        if (trigger.config.mode === 'status') {
          return `Battery: ${trigger.config.status}`;
        }
        return `Battery: ${trigger.config.levelType === 'below' ? '<' : '>='} ${
          trigger.config.level
        }%`;
      }
      if (trigger.type === 'system') {
        const names: any = {
          power_saver: 'Battery Saver',
          dark_mode: 'Dark Mode',
          airplane_mode: 'Airplane Mode',
          headphones: 'Wired Headphones',
        };
        return `${names[trigger.config.type]}: ${trigger.config.state}`;
      }
      return trigger.type;
    };

    const editTrigger = (trigger: any, isNew: boolean = false) => {
      const page = new Adw.NavigationPage({
        title: isNew ? 'Add Condition' : 'Edit Condition',
        tag: 'edit-trigger',
      });

      const toolbarView = new Adw.ToolbarView();
      page.child = toolbarView;

      const headerBar = new Adw.HeaderBar();
      toolbarView.add_top_bar(headerBar);

      const cancelBtn = new Gtk.Button({ label: 'Cancel' });
      // @ts-ignore
      cancelBtn.connect('clicked', () => navView.pop());
      headerBar.pack_start(cancelBtn);

      const addBtn = new Gtk.Button({
        label: isNew ? 'Add' : 'Done',
        css_classes: ['suggested-action'],
      });
      headerBar.pack_end(addBtn);

      const content = new Adw.PreferencesPage();
      toolbarView.content = content;

      const group = new Adw.PreferencesGroup();
      content.add(group);

      let tempConfig = JSON.parse(JSON.stringify(trigger.config));
      let currentType = trigger.type;
      const triggerTypes = [
        { id: 'time', title: 'Time' },
        { id: 'app', title: 'App Opened' },
        { id: 'wifi', title: 'Wifi Status' },
        { id: 'bluetooth', title: 'Bluetooth Status' },
        { id: 'battery', title: 'Battery Level/Status' },
        { id: 'power_saver', title: 'Battery Saver' },
        { id: 'dark_mode', title: 'Dark Mode' },
        { id: 'airplane_mode', title: 'Airplane Mode' },
        { id: 'headphones', title: 'Wired Headphones' },
        { id: 'clipboard', title: 'Clipboard Change' },
      ];

      const typeModel = new Gtk.StringList({
        strings: triggerTypes.map((t) => t.title),
      });
      const typeRow = new Adw.ComboRow({
        title: 'Condition Type',
        model: typeModel,
        selected: triggerTypes.findIndex((t) => t.id === currentType),
      });
      group.add(typeRow);

      // Config Groups
      const timeGroup = new Adw.PreferencesGroup();
      const appGroup = new Adw.PreferencesGroup();
      const wifiGroup = new Adw.PreferencesGroup();
      const bluetoothGroup = new Adw.PreferencesGroup();
      const batteryGroup = new Adw.PreferencesGroup();
      const systemGroup = new Adw.PreferencesGroup(); // For simple on/off system triggers
      const clipboardGroup = new Adw.PreferencesGroup(); // New Clipboard group
      content.add(timeGroup);
      content.add(appGroup);
      content.add(wifiGroup);
      content.add(bluetoothGroup);
      content.add(batteryGroup);
      content.add(systemGroup);
      content.add(clipboardGroup); // Add Clipboard group to content

      // Wifi UI
      const wifiModel = new Gtk.StringList({
        strings: ['Connected', 'Disconnected', 'Turned On', 'Turned Off'],
      });
      const wifiRow = new Adw.ComboRow({
        title: 'Trigger when Wifi is',
        model: wifiModel,
        selected: ['connected', 'disconnected', 'enabled', 'disabled'].indexOf(
          tempConfig.state || 'connected'
        ),
      });
      wifiGroup.add(wifiRow);

      // Wifi Network Selection
      const wifiNetworksRow = new Adw.ExpanderRow({
        title: 'Specific Networks',
        subtitle: 'Leave empty for any network',
        expanded: true,
      });
      wifiGroup.add(wifiNetworksRow);

      // Hide network selection if checking for power state
      // @ts-ignore
      wifiRow.connect('notify::selected', () => {
        const isPowerState = wifiRow.selected >= 2; // 2=enabled, 3=disabled
        wifiNetworksRow.visible = !isPowerState;
      });
      // Initial visibility check
      wifiNetworksRow.visible = wifiRow.selected < 2;

      // --- Bluetooth UI ---
      const btModel = new Gtk.StringList({
        strings: ['Connected', 'Disconnected', 'Turned On', 'Turned Off'],
      });
      const btRow = new Adw.ComboRow({
        title: 'Trigger when Bluetooth is',
        model: btModel,
        selected: ['connected', 'disconnected', 'enabled', 'disabled'].indexOf(
          tempConfig.state || 'connected'
        ),
      });
      bluetoothGroup.add(btRow);

      const btDevicesRow = new Adw.ExpanderRow({
        title: 'Specific Devices',
        subtitle: 'Leave empty for any device',
        expanded: true,
      });
      bluetoothGroup.add(btDevicesRow);

      // Hide device selection if checking for power state
      // @ts-ignore
      btRow.connect('notify::selected', () => {
        const isPowerState = btRow.selected >= 2;
        btDevicesRow.visible = !isPowerState;
      });
      btDevicesRow.visible = btRow.selected < 2;

      // Load Bluetooth devices
      let availableDevices: string[] = [];
      try {
        // Use bluetoothctl devices to list known devices
        // @ts-ignore
        const GLib = imports.gi.GLib;
        const [success, stdout] = GLib.spawn_command_line_sync(
          '/usr/bin/bluetoothctl devices'
        );
        if (success && stdout) {
          const output = new TextDecoder().decode(stdout);
          output.split('\n').forEach((line) => {
            const match = line.match(/^Device\s+([0-9A-F:]+)\s+(.+)$/i);
            if (match) {
              availableDevices.push(match[2]);
            }
          });
          availableDevices.sort();
        }
      } catch (e) {
        console.error('Failed to load bluetooth devices:', e);
      }

      const selectedDevices = new Set<string>(tempConfig.deviceIds || []);

      if (availableDevices.length === 0) {
        const noDevRow = new Adw.ActionRow({
          title: 'No known devices found',
        });
        btDevicesRow.add_row(noDevRow);
      } else {
        availableDevices.forEach((name) => {
          const row = new Adw.ActionRow({ title: name });
          const check = new Gtk.CheckButton({
            active: selectedDevices.has(name),
            valign: Gtk.Align.CENTER,
          });
          // @ts-ignore
          check.connect('toggled', () => {
            if (check.active) selectedDevices.add(name);
            else selectedDevices.delete(name);
          });
          row.add_suffix(check);
          btDevicesRow.add_row(row);
        });
      }

      // Get saved networks via adapter (we need access to adapter here)
      // Since editor doesn't have direct access to adapter, we'll need to pass it or use a global accessor
      // For now, we'll try to get it from the extension instance if possible, or just list known ones if passed
      // But wait, the editor is part of prefs which runs in a separate process from the extension!
      // Prefs cannot access extension objects directly.

      let availableNetworks: string[] = [];
      try {
        // @ts-ignore
        const NM = imports.gi.NM;
        const client = NM.Client.new(null);
        if (client) {
          const connections = client.get_connections();
          for (let i = 0; i < connections.length; i++) {
            const conn = connections[i];
            if (conn.get_connection_type() === '802-11-wireless') {
              const id = conn.get_id();
              if (id && !availableNetworks.includes(id)) {
                availableNetworks.push(id);
              }
            }
          }
          availableNetworks.sort();
        }
      } catch (e) {
        console.error('Failed to load wifi networks in prefs:', e);
      }

      const selectedNetworks = new Set<string>(tempConfig.ssids || []);

      if (availableNetworks.length === 0) {
        const noNetRow = new Adw.ActionRow({
          title: 'No saved networks found',
        });
        wifiNetworksRow.add_row(noNetRow);
      } else {
        availableNetworks.forEach((ssid) => {
          const row = new Adw.ActionRow({ title: ssid });
          const check = new Gtk.CheckButton({
            active: selectedNetworks.has(ssid),
            valign: Gtk.Align.CENTER,
          });
          // @ts-ignore
          check.connect('toggled', () => {
            if (check.active) selectedNetworks.add(ssid);
            else selectedNetworks.delete(ssid);
          });
          row.add_suffix(check);
          wifiNetworksRow.add_row(row);
        });
      }

      // --- Battery UI ---
      const battModeModel = new Gtk.StringList({
        strings: ['Charging Status', 'Battery Level'],
      });
      const battModeRow = new Adw.ComboRow({
        title: 'Trigger Type',
        model: battModeModel,
        selected: tempConfig.mode === 'level' ? 1 : 0,
      });
      batteryGroup.add(battModeRow);

      // Status UI
      const battStatusModel = new Gtk.StringList({
        strings: ['Charging', 'Discharging'],
      });
      const battStatusRow = new Adw.ComboRow({
        title: 'Status',
        model: battStatusModel,
        selected: tempConfig.status === 'discharging' ? 1 : 0,
      });
      batteryGroup.add(battStatusRow);

      // Level UI
      const battLevelTypeModel = new Gtk.StringList({
        strings: ['Below', 'Equal or Above'],
      });
      const battLevelTypeRow = new Adw.ComboRow({
        title: 'Condition',
        model: battLevelTypeModel,
        selected: tempConfig.levelType === 'equal_or_above' ? 1 : 0,
      });
      batteryGroup.add(battLevelTypeRow);

      const battLevelRow = new Adw.SpinRow({
        title: 'Battery Percentage',
        adjustment: new Gtk.Adjustment({
          lower: 5,
          upper: 100,
          step_increment: 5,
          value: tempConfig.level || 50,
        }),
      });
      batteryGroup.add(battLevelRow);

      // Visibility logic for Battery
      const updateBattVisibility = () => {
        const isLevel = battModeRow.selected === 1;
        battStatusRow.visible = !isLevel;
        battLevelTypeRow.visible = isLevel;
        battLevelRow.visible = isLevel;
      };
      // @ts-ignore
      battModeRow.connect('notify::selected', updateBattVisibility);
      updateBattVisibility();

      // --- System Triggers UI (Shared for simple On/Off types) ---
      // We will update the model based on selection
      const systemStateModel = new Gtk.StringList({
        strings: ['On', 'Off'],
      });
      const systemStateRow = new Adw.ComboRow({
        title: 'State',
        model: systemStateModel,
        selected:
          tempConfig.state === 'off' || tempConfig.state === 'disconnected'
            ? 1
            : 0,
      });
      systemGroup.add(systemStateRow);

      // --- Clipboard Trigger UI ---
      const clipboardTypeModel = new Gtk.StringList({
        strings: ['Any Content', 'Text', 'Image', 'Custom Regex'],
      });
      const clipboardTypeRow = new Adw.ComboRow({
        title: 'Content Type',
        model: clipboardTypeModel,
      });
      clipboardGroup.add(clipboardTypeRow);

      const clipboardRegexEntry = new Adw.EntryRow({
        title: 'Regex Pattern',
        text: tempConfig.regex || '',
      });
      clipboardGroup.add(clipboardRegexEntry);

      // Initialize selection
      const cbTypes = ['any', 'text', 'image', 'regex'];
      if (tempConfig.contentType && cbTypes.includes(tempConfig.contentType)) {
        clipboardTypeRow.selected = cbTypes.indexOf(tempConfig.contentType);
      } else {
        clipboardTypeRow.selected = 0;
      }

      const updateClipboardTriggerUI = () => {
        const isRegex = clipboardTypeRow.selected === 3;
        clipboardRegexEntry.visible = isRegex;
      };
      // @ts-ignore
      clipboardTypeRow.connect('notify::selected', () => {
        tempConfig.contentType = cbTypes[clipboardTypeRow.selected];
        updateClipboardTriggerUI();
      });
      // @ts-ignore
      clipboardRegexEntry.connect('changed', () => {
        tempConfig.regex = clipboardRegexEntry.text;
      });
      updateClipboardTriggerUI();

      // --- Time Config UI ---
      // Sub-type selector for Time
      const timeTypeRow = new Adw.ComboRow({
        title: 'Time Mode',
        model: new Gtk.StringList({
          strings: ['Specific Time', 'Time Period'],
        }),
        selected: tempConfig.startTime ? 1 : 0,
      });
      timeGroup.add(timeTypeRow);

      // Helper to create 12h picker
      const createTimePicker = (initialTime24h: string = '09:00') => {
        const box = new Gtk.Box({
          orientation: Gtk.Orientation.HORIZONTAL,
          spacing: 6,
          valign: Gtk.Align.CENTER,
        });

        let [h, m] = initialTime24h.split(':').map(Number);
        if (isNaN(h)) h = 9;
        if (isNaN(m)) m = 0;

        let isPm = h >= 12;
        if (h > 12) h -= 12;
        if (h === 0) h = 12;

        const hourSpin = Gtk.SpinButton.new_with_range(1, 12, 1);
        hourSpin.value = h;
        // hourSpin.orientation = Gtk.Orientation.VERTICAL; // Removed to fix height issue

        const label = new Gtk.Label({ label: ':' });

        const minuteSpin = Gtk.SpinButton.new_with_range(0, 59, 1);
        minuteSpin.value = m;
        // Pad with zero? SpinButton doesn't easily do that without custom formatting, but it's fine.

        const amPmBtn = new Gtk.Button({ label: isPm ? 'PM' : 'AM' });
        // @ts-ignore
        amPmBtn.connect('clicked', () => {
          isPm = !isPm;
          amPmBtn.label = isPm ? 'PM' : 'AM';
        });

        box.append(hourSpin);
        box.append(label);
        box.append(minuteSpin);
        box.append(amPmBtn);

        const getTime = () => {
          let hour = hourSpin.value;
          const minute = minuteSpin.value;

          if (isPm && hour !== 12) hour += 12;
          if (!isPm && hour === 12) hour = 0;

          return `${String(hour).padStart(2, '0')}:${String(minute).padStart(
            2,
            '0'
          )}`;
        };

        return { widget: box, getTime };
      };

      const timeRow = new Adw.ActionRow({ title: 'Time' });
      const timePicker = createTimePicker(tempConfig.time);
      timeRow.add_suffix(timePicker.widget);
      timeGroup.add(timeRow);

      const startRow = new Adw.ActionRow({ title: 'Start Time' });
      const startPicker = createTimePicker(tempConfig.startTime);
      startRow.add_suffix(startPicker.widget);
      timeGroup.add(startRow);

      const endRow = new Adw.ActionRow({ title: 'End Time' });
      const endPicker = createTimePicker(tempConfig.endTime || '17:00');
      endRow.add_suffix(endPicker.widget);
      timeGroup.add(endRow);

      const refreshTimeFields = () => {
        timeRow.visible = timeTypeRow.selected === 0;
        startRow.visible = timeTypeRow.selected === 1;
        endRow.visible = timeTypeRow.selected === 1;
      };
      // @ts-ignore
      timeTypeRow.connect('notify::selected', refreshTimeFields);
      refreshTimeFields();

      // Days
      // We use a separate group for days to visually separate it from time, or keep it in same?
      // User wanted grouping. Let's keep it in the same group but maybe add a header?
      // Or just add it.
      // Actually, "Repeat" is distinct. Let's use a separate group but make sure the time rows above are grouped.
      // The issue was that timeTypeRow and timeEntry were in different groups. Now they are in timeGroup.

      const daysGroup = new Adw.PreferencesGroup({ title: 'Repeat' });
      content.add(daysGroup);

      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Short labels
      const selectedDays = new Set(tempConfig.days || [1, 2, 3, 4, 5]);

      const everydayRow = new Adw.ActionRow({ title: 'Everyday' });
      const everydaySwitch = new Gtk.Switch({
        active: selectedDays.size === 7,
      });
      everydaySwitch.valign = Gtk.Align.CENTER;
      everydayRow.add_suffix(everydaySwitch);
      daysGroup.add(everydayRow);

      // Horizontal Day Toggles
      const dayBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 10,
        halign: Gtk.Align.CENTER,
        margin_top: 10,
        margin_bottom: 10,
      });
      // @ts-ignore
      const dayButtons: Gtk.Button[] = [];

      const validate = () => {
        let isValid = true;
        let errorMsg = '';

        if (currentType === 'time') {
          // Duplication check
          const hasTime = this.routine.triggers.some(
            (tr: any) => tr.type === 'time' && tr !== trigger
          );
          if (hasTime) {
            isValid = false;
            errorMsg = 'Time trigger already exists';
          } else if (selectedDays.size === 0) {
            isValid = false;
            errorMsg = 'Select at least one day';
          }
          // Time validation is implicit with SpinButtons
        } else if (currentType === 'app') {
          if (!tempConfig.appIds || tempConfig.appIds.length === 0) {
            isValid = false;
            errorMsg = 'Select at least one app';
          }
        } else if (currentType === 'clipboard') {
          if (tempConfig.contentType === 'regex' && !tempConfig.regex) {
            isValid = false;
            errorMsg = 'Regex pattern is required';
          }
        }

        addBtn.sensitive = isValid;
        if (!isValid && errorMsg) {
          addBtn.tooltip_text = errorMsg;
        } else {
          addBtn.tooltip_text = '';
        }
      };

      // @ts-ignore
      everydaySwitch.connect('notify::active', () => {
        if (everydaySwitch.active) {
          days.forEach((_, idx) => selectedDays.add(idx));
        } else {
          selectedDays.clear();
        }
        dayButtons.forEach((btn, idx) => {
          // Update visual state
          if (everydaySwitch.active) btn.add_css_class('suggested-action');
          else btn.remove_css_class('suggested-action');
        });
        validate();
      });

      days.forEach((day, idx) => {
        const btn = new Gtk.Button({ label: day });
        btn.add_css_class('circular');
        if (selectedDays.has(idx)) btn.add_css_class('suggested-action');

        // @ts-ignore
        btn.connect('clicked', () => {
          const isActive = selectedDays.has(idx);
          if (!isActive) {
            selectedDays.add(idx);
            btn.add_css_class('suggested-action');
          } else {
            selectedDays.delete(idx);
            btn.remove_css_class('suggested-action');
          }

          if (selectedDays.size === 7 && !everydaySwitch.active) {
            everydaySwitch.active = true;
          } else if (selectedDays.size < 7 && everydaySwitch.active) {
            everydaySwitch.active = false;
          }
          validate();
        });

        dayBox.append(btn);
        dayButtons.push(btn);
      });

      // Add dayBox to a row or directly to group?
      // AdwPreferencesGroup expects rows usually.
      // Let's try adding it to a custom ActionRow that is not activatable.
      const dayRow = new Adw.ActionRow();
      dayRow.add_suffix(dayBox);
      daysGroup.add(dayRow);

      // --- App Config UI ---
      // Inline Search and List
      const appSearch = new Gtk.SearchEntry({
        placeholder_text: 'Search Apps...',
      });
      appSearch.margin_bottom = 10;
      appGroup.add(appSearch);

      const appScroll = new Gtk.ScrolledWindow();
      appScroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
      appScroll.min_content_height = 300; // Fixed height for scrollable area
      appScroll.propagate_natural_height = true;

      const appList = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
      });
      appList.add_css_class('boxed-list');
      appScroll.child = appList;
      appGroup.add(appScroll);

      // Initialize selected apps
      if (!tempConfig.appIds) {
        tempConfig.appIds = tempConfig.appId ? [tempConfig.appId] : [];
      }
      const selectedAppIds = new Set(tempConfig.appIds);

      const allApps = Gio.AppInfo.get_all().filter((app: any) =>
        app.should_show()
      );
      // @ts-ignore
      const appRows: { row: Adw.ActionRow; name: string }[] = [];

      allApps.forEach((app: any) => {
        const row = new Adw.ActionRow({ title: app.get_name() });

        // Icon
        const icon = app.get_icon();
        if (icon) {
          const img = Gtk.Image.new_from_gicon(icon);
          img.pixel_size = 32;
          row.add_prefix(img);
        }

        // Switch for selection
        const toggle = new Gtk.Switch({
          active: selectedAppIds.has(app.get_id()),
        });
        toggle.valign = Gtk.Align.CENTER;

        // @ts-ignore
        toggle.connect('notify::active', () => {
          if (toggle.active) selectedAppIds.add(app.get_id());
          else selectedAppIds.delete(app.get_id());

          tempConfig.appIds = Array.from(selectedAppIds);
          validate();
        });

        row.add_suffix(toggle);
        appList.append(row);
        appRows.push({ row, name: app.get_name().toLowerCase() });
      });

      // Search logic
      // @ts-ignore
      appSearch.connect('search-changed', () => {
        const query = appSearch.text.toLowerCase();
        appRows.forEach((item) => {
          item.row.visible = item.name.includes(query);
        });
      });

      const updateVisibility = () => {
        const selectedType = triggerTypes[typeRow.selected].id;
        currentType = selectedType;

        timeGroup.visible = selectedType === 'time';
        daysGroup.visible = selectedType === 'time'; // Hide repeat for non-time triggers
        appGroup.visible = selectedType === 'app';
        wifiGroup.visible = selectedType === 'wifi';
        bluetoothGroup.visible = selectedType === 'bluetooth';
        batteryGroup.visible = selectedType === 'battery';
        clipboardGroup.visible = selectedType === 'clipboard';

        // Map specific types to 'system' group
        const isSystem = [
          'power_saver',
          'dark_mode',
          'airplane_mode',
          'headphones',
        ].includes(selectedType);
        systemGroup.visible = isSystem;

        if (isSystem) {
          // Update labels based on type
          if (selectedType === 'headphones') {
            // We can't easily replace strings in StringList, so we set a new model or just accept it?
            // Actually GtkStringList is immutable-ish for simple usage, but we can splice.
            // Or just create new models.
            // Let's try splicing.
            // systemStateModel.splice(0, 2, ['Connected', 'Disconnected']);
            // But splice is not always available in GJS bindings easily or might be tricky.
            // Creating a new StringList and setting it to the row is safer.
            const newModel = new Gtk.StringList({
              strings: ['Connected', 'Disconnected'],
            });
            systemStateRow.model = newModel;
          } else {
            const newModel = new Gtk.StringList({ strings: ['On', 'Off'] });
            systemStateRow.model = newModel;
          }
        }

        validate();
      };

      // @ts-ignore
      typeRow.connect('notify::selected', updateVisibility);
      updateVisibility();

      // @ts-ignore
      addBtn.connect('clicked', () => {
        let finalConfig: any = {};

        if (currentType === 'time') {
          if (timeTypeRow.selected === 0) {
            finalConfig = {
              time: timePicker.getTime(),
              days: Array.from(selectedDays),
            };
          } else {
            finalConfig = {
              startTime: startPicker.getTime(),
              endTime: endPicker.getTime(),
              days: Array.from(selectedDays),
            };
          }
        } else if (currentType === 'app') {
          finalConfig = {
            appIds: tempConfig.appIds,
          };
        } else if (currentType === 'wifi') {
          const states = ['connected', 'disconnected', 'enabled', 'disabled'];
          finalConfig = {
            state: states[wifiRow.selected],
            ssids: Array.from(selectedNetworks),
          };
        } else if (currentType === 'bluetooth') {
          const states = ['connected', 'disconnected', 'enabled', 'disabled'];
          finalConfig = {
            state: states[btRow.selected],
            deviceIds: Array.from(selectedDevices),
          };
        } else if (currentType === 'battery') {
          finalConfig = {
            mode: battModeRow.selected === 0 ? 'status' : 'level',
            status: battStatusRow.selected === 0 ? 'charging' : 'discharging',
            levelType:
              battLevelTypeRow.selected === 0 ? 'below' : 'equal_or_above',
            level: battLevelRow.get_value(),
          };
        } else if (
          ['power_saver', 'dark_mode', 'airplane_mode', 'headphones'].includes(
            currentType
          )
        ) {
          // We map these all to 'system' trigger type internally, but keep the UI selection as 'type'
          // Wait, TriggerFactory expects 'system' type with config.type
          trigger.type = 'system'; // Override the type
          finalConfig = {
            type: currentType,
            state:
              systemStateRow.selected === 0
                ? currentType === 'headphones'
                  ? 'connected'
                  : 'on'
                : currentType === 'headphones'
                ? 'disconnected'
                : 'off',
          };
        } else if (currentType === 'clipboard') {
          finalConfig = {
            contentType: tempConfig.contentType || 'any',
            regex: tempConfig.regex,
          };
        }

        trigger.type = currentType;
        trigger.config = finalConfig;

        if (isNew) this.routine.triggers.push(trigger);
        refreshTriggers();
        navView.pop();
      });

      navView.push(page);
    };

    // Track added rows to remove them cleanly
    let triggerRows: any[] = [];

    const refreshTriggers = () => {
      // Remove previously added rows
      triggerRows.forEach((row) => triggerGroup.remove(row));
      triggerRows = [];

      this.routine.triggers.forEach((trigger: any, index: number) => {
        const row = new Adw.ActionRow({
          title: trigger.type,
          subtitle: getTriggerSummary(trigger),
        });

        // Edit on click
        // @ts-ignore
        row.connect('activated', () => editTrigger(trigger));
        row.activatable = true;

        const deleteBtn = new Gtk.Button({
          icon_name: 'user-trash-symbolic',
          valign: Gtk.Align.CENTER,
        });
        deleteBtn.add_css_class('flat');
        // @ts-ignore
        deleteBtn.connect('clicked', () => {
          this.routine.triggers.splice(index, 1);
          refreshTriggers();
        });
        row.add_suffix(deleteBtn);
        triggerGroup.add(row);
        triggerRows.push(row);
      });
    };

    const addTriggerBtn = new Gtk.Button({
      label: 'Add what will trigger this routine',
      margin_top: 10,
    });
    addTriggerBtn.add_css_class('pill');
    // @ts-ignore
    addTriggerBtn.connect('clicked', () => {
      const hasTime = this.routine.triggers.some(
        (tr: any) => tr.type === 'time'
      );
      const defaultType = hasTime ? 'app' : 'time';

      const newTrigger = {
        id: GLib.uuid_string_random(),
        type: defaultType,
        config: {},
      };
      editTrigger(newTrigger, true);
    });
    triggerGroup.add(addTriggerBtn);
    refreshTriggers();

    // Then Section (Actions)
    const actionGroup = new Adw.PreferencesGroup({
      title: 'Then',
      description: 'Add what this routine will do',
    });
    content.add(actionGroup);

    const getActionSummary = (action: any) => {
      if (action.type === 'dnd')
        return action.config.enabled === false
          ? 'Disable Do Not Disturb'
          : 'Enable Do Not Disturb';
      if (action.type === 'bluetooth')
        return action.config.enabled === false
          ? 'Disable Bluetooth'
          : 'Enable Bluetooth';
      if (action.type === 'wifi')
        return action.config.enabled === false
          ? 'Turn Off Wifi'
          : 'Turn On Wifi';
      if (action.type === 'airplane_mode')
        return action.config.enabled === false
          ? 'Disable Airplane Mode'
          : 'Enable Airplane Mode';
      if (action.type === 'bluetooth_device')
        return `${
          action.config.action === 'connect' ? 'Connect to' : 'Disconnect from'
        } ${action.config.deviceId}`;
      if (action.type === 'volume')
        return `Set Volume to ${action.config.level}%`;
      if (action.type === 'brightness')
        return `Set Brightness to ${action.config.level}%`;
      if (action.type === 'keyboard_brightness')
        return `Set Keyboard Brightness to ${action.config.level}%`;
      if (action.type === 'wallpaper')
        return `Set Wallpaper: ...${action.config.uri?.slice(-20)}`;
      if (action.type === 'dark_mode')
        return `Dark Mode: ${action.config.enabled ? 'On' : 'Off'}`;
      if (action.type === 'night_light')
        return `Night Light: ${action.config.enabled ? 'On' : 'Off'}`;
      if (action.type === 'power_saver')
        return `Power Saver: ${action.config.enabled ? 'On' : 'Off'}`;
      if (action.type === 'screen_timeout')
        return `Screen Timeout: ${action.config.seconds}s`;
      if (action.type === 'screen_orientation')
        return `Orientation: ${action.config.orientation}`;
      if (action.type === 'open_link') return `Open Link: ${action.config.url}`;
      if (action.type === 'open_app')
        return `Open ${action.config.appIds?.length || 0} Apps`;
      if (action.type === 'screenshot') return 'Take Screenshot';
      return action.type;
    };

    const editAction = (
      action: any,
      isNew: boolean = false,
      customOnSave: ((config: any) => void) | null = null
    ) => {
      const page = new Adw.NavigationPage({
        title: isNew ? 'Add Action' : 'Edit Action',
        tag: 'edit-action',
      });

      const toolbarView = new Adw.ToolbarView();
      page.child = toolbarView;

      const headerBar = new Adw.HeaderBar();
      toolbarView.add_top_bar(headerBar);

      const cancelBtn = new Gtk.Button({ label: 'Cancel' });
      // @ts-ignore
      cancelBtn.connect('clicked', () => navView.pop());
      headerBar.pack_start(cancelBtn);

      const addBtn = new Gtk.Button({
        label: isNew ? 'Add' : 'Done',
        css_classes: ['suggested-action'],
      });
      headerBar.pack_end(addBtn);

      const content = new Adw.PreferencesPage();
      toolbarView.content = content;

      const group = new Adw.PreferencesGroup();
      content.add(group);

      let tempConfig = JSON.parse(JSON.stringify(action.config));
      let currentType = action.type;

      const actionTypes = [
        { id: 'wallpaper', title: 'Set Wallpaper' },
        { id: 'dnd', title: 'Do Not Disturb' },
        { id: 'volume', title: 'Set Volume' },
        { id: 'brightness', title: 'Set Brightness' },
        { id: 'keyboard_brightness', title: 'Set Keyboard Brightness' },
        { id: 'wifi', title: 'Wifi Control' },
        { id: 'bluetooth', title: 'Bluetooth Control' },
        { id: 'open_app', title: 'Open App' },
        { id: 'screen_timeout', title: 'Screen Timeout' },
        { id: 'screen_orientation', title: 'Screen Orientation' },
        { id: 'refresh_rate', title: 'Refresh Rate' },
        { id: 'dark_mode', title: 'Dark Mode' },
        { id: 'night_light', title: 'Night Light' },
        { id: 'power_saver', title: 'Power Saver' },
        { id: 'airplane_mode', title: 'Airplane Mode' },
        { id: 'clipboard', title: 'Clipboard' },
        { id: 'open_link', title: 'Open Link' },
        { id: 'screenshot', title: 'Take Screenshot' },
      ];

      const typeModel = new Gtk.StringList({
        strings: actionTypes.map((t) => t.title),
      });
      const typeRow = new Adw.ComboRow({
        title: 'Action Type',
        model: typeModel,
        selected: actionTypes.findIndex((t) => t.id === currentType),
      });
      // Disable type changing if custom save (deactivation config)
      if (customOnSave) {
        typeRow.sensitive = false;
      }
      group.add(typeRow);

      // --- Action Specific UIs ---

      // Wallpaper
      const wallpaperGroup = new Adw.PreferencesGroup();
      // DND
      const dndGroup = new Adw.PreferencesGroup();
      // Volume
      const volumeGroup = new Adw.PreferencesGroup();
      // Brightness
      const brightnessGroup = new Adw.PreferencesGroup();
      // Keyboard Brightness
      const kbBrightnessGroup = new Adw.PreferencesGroup();
      // Wifi
      const wifiGroup = new Adw.PreferencesGroup();
      // Bluetooth
      const bluetoothGroup = new Adw.PreferencesGroup();
      // App
      const appGroup = new Adw.PreferencesGroup();
      // Screen Timeout
      const timeoutGroup = new Adw.PreferencesGroup();
      // Orientation
      const orientationGroup = new Adw.PreferencesGroup();
      // Refresh Rate
      const refreshRateGroup = new Adw.PreferencesGroup();
      // Dark Mode
      const darkModeGroup = new Adw.PreferencesGroup();
      // Night Light
      const nightLightGroup = new Adw.PreferencesGroup();
      // Power Saver
      const powerSaverGroup = new Adw.PreferencesGroup();
      // Airplane Mode
      const airplaneModeGroup = new Adw.PreferencesGroup();
      // Clipboard
      const clipboardGroup = new Adw.PreferencesGroup();
      // Open Link
      const openLinkGroup = new Adw.PreferencesGroup();
      // Screenshot
      const screenshotGroup = new Adw.PreferencesGroup();

      content.add(wallpaperGroup);
      content.add(dndGroup);
      content.add(volumeGroup);
      content.add(brightnessGroup);
      content.add(kbBrightnessGroup);
      content.add(wifiGroup);
      content.add(bluetoothGroup);
      content.add(appGroup);
      content.add(timeoutGroup);
      content.add(orientationGroup);
      content.add(refreshRateGroup);
      content.add(darkModeGroup);
      content.add(nightLightGroup);
      content.add(powerSaverGroup);
      content.add(airplaneModeGroup);
      content.add(clipboardGroup);
      content.add(openLinkGroup);
      content.add(screenshotGroup);

      // Wifi
      const wifiRow = new Adw.ActionRow({ title: 'Enable Wifi' });
      const wifiToggle = new Gtk.Switch({
        active: tempConfig.enabled !== false,
      });
      wifiToggle.valign = Gtk.Align.CENTER;
      wifiRow.add_suffix(wifiToggle);
      wifiGroup.add(wifiRow);

      // Wifi SSID
      const wifiSsidModel = new Gtk.StringList();
      const knownSsids: string[] = [];
      try {
        // @ts-ignore
        const GLib = imports.gi.GLib;
        // Get known wifi connections
        const [success, stdout] = GLib.spawn_command_line_sync(
          'nmcli -t -f NAME,TYPE connection show'
        );
        if (success && stdout) {
          const output = new TextDecoder().decode(stdout);
          output.split('\n').forEach((line) => {
            const parts = line.split(':');
            if (parts.length >= 2 && parts[1] === '802-11-wireless') {
              knownSsids.push(parts[0]);
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      knownSsids.forEach((ssid) => wifiSsidModel.append(ssid));

      const wifiSsidRow = new Adw.ComboRow({
        title: 'Auto-connect to Network',
        model: wifiSsidModel,
        selected: tempConfig.ssid
          ? Math.max(0, knownSsids.indexOf(tempConfig.ssid))
          : -1, // -1 or 0? ComboRow defaults to 0.
      });
      // If no SSID selected previously, maybe don't select any? ComboRow always selects one.
      // We can add a "None" option at start.
      wifiSsidModel.splice(0, 0, ['None']);
      wifiSsidRow.selected = tempConfig.ssid
        ? knownSsids.indexOf(tempConfig.ssid) + 1
        : 0;

      wifiGroup.add(wifiSsidRow);

      const wifiTimeoutRow = new Adw.SpinRow({
        title: 'Connection Timeout (s)',
        adjustment: new Gtk.Adjustment({
          lower: 5,
          upper: 300,
          step_increment: 5,
          value: tempConfig.timeout ?? 30,
        }),
      });
      wifiGroup.add(wifiTimeoutRow);

      const wifiIntervalRow = new Adw.SpinRow({
        title: 'Retry Interval (s)',
        adjustment: new Gtk.Adjustment({
          lower: 1,
          upper: 60,
          step_increment: 1,
          value: tempConfig.interval ?? 5,
        }),
      });
      wifiGroup.add(wifiIntervalRow);

      // Bluetooth
      const bluetoothRow = new Adw.ActionRow({
        title: 'Enable Bluetooth',
      });
      const bluetoothToggle = new Gtk.Switch({
        active: tempConfig.enabled !== false,
      });
      bluetoothToggle.valign = Gtk.Align.CENTER;
      bluetoothRow.add_suffix(bluetoothToggle);
      bluetoothGroup.add(bluetoothRow);

      // Bluetooth Device
      const btDeviceModel = new Gtk.StringList();
      const knownBtDevices: { id: string; name: string }[] = [];
      try {
        // @ts-ignore
        const GLib = imports.gi.GLib;
        const [success, stdout] = GLib.spawn_command_line_sync(
          '/usr/bin/bluetoothctl devices'
        );
        if (success && stdout) {
          const output = new TextDecoder().decode(stdout);
          output.split('\n').forEach((line) => {
            const parts = line.split(' ');
            if (parts.length >= 3 && parts[0] === 'Device') {
              // Format: Device MAC Name...
              const mac = parts[1];
              const name = parts.slice(2).join(' ');
              knownBtDevices.push({ id: mac, name: name });
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      knownBtDevices.forEach((d) => btDeviceModel.append(d.name));
      // Add None option at the beginning
      btDeviceModel.splice(0, 0, ['None']);

      const btDeviceRow = new Adw.ComboRow({
        title: 'Connect to Device',
        model: btDeviceModel,
        selected: tempConfig.deviceId
          ? Math.max(
              0,
              knownBtDevices.findIndex((d) => d.id === tempConfig.deviceId) + 1
            )
          : 0,
      });

      // Adjust selection logic
      if (tempConfig.deviceId) {
        const idx = knownBtDevices.findIndex(
          (d) => d.id === tempConfig.deviceId
        );
        if (idx >= 0) btDeviceRow.selected = idx + 1;
      }

      bluetoothGroup.add(btDeviceRow);

      const btTimeoutRow = new Adw.SpinRow({
        title: 'Connection Timeout (s)',
        adjustment: new Gtk.Adjustment({
          lower: 5,
          upper: 300,
          step_increment: 5,
          value: tempConfig.timeout ?? 30,
        }),
      });
      bluetoothGroup.add(btTimeoutRow);

      const btIntervalRow = new Adw.SpinRow({
        title: 'Retry Interval (s)',
        adjustment: new Gtk.Adjustment({
          lower: 1,
          upper: 60,
          step_increment: 1,
          value: tempConfig.interval ?? 5,
        }),
      });
      bluetoothGroup.add(btIntervalRow);

      // Keyboard Brightness
      const kbBrightnessRow = new Adw.SpinRow({
        title: 'Keyboard Brightness (%)',
        adjustment: new Gtk.Adjustment({
          lower: 0,
          upper: 100,
          step_increment: 5,
          value: tempConfig.level ?? 50,
        }),
      });
      kbBrightnessGroup.add(kbBrightnessRow);

      // @ts-ignore
      kbBrightnessRow.connect('notify::value', () => {
        tempConfig.level = kbBrightnessRow.value;
      });

      // Airplane Mode
      const airplaneRow = new Adw.ActionRow({ title: 'Enable Airplane Mode' });
      const airplaneToggle = new Gtk.Switch({
        active: tempConfig.enabled !== false,
      });
      airplaneToggle.valign = Gtk.Align.CENTER;
      airplaneRow.add_suffix(airplaneToggle);
      airplaneModeGroup.add(airplaneRow);

      // @ts-ignore
      airplaneToggle.connect('notify::active', () => {
        tempConfig.enabled = airplaneToggle.active;
      });

      // Dark Mode
      const darkModeRow = new Adw.ActionRow({ title: 'Enable Dark Mode' });
      const darkModeToggle = new Gtk.Switch({
        active: tempConfig.enabled !== false,
      });
      darkModeToggle.valign = Gtk.Align.CENTER;
      darkModeRow.add_suffix(darkModeToggle);
      darkModeGroup.add(darkModeRow);

      // @ts-ignore
      darkModeToggle.connect('notify::active', () => {
        tempConfig.enabled = darkModeToggle.active;
      });

      // Night Light
      const nightLightRow = new Adw.ActionRow({ title: 'Enable Night Light' });
      const nightLightToggle = new Gtk.Switch({
        active: tempConfig.enabled !== false,
      });
      nightLightToggle.valign = Gtk.Align.CENTER;
      nightLightRow.add_suffix(nightLightToggle);
      nightLightGroup.add(nightLightRow);

      // @ts-ignore
      nightLightToggle.connect('notify::active', () => {
        tempConfig.enabled = nightLightToggle.active;
      });

      // Screen Orientation
      const orientationModel = new Gtk.StringList({
        strings: ['Normal', 'Left', 'Right', 'Upside Down'],
      });
      const orientationRow = new Adw.ComboRow({
        title: 'Orientation',
        model: orientationModel,
      });
      orientationGroup.add(orientationRow);

      const orientations = ['normal', 'left', 'right', 'upside-down'];
      if (
        tempConfig.orientation &&
        orientations.includes(tempConfig.orientation)
      ) {
        orientationRow.selected = orientations.indexOf(tempConfig.orientation);
      }

      // @ts-ignore
      orientationRow.connect('notify::selected', () => {
        tempConfig.orientation = orientations[orientationRow.selected];
      });

      // Refresh Rate
      const refreshRateModel = new Gtk.StringList();
      let availableRates: number[] = [60]; // Default
      try {
        // @ts-ignore
        const GLib = imports.gi.GLib;
        const [success, stdout] =
          GLib.spawn_command_line_sync('xrandr --current');
        if (success && stdout) {
          const output = new TextDecoder().decode(stdout);
          const rates: number[] = [];
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.includes('*')) {
              const rateMatches = line.matchAll(/(\d+\.\d+)/g);
              for (const match of rateMatches) {
                const rate = Math.round(parseFloat(match[1]));
                if (rate > 0 && !rates.includes(rate)) {
                  rates.push(rate);
                }
              }
              break;
            }
          }
          availableRates = rates.sort((a, b) => b - a);
        }
      } catch (e) {
        console.error(e);
      }

      availableRates.forEach((rate) => refreshRateModel.append(`${rate} Hz`));
      const initialIndex = tempConfig.rate
        ? availableRates.indexOf(tempConfig.rate)
        : 0;
      const refreshRateRow = new Adw.ComboRow({
        title: 'Refresh Rate',
        model: refreshRateModel,
        selected: initialIndex >= 0 ? initialIndex : 0,
      });
      refreshRateGroup.add(refreshRateRow);

      // Screen Timeout
      const timeoutRow = new Adw.SpinRow({
        title: 'Timeout (seconds)',
        adjustment: new Gtk.Adjustment({
          lower: 10,
          upper: 3600,
          step_increment: 10,
          value: tempConfig.seconds ?? 300,
        }),
      });
      timeoutGroup.add(timeoutRow);

      // Power Saver
      const powerRow = new Adw.ActionRow({ title: 'Enable Power Saver' });
      const powerToggle = new Gtk.Switch({
        active: tempConfig.enabled !== false,
      });
      powerToggle.valign = Gtk.Align.CENTER;
      powerRow.add_suffix(powerToggle);
      powerSaverGroup.add(powerRow);

      // Functions
      const linkEntry = new Adw.EntryRow({
        title: 'URL',
        text: tempConfig.url || 'https://',
      });
      openLinkGroup.add(linkEntry);

      // App Picker (Multi-select with Search)
      const appExpander = new Adw.ExpanderRow({
        title: 'Select Apps',
        subtitle: tempConfig.appIds
          ? `${tempConfig.appIds.length} apps selected`
          : 'None selected',
      });
      appGroup.add(appExpander);

      const appSearchEntry = new Gtk.SearchEntry({
        placeholder_text: 'Search Apps...',
      });
      appSearchEntry.margin_bottom = 10;
      appSearchEntry.margin_top = 10;
      appSearchEntry.margin_start = 10;
      appSearchEntry.margin_end = 10;
      appExpander.add_row(appSearchEntry);

      const allAppsList = Gio.AppInfo.get_all().filter((a: any) =>
        a.should_show()
      );
      const selectedApps = new Set(tempConfig.appIds || []);
      let appRows: any[] = [];

      const refreshAppList = (filterText: string = '') => {
        // Clear existing rows (except search)
        appRows.forEach((row) => appExpander.remove(row));
        appRows = [];

        const lowerFilter = filterText.toLowerCase();
        const filteredApps = allAppsList.filter(
          (app: any) =>
            app.get_name().toLowerCase().includes(lowerFilter) ||
            selectedApps.has(app.get_id()) // Always show selected
        );

        // Limit to 50 to avoid lag if no filter
        const appsToShow = filterText
          ? filteredApps
          : filteredApps.slice(0, 50);

        appsToShow.forEach((app: any) => {
          const row = new Adw.ActionRow({ title: app.get_name() });
          const check = new Gtk.CheckButton({
            active: selectedApps.has(app.get_id()),
          });
          check.valign = Gtk.Align.CENTER;
          // @ts-ignore
          check.connect('toggled', () => {
            if (check.active) selectedApps.add(app.get_id());
            else selectedApps.delete(app.get_id());
            appExpander.subtitle = `${selectedApps.size} apps selected`;
          });
          row.add_suffix(check);
          appExpander.add_row(row);
          appRows.push(row);
        });
      };

      // @ts-ignore
      appSearchEntry.connect('search-changed', () =>
        refreshAppList(appSearchEntry.text)
      );
      refreshAppList();

      const dndRow = new Adw.ActionRow({ title: 'Enable DND' });
      const dndToggle = new Gtk.Switch({
        active: tempConfig.enabled !== false,
      });
      dndToggle.valign = Gtk.Align.CENTER;
      dndRow.add_suffix(dndToggle);
      dndGroup.add(dndRow);

      const volumeRow = new Adw.SpinRow({
        title: 'Volume Level (%)',
        adjustment: new Gtk.Adjustment({
          lower: 0,
          upper: 100,
          step_increment: 5,
          value: tempConfig.level ?? 50,
        }),
      });
      volumeGroup.add(volumeRow);

      const brightnessRow = new Adw.SpinRow({
        title: 'Brightness Level (%)',
        adjustment: new Gtk.Adjustment({
          lower: 0,
          upper: 100,
          step_increment: 5,
          value: tempConfig.level ?? 50,
        }),
      });
      brightnessGroup.add(brightnessRow);

      const keyboardBrightnessRow = new Adw.SpinRow({
        title: 'Keyboard Brightness Level (%)',
        adjustment: new Gtk.Adjustment({
          lower: 0,
          upper: 100,
          step_increment: 5,
          value: tempConfig.level ?? 50,
        }),
      });
      kbBrightnessGroup.add(keyboardBrightnessRow);

      const uriEntry = new Adw.EntryRow({
        title: 'Image URI',
        text: tempConfig.uri || 'file://',
      });
      wallpaperGroup.add(uriEntry);

      // Clipboard Action UI
      const clipboardOpModel = new Gtk.StringList({
        strings: ['Clear', 'Replace Text'],
      });
      const clipboardOpRow = new Adw.ComboRow({
        title: 'Operation',
        model: clipboardOpModel,
      });
      clipboardGroup.add(clipboardOpRow);

      const clipboardFindEntry = new Adw.EntryRow({
        title: 'Find Regex',
        text: tempConfig.find || '',
      });
      clipboardGroup.add(clipboardFindEntry);

      const clipboardReplaceEntry = new Adw.EntryRow({
        title: 'Replace With',
        text: tempConfig.replace || '',
      });
      clipboardGroup.add(clipboardReplaceEntry);

      // Initialize selection and visibility
      if (tempConfig.operation === 'replace') {
        clipboardOpRow.selected = 1;
      } else {
        clipboardOpRow.selected = 0;
      }

      const updateClipboardUI = () => {
        const isReplace = clipboardOpRow.selected === 1;
        clipboardFindEntry.visible = isReplace;
        clipboardReplaceEntry.visible = isReplace;
      };
      // @ts-ignore
      clipboardOpRow.connect('notify::selected', () => {
        tempConfig.operation =
          clipboardOpRow.selected === 1 ? 'replace' : 'clear';
        updateClipboardUI();
      });
      // @ts-ignore
      clipboardFindEntry.connect('changed', () => {
        tempConfig.find = clipboardFindEntry.text;
      });
      // @ts-ignore
      clipboardReplaceEntry.connect('changed', () => {
        tempConfig.replace = clipboardReplaceEntry.text;
      });
      updateClipboardUI();

      const validate = () => {
        let isValid = true;
        if (currentType === 'wallpaper' && !uriEntry.text) isValid = false;

        // Duplication check for actions?
        const hasAction = this.routine.actions.some(
          (ac: any) => ac.type === currentType && ac !== action
        );
        if (hasAction && !customOnSave) isValid = false; // Allow if custom save (editing same action's deactivation)

        addBtn.sensitive = isValid;
      };
      const updateVisibility = () => {
        const selectedType = actionTypes[typeRow.selected].id;
        currentType = selectedType;

        wifiGroup.visible = currentType === 'wifi';
        bluetoothGroup.visible = currentType === 'bluetooth';
        airplaneModeGroup.visible = currentType === 'airplane_mode';
        volumeGroup.visible = currentType === 'volume';
        brightnessGroup.visible = currentType === 'brightness';
        kbBrightnessGroup.visible = currentType === 'keyboard_brightness';
        darkModeGroup.visible = currentType === 'dark_mode';
        nightLightGroup.visible = currentType === 'night_light';
        orientationGroup.visible = currentType === 'screen_orientation';
        refreshRateGroup.visible = currentType === 'refresh_rate';
        timeoutGroup.visible = currentType === 'screen_timeout';
        powerSaverGroup.visible = currentType === 'power_saver';
        clipboardGroup.visible = currentType === 'clipboard';
        openLinkGroup.visible = currentType === 'open_link';
        appGroup.visible = currentType === 'open_app';
        dndGroup.visible = currentType === 'dnd';
        wallpaperGroup.visible = currentType === 'wallpaper';
        screenshotGroup.visible = currentType === 'screenshot';

        // Sub-visibility for Wifi/Bluetooth
        if (currentType === 'wifi') {
          const wifiEnabled = wifiToggle.active;
          wifiSsidRow.visible = wifiEnabled;
          wifiTimeoutRow.visible = wifiEnabled && wifiSsidRow.selected > 0;
          wifiIntervalRow.visible = wifiEnabled && wifiSsidRow.selected > 0;
        }

        if (currentType === 'bluetooth') {
          const btEnabled = bluetoothToggle.active;
          btDeviceRow.visible = btEnabled;
          btTimeoutRow.visible = btEnabled && btDeviceRow.selected > 0;
          btIntervalRow.visible = btEnabled && btDeviceRow.selected > 0;
        }

        // Function Group Logic
        linkEntry.visible = currentType === 'open_link';
        appExpander.visible = currentType === 'open_app';

        validate();
      };

      // @ts-ignore
      typeRow.connect('notify::selected', updateVisibility);
      updateVisibility();

      // @ts-ignore
      addBtn.connect('clicked', () => {
        let finalConfig: any = {};

        if (currentType === 'dnd') {
          finalConfig = { enabled: dndToggle.active };
        } else if (currentType === 'dark_mode') {
          finalConfig = { enabled: darkModeToggle.active };
        } else if (currentType === 'night_light') {
          finalConfig = { enabled: nightLightToggle.active };
        } else if (currentType === 'open_app') {
          finalConfig = { appIds: Array.from(selectedApps) };
        } else if (currentType === 'volume') {
          finalConfig = { level: volumeRow.value };
        } else if (currentType === 'brightness') {
          finalConfig = { level: brightnessRow.value };
        } else if (currentType === 'keyboard_brightness') {
          finalConfig = { level: keyboardBrightnessRow.value };
        } else if (currentType === 'wallpaper') {
          let uri = uriEntry.text;
          if (uri && !uri.startsWith('file://') && !uri.startsWith('http')) {
            uri = `file://${uri}`;
          }
          finalConfig = { uri: uri };
        } else if (currentType === 'open_link') {
          finalConfig = { url: linkEntry.text };
        } else if (currentType === 'wifi') {
          finalConfig = {
            enabled: wifiToggle.active,
            ssid:
              wifiSsidRow.selected > 0
                ? knownSsids[wifiSsidRow.selected - 1]
                : undefined,
            timeout: wifiTimeoutRow.value,
            interval: wifiIntervalRow.value,
          };
        } else if (currentType === 'airplane_mode') {
          finalConfig = { enabled: airplaneToggle.active };
        } else if (currentType === 'bluetooth') {
          finalConfig = {
            enabled: bluetoothToggle.active,
            deviceId:
              btDeviceRow.selected > 0
                ? knownBtDevices[btDeviceRow.selected - 1].id
                : undefined,
            timeout: btTimeoutRow.value,
            interval: btIntervalRow.value,
          };
        } else if (currentType === 'screen_timeout') {
          finalConfig = { seconds: timeoutRow.value };
        } else if (currentType === 'screen_orientation') {
          finalConfig = {
            orientation:
              orientationRow.selected === 0 ? 'portrait' : 'landscape',
          };
        } else if (currentType === 'refresh_rate') {
          finalConfig = { rate: availableRates[refreshRateRow.selected] };
        } else if (currentType === 'power_saver') {
          finalConfig = { enabled: powerToggle.active };
        } else if (currentType === 'clipboard') {
          finalConfig = {
            operation: clipboardOpRow.selected === 1 ? 'replace' : 'clear',
            find: clipboardFindEntry.text,
            replace: clipboardReplaceEntry.text,
          };
        } else if (currentType === 'screenshot') {
          finalConfig = {};
        }

        if (customOnSave) {
          customOnSave(finalConfig);
          navView.pop();
          return;
        }

        action.type = currentType;
        action.config = finalConfig;

        if (isNew) this.routine.actions.push(action);
        refreshActions();
        navView.pop();
      });

      navView.push(page);
    };

    // Track added action rows
    let actionRows: any[] = [];

    const refreshActions = () => {
      actionRows.forEach((row) => actionGroup.remove(row));
      actionRows = [];

      this.routine.actions.forEach((action: any, index: number) => {
        const row = new Adw.ActionRow({
          title: action.type,
          subtitle: getActionSummary(action),
        });

        // Edit on click
        // @ts-ignore
        row.connect('activated', () => editAction(action));
        row.activatable = true;

        const deleteBtn = new Gtk.Button({
          icon_name: 'user-trash-symbolic',
          valign: Gtk.Align.CENTER,
        });
        deleteBtn.add_css_class('flat');
        // @ts-ignore
        deleteBtn.connect('clicked', () => {
          this.routine.actions.splice(index, 1);
          refreshActions();
        });
        row.add_suffix(deleteBtn);
        actionGroup.add(row);
        actionRows.push(row);
      });

      refreshEndActions();
    };

    const addActionBtn = new Gtk.Button({
      label: 'Add what this routine will do',
      margin_top: 10,
    });
    addActionBtn.add_css_class('pill');
    // @ts-ignore
    addActionBtn.connect('clicked', () => {
      const hasDnd = this.routine.actions.some((ac: any) => ac.type === 'dnd');
      const defaultType = hasDnd ? 'wallpaper' : 'dnd';

      const newAction = {
        id: GLib.uuid_string_random(),
        type: defaultType,
        config: {},
      };
      editAction(newAction, true);
    });
    actionGroup.add(addActionBtn);

    // When Routine Ends Section
    const endGroup = new Adw.PreferencesGroup({
      title: 'When routine ends',
      description: 'Choose what happens when this routine stops',
    });
    content.add(endGroup);

    let endRows: any[] = [];

    const refreshEndActions = () => {
      endRows.forEach((row) => endGroup.remove(row));
      endRows = [];

      this.routine.actions.forEach((action: any) => {
        const getEndSummary = () => {
          const type = action.onDeactivate?.type || 'revert';
          if (type === 'revert')
            return 'Return to status before routine started';
          if (type === 'keep') return "Don't change anything";
          if (type === 'custom') {
            if (action.onDeactivate?.config) {
              // Create a dummy action to generate summary
              const dummy = { ...action, config: action.onDeactivate.config };
              return `Custom: ${getActionSummary(dummy)}`;
            }
            return 'Custom: Not configured';
          }
          return '';
        };

        const row = new Adw.ActionRow({
          title: getActionSummary(action), // Show main action as title
          subtitle: getEndSummary(),
        });

        // Dropdown for behavior
        const behaviors = [
          'Return to status before routine started',
          "Don't change anything",
          'Custom (Set action again)',
        ];
        const model = new Gtk.StringList({ strings: behaviors });
        const combo = new Gtk.DropDown({
          model: model,
          valign: Gtk.Align.CENTER,
        });

        // Set initial selection
        const currentType = action.onDeactivate?.type || 'revert';
        if (currentType === 'keep') combo.selected = 1;
        else if (currentType === 'custom') combo.selected = 2;
        else combo.selected = 0;

        // Configure button (only visible for Custom)
        const configBtn = new Gtk.Button({
          icon_name: 'emblem-system-symbolic',
          valign: Gtk.Align.CENTER,
          tooltip_text: 'Configure Custom Action',
          visible: currentType === 'custom',
        });
        configBtn.add_css_class('flat');

        // @ts-ignore
        combo.connect('notify::selected', () => {
          const selected = combo.selected;
          let type: 'revert' | 'keep' | 'custom' = 'revert';
          if (selected === 1) type = 'keep';
          else if (selected === 2) type = 'custom';

          if (!action.onDeactivate) action.onDeactivate = {};
          action.onDeactivate.type = type;

          configBtn.visible = type === 'custom';
          row.subtitle = getEndSummary();

          // Auto-open config if custom selected and no config
          if (type === 'custom' && !action.onDeactivate.config) {
            configBtn.emit('clicked');
          }
        });

        // @ts-ignore
        configBtn.connect('clicked', () => {
          // Open editAction with custom save callback
          // We pass a dummy action with the custom config
          const dummyAction = {
            ...action,
            config: action.onDeactivate?.config || {},
          };

          editAction(dummyAction, false, (newConfig) => {
            if (!action.onDeactivate) action.onDeactivate = { type: 'custom' };
            action.onDeactivate.config = newConfig;
            console.log(
              `[Editor] Saved custom deactivation config for ${action.type}`
            );
            row.subtitle = getEndSummary(); // Update subtitle immediately
          });
        });

        const box = new Gtk.Box({ spacing: 10 });
        box.append(configBtn);
        box.append(combo);
        row.add_suffix(box);

        endGroup.add(row);
        endRows.push(row);
      });
    };

    refreshActions(); // This will call refreshEndActions
    this.window.present();
  }
}
