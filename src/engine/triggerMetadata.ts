import { TriggerType, TriggerStrategy, BatteryTriggerMode } from './types.js';

export interface TriggerMetadata {
  defaultStrategy: TriggerStrategy;
  description?: string; // Optional: helpful for UI tooltips later
  getStrategy?: (config: any) => TriggerStrategy;
}

export const TRIGGER_METADATA: Record<TriggerType, TriggerMetadata> = {
  // System State Triggers - Usually Event Based (state transitions)
  [TriggerType.DND]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },
  [TriggerType.DARK_MODE]: { defaultStrategy: TriggerStrategy.EXISTING_STATE },
  
  // Connectivity - Explicitly Event Based as per user request
  [TriggerType.WIFI]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },
  [TriggerType.BLUETOOTH]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },
  [TriggerType.AIRPLANE_MODE]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },
  [TriggerType.HEADPHONES]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },

  // Hardware/Sensors
  [TriggerType.BATTERY]: { 
      defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY,
      getStrategy: (config: any) => {
          // Dynamic Strategy based on Mode
          if (config?.mode === BatteryTriggerMode.LEVEL) {
              // Safety First: If battery is low on startup, we MUST act.
              return TriggerStrategy.EXISTING_STATE;
          }
          // Status (Charging) - Event Based
          return TriggerStrategy.NEW_CHANGE_ONLY;
      }
  }, 
  
  [TriggerType.POWER_SAVER]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },

  // Time - Inherently "Event" (At 10:00) but some ranges might be persistent.
  [TriggerType.TIME]: { defaultStrategy: TriggerStrategy.EXISTING_STATE },
  
  // App - Event Based (Window Focus)
  [TriggerType.APP]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },

  // Clipboard - Event Based
  [TriggerType.CLIPBOARD]: { defaultStrategy: TriggerStrategy.NEW_CHANGE_ONLY },

  // Startup - Inherently runs on startup
  [TriggerType.STARTUP]: { defaultStrategy: TriggerStrategy.EXISTING_STATE },
};
