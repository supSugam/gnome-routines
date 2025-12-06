export enum TriggerType {
  TIME = 'time',
  APP = 'app',
  WIFI = 'wifi',
  BLUETOOTH = 'bluetooth',
  BATTERY = 'battery',
  POWER_SAVER = 'power_saver',
  DARK_MODE = 'dark_mode',
  AIRPLANE_MODE = 'airplane_mode',
  HEADPHONES = 'headphones',
  CLIPBOARD = 'clipboard',
}

export enum ActionType {
  OPEN_APP = 'open_app',
  NOTIFICATION = 'notification',
  VOLUME = 'volume',
  BRIGHTNESS = 'brightness',
  BLUETOOTH = 'bluetooth',
  WIFI = 'wifi',
  DND = 'dnd',
  WALLPAPER = 'wallpaper',
  KEYBOARD_BRIGHTNESS = 'keyboard_brightness',
  SCREEN_TIMEOUT = 'screen_timeout',
  SCREEN_ORIENTATION = 'screen_orientation',
  REFRESH_RATE = 'refresh_rate',
  NIGHT_LIGHT = 'night_light',
  DARK_MODE = 'dark_mode',
  AIRPLANE_MODE = 'airplane_mode',
  POWER_SAVER = 'power_saver',
  CONNECT_WIFI = 'connect_wifi',
  CONNECT_BLUETOOTH = 'connect_bluetooth',
  DISCONNECT_BLUETOOTH = 'disconnect_bluetooth',
  TAKE_SCREENSHOT = 'take_screenshot',
  CLIPBOARD = 'clipboard',
  OPEN_LINK = 'open_link',
}

// --- Trigger Configs ---

export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

export interface TimeTriggerConfig {
  time?: string;
  startTime?: string;
  endTime?: string;
  days: number[];
}

export interface AppTriggerConfig {
  appIds: string[];
}

export interface WifiTriggerConfig {
  state: ConnectionState;
  ssids?: string[];
}

export interface BluetoothTriggerConfig {
  state: ConnectionState;
  deviceIds?: string[];
}

export enum BatteryTriggerMode {
  STATUS = 'status',
  LEVEL = 'level',
}

export enum BatteryStatus {
  CHARGING = 'charging',
  DISCHARGING = 'discharging',
  FULL = 'full',
}

export enum LevelComparison {
  ABOVE = 'above',
  BELOW = 'below',
}

export interface BatteryTriggerConfig {
  mode: BatteryTriggerMode;
  status?: BatteryStatus;
  level?: number;
  levelType?: LevelComparison;
}

export interface SystemTriggerConfig {
  type:
    | TriggerType.POWER_SAVER
    | TriggerType.DARK_MODE
    | TriggerType.AIRPLANE_MODE
    | TriggerType.HEADPHONES;
  state:
    | boolean
    | 'plugged'
    | 'unplugged'
    | 'on'
    | 'off'
    | 'connected'
    | 'disconnected';
}

export interface ClipboardTriggerConfig {
  // No config needed for now, just detects change
}

export type TriggerConfig =
  | TimeTriggerConfig
  | AppTriggerConfig
  | WifiTriggerConfig
  | BluetoothTriggerConfig
  | BatteryTriggerConfig
  | SystemTriggerConfig
  | ClipboardTriggerConfig;

export enum TriggerStrategy {
  STATE_PERSISTENT = 'state_persistent', // Run actions on startup if state matches (e.g. Time)
  EVENT_CHANGE = 'event_change', // Only run on state change, ignore startup (e.g. Clipboard)
  INITIAL_IGNORE = 'initial_ignore', // Like Event, explicitly ignores first check (e.g. Bluetooth)
}
// Note: EVENT_CHANGE and INITIAL_IGNORE are similar.
// User specific request: "Bluetooth... not trigger if status was already from before".
// "Time... need to tune in".

export interface Trigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  isActive: boolean;
  strategy?: TriggerStrategy; // New property
  check(): Promise<boolean> | boolean;
  on(event: 'activate' | 'deactivate', callback: () => void): void;
}

// --- Action Configs ---

export interface OpenAppActionConfig {
  appIds: string[];
}

export interface NotificationActionConfig {
  title: string;
  message: string;
}

export interface VolumeActionConfig {
  level: number;
}

export interface BrightnessActionConfig {
  level: number;
}

export interface BinaryStateActionConfig {
  enabled: boolean;
}

export interface WallpaperActionConfig {
  uri: string;
}

export interface ScreenTimeoutActionConfig {
  seconds: number;
}

export enum ScreenOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  NORMAL = 'normal',
  RIGHT = 'right',
  LEFT = 'left',
  UPSIDE_DOWN = 'upside-down',
}

export interface ScreenOrientationActionConfig {
  orientation: ScreenOrientation;
}

export interface RefreshRateActionConfig {
  rate: number;
}

export interface ConnectWifiActionConfig {
  ssid: string;
}

export interface ConnectBluetoothActionConfig {
  deviceId: string;
}

export interface OpenLinkActionConfig {
  url: string;
}

export enum SanitizationMode {
  PREDEFINED = 'predefined',
  MERGE = 'merge',
  CUSTOM = 'custom',
}

export enum ClipboardOperation {
  CLEAR = 'clear',
  REPLACE = 'replace',
  NONE = 'none',
}

export interface ClipboardActionConfig {
  operation: ClipboardOperation;
  find?: string;
  replace?: string;
  sanitize?: boolean;
  sanitizeConfig?: {
    mode: SanitizationMode;
    domainRules?: { domain: string; params: string[] }[];
  };
}

