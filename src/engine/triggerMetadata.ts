import { TriggerType, TriggerStrategy, BatteryTriggerMode } from './types.js';

export interface TriggerMetadata {
  defaultStrategy: TriggerStrategy;
  description?: string; // Optional: helpful for UI tooltips later
  getStrategy?: (config: any) => TriggerStrategy;
  canAllowRevert?: boolean | ((config: any) => boolean); // If true (or function returns true), supports revert.
}

export const TRIGGER_METADATA: Record<TriggerType, TriggerMetadata> = {
  // System State Triggers
  [TriggerType.DND]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
  },
  [TriggerType.DARK_MODE]: {
    defaultStrategy: TriggerStrategy.EXISTING_STATE,
    canAllowRevert: true,
  },

  // Connectivity
  [TriggerType.WIFI]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
  },
  [TriggerType.BLUETOOTH]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
  },
  [TriggerType.AIRPLANE_MODE]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
  },
  [TriggerType.HEADPHONES]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
  },

  // Hardware/Sensors
  [TriggerType.BATTERY]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
    getStrategy: (config: any) => {
      if (config?.mode === BatteryTriggerMode.LEVEL) {
        return TriggerStrategy.EXISTING_STATE;
      }
      return TriggerStrategy.NEW_CHANGE_ONLY;
    },
  },

  [TriggerType.POWER_SAVER]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
  },

  // Time - Dynamic Revert logic
  [TriggerType.TIME]: {
    defaultStrategy: TriggerStrategy.EXISTING_STATE,
    canAllowRevert: (config: any) => {
      // If startTime/endTime exists, it's a Period (Stateful) -> Allow Revert
      // If only 'time' exists, it's Specific Time (Event) -> No Revert
      return !!(config?.startTime && config?.endTime);
    },
  },

  // App
  [TriggerType.APP]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: true,
  },

  // One-shot triggers (No revert)
  [TriggerType.CLIPBOARD]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: false,
  },
  [TriggerType.STARTUP]: {
    defaultStrategy: TriggerStrategy.EXISTING_STATE,
    canAllowRevert: false,
  },
  [TriggerType.INTERVAL]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: false,
  },
  [TriggerType.WALLPAPER]: {
    defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
    canAllowRevert: false,
  },
};
