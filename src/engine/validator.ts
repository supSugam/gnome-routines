import {
  Routine,
  RoutineMatchType,
  TriggerType,
  WifiTriggerConfig,
  BluetoothTriggerConfig,
  ConnectionState,
} from './types.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class RoutineValidator {
  static validate(routine: Routine): ValidationResult {
    if (!routine.triggers || routine.triggers.length === 0) {
      return { valid: true }; // Allow empty triggers? Maybe not, but let's focus on conflicts.
    }

    if (routine.matchType === RoutineMatchType.ALL) {
      // 1. Check for conflicting Wifi States
      const wifiTriggers = routine.triggers.filter(
        (t) => t.type === TriggerType.WIFI
      );

      if (wifiTriggers.length > 1) {
        const hasConnect = wifiTriggers.some(
          (t) =>
            (t.config as WifiTriggerConfig).state === ConnectionState.CONNECTED
        );
        const hasDisconnect = wifiTriggers.some(
          (t) =>
            (t.config as WifiTriggerConfig).state ===
            ConnectionState.DISCONNECTED
        );
        const hasEnabled = wifiTriggers.some(
          (t) =>
            (t.config as WifiTriggerConfig).state === ConnectionState.ENABLED
        );
        const hasDisabled = wifiTriggers.some(
          (t) =>
            (t.config as WifiTriggerConfig).state === ConnectionState.DISABLED
        );

        if (hasConnect && hasDisconnect) {
          return {
            valid: false,
            error:
              'A routine cannot match ALL triggers if it requires both Wi-Fi Connected AND Disconnected state simultaneously.',
          };
        }

        if (hasEnabled && hasDisabled) {
          return {
            valid: false,
            error:
              'A routine cannot match ALL triggers if it requires both Wi-Fi Enabled AND Disabled state simultaneously.',
          };
        }

        // Also Connected vs Disabled is impossible
        if (hasConnect && hasDisabled) {
          return {
            valid: false,
            error:
              'A routine cannot match ALL triggers if it requires both Wi-Fi Connected AND Disabled state simultaneously.',
          };
        }
      }

      // 2. Check for conflicting Bluetooth States
      const btTriggers = routine.triggers.filter(
        (t) => t.type === TriggerType.BLUETOOTH
      );

      if (btTriggers.length > 1) {
        // Bluetooth Logic is similar but allows multiple devices.
        // Connected to A AND Connected to B is valid.
        // Connected to A AND Disconnected from A is invalid.
        // Connected via BT and Disabled BT is invalid.

        const hasEnabled = btTriggers.some(
          (t) =>
            (t.config as BluetoothTriggerConfig).state ===
            ConnectionState.ENABLED
        );
        const hasDisabled = btTriggers.some(
          (t) =>
            (t.config as BluetoothTriggerConfig).state ===
            ConnectionState.DISABLED
        );

        if (hasEnabled && hasDisabled) {
          return {
            valid: false,
            error:
              'A routine cannot match ALL triggers if it requires both Bluetooth Enabled AND Disabled state simultaneously.',
          };
        }

        // Check Conflicts per Device
        // If we require Connected to Device A AND Disconnected from Device A -> Impossible
        // We need to iterate configs
        const connectConfigs = btTriggers.filter(
          (t) =>
            (t.config as BluetoothTriggerConfig).state ===
            ConnectionState.CONNECTED
        );
        const disconnectConfigs = btTriggers.filter(
          (t) =>
            (t.config as BluetoothTriggerConfig).state ===
            ConnectionState.DISCONNECTED
        );

        for (const conn of connectConfigs) {
          const cConf = conn.config as BluetoothTriggerConfig;

          if (!cConf.deviceIds || cConf.deviceIds.length === 0) continue; // Any device

          for (const disc of disconnectConfigs) {
            const dConf = disc.config as BluetoothTriggerConfig;

            if (!dConf.deviceIds || dConf.deviceIds.length === 0) {
              return {
                valid: false,
                error: `Conflict: Must be connected to ${cConf.deviceIds.join(', ')} BUT also Disconnected from Any Bluetooth Device via ALL match.`,
              };
            }

            // Check intersection
            const conflict = cConf.deviceIds.some((id) =>
              dConf.deviceIds?.includes(id)
            );

            if (conflict) {
              return {
                valid: false,
                error:
                  'Conflict: Cannot require both Connected AND Disconnected state for the same Bluetooth device in ALL match.',
              };
            }
          }
        }
      }
    }

    return { valid: true };
  }
}
