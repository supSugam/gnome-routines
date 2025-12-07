import {
  Trigger,
  Action,
  TriggerType,
  ActionType,
  TimeTriggerConfig,
  AppTriggerConfig,
  WifiTriggerConfig,
  BluetoothTriggerConfig,
  BatteryTriggerConfig,
  OpenAppActionConfig,
  BinaryStateActionConfig,
  ConnectBluetoothActionConfig,
  ConnectWifiActionConfig,
  VolumeActionConfig,
  BrightnessActionConfig,
  WallpaperActionConfig,
  ScreenTimeoutActionConfig,
  ScreenOrientationActionConfig,
  OpenLinkActionConfig,
  NotificationActionConfig,
  ClipboardActionConfig,
  ClipboardOperation,
  ConnectionState,
  BatteryTriggerMode,
  LevelComparison,
  BatteryStatus,
} from '../../engine/types.js';

export const getTriggerSummary = (trigger: Trigger): string => {
  if (trigger.type === TriggerType.TIME) {
    const config = trigger.config as TimeTriggerConfig;
    const days = config.days || [];
    let dayText = '';
    if (days.length === 7) dayText = 'every day';
    else if (days.length === 0) dayText = 'never';
    else if (days.length === 5 && !days.includes(0) && !days.includes(6))
      dayText = 'on weekdays';
    else if (days.length === 2 && days.includes(0) && days.includes(6))
      dayText = 'on weekends';
    else
      dayText =
        'on ' +
        days
          .map(
            (d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
          )
          .join(', ');

    if (config.time) return `At ${config.time} ${dayText}`;
    if (config.startTime)
      return `From ${config.startTime} to ${config.endTime} ${dayText}`;
  }

  if (trigger.type === TriggerType.APP) {
    const config = trigger.config as AppTriggerConfig;
    const count = config.appIds ? config.appIds.length : 0;
    if (count === 0) return 'When an app is opened';
    if (count === 1) return `When ${config.appIds[0]} is opened`; // Ideally we'd map ID to Name
    return `When any of ${count} selected apps are opened`;
  }

  if (trigger.type === TriggerType.WIFI) {
    const config = trigger.config as WifiTriggerConfig;
    const ssids = config.ssids || [];
    let state = 'connected';
    if (config.state === ConnectionState.DISCONNECTED) state = 'disconnected';
    else if (config.state === ConnectionState.ENABLED) state = 'turned on';
    else if (config.state === ConnectionState.DISABLED) state = 'turned off';

    if (ssids.length > 0) {
      if (ssids.length === 1) return `When Wifi is ${state} (${ssids[0]})`;
      return `When Wifi is ${state} (${ssids.length} networks)`;
    }
    return `When Wifi is ${state}`;
  }

  if (trigger.type === TriggerType.BLUETOOTH) {
    const config = trigger.config as BluetoothTriggerConfig;
    const devices = config.deviceIds || [];
    let state = 'connected';
    if (config.state === ConnectionState.DISCONNECTED) state = 'disconnected';
    else if (config.state === ConnectionState.ENABLED) state = 'turned on';
    else if (config.state === ConnectionState.DISABLED) state = 'turned off';

    if (devices.length > 0) {
      return `When Bluetooth is ${state} (${devices.length} devices)`;
    }
    return `When Bluetooth is ${state}`;
  }

  if (trigger.type === TriggerType.BATTERY) {
    const config = trigger.config as BatteryTriggerConfig;
    if (config.mode === BatteryTriggerMode.STATUS) {
      const status = config.status || 'unknown';
      return `When battery is ${status}`;
    }
    const comparison =
      config.levelType === LevelComparison.BELOW
        ? 'below'
        : 'above or equal to';
    return `When battery is ${comparison} ${config.level}%`;
  }

  if (trigger.type === TriggerType.POWER_SAVER) {
    const config = trigger.config as any;
    return `When Battery Saver is ${formatState(config.state).toLowerCase()}`;
  }

  if (trigger.type === TriggerType.DARK_MODE) {
    const config = trigger.config as any;
    return `When Dark Mode is ${formatState(config.state).toLowerCase()}`;
  }

  if (trigger.type === TriggerType.AIRPLANE_MODE) {
    const config = trigger.config as any;
    return `When Airplane Mode is ${formatState(config.state).toLowerCase()}`;
  }

  if (trigger.type === TriggerType.HEADPHONES) {
    const config = trigger.config as any;
    const state =
      config.state === true || config.state === 'plugged'
        ? 'plugged in'
        : 'unplugged';
    return `When headphones are ${state}`;
  }

  if (trigger.type === TriggerType.CLIPBOARD) {
    return 'When clipboard content changes';
  }

  return formatType(trigger.type);
};

export const getActionSummary = (action: Action): string => {
  if (action.type === ActionType.DND) {
    const config = action.config as BinaryStateActionConfig;
    return config.enabled === false
      ? 'Disable Do Not Disturb'
      : 'Enable Do Not Disturb';
  }
  if (action.type === ActionType.BLUETOOTH) {
    const config = action.config as BinaryStateActionConfig;
    return config.enabled === false ? 'Disable Bluetooth' : 'Enable Bluetooth';
  }
  if (action.type === ActionType.WIFI) {
    const config = action.config as BinaryStateActionConfig;
    return config.enabled === false ? 'Turn off Wifi' : 'Turn on Wifi';
  }
  if (action.type === ActionType.AIRPLANE_MODE) {
    const config = action.config as BinaryStateActionConfig;
    return config.enabled === false
      ? 'Disable Airplane Mode'
      : 'Enable Airplane Mode';
  }
  if (action.type === ActionType.CONNECT_BLUETOOTH) {
    const config = action.config as ConnectBluetoothActionConfig;
    return `Connect to Bluetooth device: ${config.deviceId}`;
  }
  if (action.type === ActionType.DISCONNECT_BLUETOOTH) {
    const config = action.config as ConnectBluetoothActionConfig;
    return `Disconnect from Bluetooth device: ${config.deviceId}`;
  }
  if (action.type === ActionType.CONNECT_WIFI) {
    const config = action.config as ConnectWifiActionConfig;
    return `Connect to Wifi network: ${config.ssid}`;
  }
  if (action.type === ActionType.VOLUME) {
    const config = action.config as VolumeActionConfig;
    return `Set volume to ${config.level}%`;
  }
  if (action.type === ActionType.BRIGHTNESS) {
    const config = action.config as BrightnessActionConfig;
    return `Set brightness to ${config.level}%`;
  }
  if (action.type === ActionType.KEYBOARD_BRIGHTNESS) {
    const config = action.config as BrightnessActionConfig;
    return `Set keyboard brightness to ${config.level}%`;
  }
  if (action.type === ActionType.WALLPAPER) {
    const config = action.config as WallpaperActionConfig;
    const filename = config.uri ? config.uri.split('/').pop() : 'Unknown';
    return `Set wallpaper to ${filename}`;
  }
  if (action.type === ActionType.DARK_MODE) {
    const config = action.config as BinaryStateActionConfig;
    return config.enabled ? 'Enable Dark Mode' : 'Disable Dark Mode';
  }
  if (action.type === ActionType.NIGHT_LIGHT) {
    const config = action.config as BinaryStateActionConfig;
    return config.enabled ? 'Enable Night Light' : 'Disable Night Light';
  }
  if (action.type === ActionType.POWER_SAVER) {
    const config = action.config as BinaryStateActionConfig;
    return config.enabled ? 'Enable Power Saver' : 'Disable Power Saver';
  }
  if (action.type === ActionType.SCREEN_TIMEOUT) {
    const config = action.config as ScreenTimeoutActionConfig;
    return `Set screen timeout to ${config.seconds} seconds`;
  }
  if (action.type === ActionType.SCREEN_ORIENTATION) {
    const config = action.config as ScreenOrientationActionConfig;
    return `Set screen orientation to ${formatType(config.orientation)}`;
  }
  if (action.type === ActionType.OPEN_LINK) {
    const config = action.config as OpenLinkActionConfig;
    return `Open link: ${config.url}`;
  }
  if (action.type === ActionType.OPEN_APP) {
    const config = action.config as OpenAppActionConfig;
    const count = config.appIds?.length || 0;
    return `Open ${count} application${count === 1 ? '' : 's'}`;
  }
  if (action.type === ActionType.TAKE_SCREENSHOT) return 'Take a screenshot';
  if (action.type === ActionType.NOTIFICATION) {
    const config = action.config as NotificationActionConfig;
    return `Send notification: "${config.title}"`;
  }
  if (action.type === ActionType.CLIPBOARD) {
    const config = action.config as ClipboardActionConfig;
    const { operation, sanitize } = config;
    if (operation === ClipboardOperation.CLEAR)
      return 'Clear clipboard contents';
    if (operation === ClipboardOperation.REPLACE)
      return 'Find and replace text in clipboard';
    if (sanitize) return 'Sanitize links in clipboard';
    return 'Manage clipboard capabilities';
  }

  return formatType(action.type);
};

export const getTriggerTitle = (type: string): string => {
  const titles: Record<string, string> = {
    [TriggerType.TIME]: 'Time',
    [TriggerType.APP]: 'App Opened',
    [TriggerType.WIFI]: 'Wifi Status',
    [TriggerType.BLUETOOTH]: 'Bluetooth Status',
    [TriggerType.BATTERY]: 'Battery Level',
    [TriggerType.POWER_SAVER]: 'Battery Saver',
    [TriggerType.DARK_MODE]: 'Dark Mode',
    [TriggerType.AIRPLANE_MODE]: 'Airplane Mode',
    [TriggerType.HEADPHONES]: 'Wired Headphones',
    [TriggerType.CLIPBOARD]: 'Clipboard Change',
  };
  return titles[type] || formatType(type);
};

export const getActionTitle = (type: string): string => {
  const titles: Record<string, string> = {
    [ActionType.OPEN_APP]: 'Open App',
    [ActionType.WIFI]: 'Wifi Control',
    [ActionType.CONNECT_WIFI]: 'Connect to Wifi',
    [ActionType.BLUETOOTH]: 'Bluetooth Control',
    [ActionType.CONNECT_BLUETOOTH]: 'Connect Bluetooth',
    [ActionType.DISCONNECT_BLUETOOTH]: 'Disconnect Bluetooth',
    [ActionType.DND]: 'Do Not Disturb',
    [ActionType.AIRPLANE_MODE]: 'Airplane Mode',
    [ActionType.VOLUME]: 'Set Volume',
    [ActionType.BRIGHTNESS]: 'Set Brightness',
    [ActionType.KEYBOARD_BRIGHTNESS]: 'Set Keyboard Brightness',
    [ActionType.WALLPAPER]: 'Set Wallpaper',
    [ActionType.DARK_MODE]: 'Dark Mode',
    [ActionType.NIGHT_LIGHT]: 'Night Light',
    [ActionType.POWER_SAVER]: 'Power Saver',
    [ActionType.SCREEN_TIMEOUT]: 'Screen Timeout',
    [ActionType.SCREEN_ORIENTATION]: 'Screen Orientation',
    [ActionType.TAKE_SCREENSHOT]: 'Take Screenshot',
    [ActionType.NOTIFICATION]: 'Send Notification',
    [ActionType.CLIPBOARD]: 'Manage Clipboard',
    [ActionType.OPEN_LINK]: 'Open Link',
  };
  return titles[type] || formatType(type);
};

const formatState = (state: any): string => {
  if (
    state === true ||
    state === 'on' ||
    state === ConnectionState.CONNECTED ||
    state === 'plugged'
  ) {
    return 'On';
  }
  if (
    state === false ||
    state === 'off' ||
    state === ConnectionState.DISCONNECTED ||
    state === 'unplugged'
  ) {
    return 'Off';
  }
  return formatType(String(state));
};

const formatType = (type: string): string => {
  return type
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