export type ActionConfig =
  | OpenAppActionConfig
  | NotificationActionConfig
  | VolumeActionConfig
  | BrightnessActionConfig
  | BinaryStateActionConfig
  | WallpaperActionConfig
  | ScreenTimeoutActionConfig
  | ScreenOrientationActionConfig
  | RefreshRateActionConfig
  | ConnectWifiActionConfig
  | ConnectBluetoothActionConfig
  | OpenLinkActionConfig
  | ClipboardActionConfig
  | Record<string, any>; // Fallback for now

export enum DeactivateStrategy {
  REVERT = 'revert',
  KEEP = 'keep',
  CUSTOM = 'custom',
}

export interface OnDeactivateConfig {
  type: DeactivateStrategy;
  config?: ActionConfig;
}

export interface Action {
  id: string;
  type: ActionType;
  config: ActionConfig;
  onDeactivate?: OnDeactivateConfig;
  execute(): Promise<void> | void;
  revert?(): Promise<void> | void;
}

export enum RoutineMatchType {
  ANY = 'any',
  ALL = 'all',
}

export interface Routine {
  id: string;
  name: string;
  enabled: boolean;
  matchType: RoutineMatchType;
  triggers: Trigger[];
  actions: Action[];
  isActive?: boolean;
}

export interface RoutineManagerInterface {
  addRoutine(routine: Routine): void;
  removeRoutine(id: string): void;
  getRoutine(id: string): Routine | undefined;
  evaluate(): void;
  getRoutineHealth(id: string): RoutineState;
}

// --- Safety & Health Types ---

export enum ResourceType {
  WIFI = 'resource_wifi',
  BLUETOOTH = 'resource_bluetooth',
  DISPLAY_BRIGHTNESS = 'resource_display_brightness',
  VOLUME = 'resource_audio_volume',
  WALLPAPER = 'resource_wallpaper',
  POWER_SAVER = 'resource_power_saver',
  DARK_MODE = 'resource_dark_mode',
  AIRPLANE_MODE = 'resource_airplane_mode',
  DND = 'resource_dnd',
  NIGHT_LIGHT = 'resource_night_light',
  SCREEN_TIMEOUT = 'resource_screen_timeout',
  SCREEN_ORIENTATION = 'resource_screen_orientation',
}

export const ACTION_RESOURCE_MAP: Record<ActionType, ResourceType[]> = {
  [ActionType.WIFI]: [ResourceType.WIFI],
  [ActionType.CONNECT_WIFI]: [ResourceType.WIFI],
  [ActionType.BLUETOOTH]: [ResourceType.BLUETOOTH],
  [ActionType.CONNECT_BLUETOOTH]: [ResourceType.BLUETOOTH],
  [ActionType.DISCONNECT_BLUETOOTH]: [ResourceType.BLUETOOTH],
  [ActionType.BRIGHTNESS]: [ResourceType.DISPLAY_BRIGHTNESS],
  [ActionType.KEYBOARD_BRIGHTNESS]: [ResourceType.DISPLAY_BRIGHTNESS], // Assuming shared? Or separate
  [ActionType.VOLUME]: [ResourceType.VOLUME],
  [ActionType.WALLPAPER]: [ResourceType.WALLPAPER],
  [ActionType.POWER_SAVER]: [ResourceType.POWER_SAVER],
  [ActionType.DARK_MODE]: [ResourceType.DARK_MODE],
  [ActionType.AIRPLANE_MODE]: [ResourceType.AIRPLANE_MODE],
  [ActionType.DND]: [ResourceType.DND],
  [ActionType.NIGHT_LIGHT]: [ResourceType.NIGHT_LIGHT],
  [ActionType.SCREEN_TIMEOUT]: [ResourceType.SCREEN_TIMEOUT],
  [ActionType.SCREEN_ORIENTATION]: [ResourceType.SCREEN_ORIENTATION],
  // Actions that don't lock resources: Open App, Notification, Screenshot, Clipboard (maybe?)
  [ActionType.OPEN_APP]: [],
  [ActionType.NOTIFICATION]: [],
  [ActionType.TAKE_SCREENSHOT]: [],
  [ActionType.CLIPBOARD]: [], // Could argue clipboard is a resource, but multiple writes usually unlikely to "conflict" in a damaging way compared to hardware toggles
  [ActionType.OPEN_LINK]: [],
  [ActionType.REFRESH_RATE]: [],
};

// Fix for keyboard brightness if not in enum properly or special handling
// Actually ActionType has KEYBOARD_BRIGHTNESS

export enum RoutineHealth {
  OK = 'ok',
  WARNING = 'warning',
  ERROR = 'error',
  UNKNOWN = 'unknown',
}

export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  WARNING = 'warning',
}

export enum ExecutionType {
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  CHECK = 'check',
}

export interface ExecutionLog {
  timestamp: number;
  type: ExecutionType;
  status: ExecutionStatus;
  message?: string;
}

export interface RoutineState {
  health: RoutineHealth;
  lastRun: number;
  lastError?: string;
  runCount: number;
  failureCount: number;
  history: ExecutionLog[];
}

// --- Import/Export Types ---

export interface RoutineExport {
  version: number;
  timestamp: number;
  source: 'gnome-routines';
  routines: RoutineExportData[];
}

export interface RoutineExportData {
  name: string;
  enabled: boolean;
  matchType: RoutineMatchType;
  triggers: {
    type: TriggerType;
    config: TriggerConfig;
    strategy?: TriggerStrategy;
  }[];
  actions: {
    type: ActionType;
    config: ActionConfig;
    onDeactivate?: OnDeactivateConfig;
  }[];
}
