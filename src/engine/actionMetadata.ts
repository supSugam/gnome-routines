import { ActionType } from './types.js';

export interface ActionMetadata {
  canRevert: boolean;
}

export const ACTION_METADATA: Record<ActionType, ActionMetadata> = {
  [ActionType.OPEN_APP]: { canRevert: false },
  [ActionType.NOTIFICATION]: { canRevert: false },
  [ActionType.VOLUME]: { canRevert: true },
  [ActionType.BRIGHTNESS]: { canRevert: true },
  [ActionType.BLUETOOTH]: { canRevert: true },
  [ActionType.WIFI]: { canRevert: true },
  [ActionType.DND]: { canRevert: true },
  [ActionType.WALLPAPER]: { canRevert: true },
  [ActionType.KEYBOARD_BRIGHTNESS]: { canRevert: true },
  [ActionType.SCREEN_TIMEOUT]: { canRevert: true },
  [ActionType.SCREEN_ORIENTATION]: { canRevert: true },
  [ActionType.REFRESH_RATE]: { canRevert: true },
  [ActionType.NIGHT_LIGHT]: { canRevert: true },
  [ActionType.DARK_MODE]: { canRevert: true },
  [ActionType.AIRPLANE_MODE]: { canRevert: true },
  [ActionType.POWER_SAVER]: { canRevert: true },
  [ActionType.CONNECT_WIFI]: { canRevert: true },
  [ActionType.CONNECT_BLUETOOTH]: { canRevert: true },
  [ActionType.DISCONNECT_BLUETOOTH]: { canRevert: true },
  [ActionType.TAKE_SCREENSHOT]: { canRevert: false },
  [ActionType.CLIPBOARD]: { canRevert: false },
  [ActionType.OPEN_LINK]: { canRevert: false },
};
