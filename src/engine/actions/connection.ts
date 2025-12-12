// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ActionType } from '../types.js';

const delay = (ms: number) =>
  new Promise((resolve) => {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      resolve(null);
      return GLib.SOURCE_REMOVE;
    });
  });

export class WifiAction extends BaseAction {
  private initialState: boolean | null = null;
  private initialSsid: string | null = null;

  constructor(
    id: string,
    config: {
      enabled: boolean;
      ssid?: string;
      timeout?: number;
      interval?: number;
    },
    adapter: SystemAdapter
  ) {
    super(id, ActionType.WIFI, config, adapter);
  }

  async execute(): Promise<void> {
    // Capture state if not already captured (to avoid overwriting on re-execution if not reverted)
    if (this.initialState === null) {
      this.initialState = this.adapter.getWifiState();
      this.initialSsid = this.adapter.getCurrentWifiSSID();
    }

    this.adapter.setWifi(this.config.enabled);

    if (this.config.enabled && this.config.ssid) {
      const timeout = (this.config.timeout || 30) * 1000;
      const interval = (this.config.interval || 5) * 1000;
      const startTime = Date.now();

      debugLog('[WifiAction] Starting auto-connect to ' + this.config.ssid);

      // Initial attempt
      this.adapter.connectToWifi(this.config.ssid);

      while (Date.now() - startTime < timeout) {
        await delay(interval);

        const currentSSID = this.adapter.getCurrentWifiSSID();
        if (currentSSID === this.config.ssid) {
          debugLog(
            '[WifiAction] Successfully connected to ' + this.config.ssid
          );
          return;
        }

        debugLog(
          '[WifiAction] Retrying connection to ' + this.config.ssid + '...'
        );
        this.adapter.connectToWifi(this.config.ssid);
      }
      console.warn('[WifiAction] Timed out connecting to ' + this.config.ssid);
    }
  }

  async revert(): Promise<void> {
    if (this.initialState !== null) {
      debugLog(
        `[WifiAction] Reverting state. Enabled: ${this.initialState}, SSID: ${this.initialSsid}`
      );
      this.adapter.setWifi(this.initialState);
      if (this.initialState && this.initialSsid) {
        // If it was on and connected, try to reconnect
        // We don't wait for it, just trigger
        this.adapter.connectToWifi(this.initialSsid);
      }
      // Reset state capture
      this.initialState = null;
      this.initialSsid = null;
    } else {
      // Fallback if no state captured (shouldn't happen if executed)
      this.adapter.setWifi(!this.config.enabled);
    }
  }
}

export class BluetoothAction extends BaseAction {
  private initialState: boolean | null = null;
  // Bluetooth is complex, capturing "connected device" is hard because multiple can be connected.
  // We'll capture enabled state.
  // If user wants to restore connection, we might need to capture list of connected devices?
  // User said: "if on then connected to previously connected network if available" (referring to Wifi).
  // For Bluetooth, let's try to restore enabled state. Reconnecting to specific devices might be tricky without knowing which one was "primary".
  // But we can try to capture connected devices and reconnect them?
  // Let's stick to enabled state for now, as Bluetooth auto-connect usually handles known devices.

  constructor(
    id: string,
    config: {
      enabled: boolean;
      deviceId?: string;
      timeout?: number;
      interval?: number;
    },
    adapter: SystemAdapter
  ) {
    super(id, ActionType.BLUETOOTH, config, adapter);
  }

  async execute(): Promise<void> {
    if (this.initialState === null) {
      this.initialState = await this.adapter.getBluetooth();
    }

    await this.adapter.setBluetooth(this.config.enabled);

    if (this.config.enabled && this.config.deviceId) {
      const timeout = (this.config.timeout || 30) * 1000;
      const interval = (this.config.interval || 5) * 1000;
      const startTime = Date.now();

      debugLog(
        '[BluetoothAction] Starting auto-connect to ' + this.config.deviceId
      );

      // Initial attempt
      await this.adapter.connectBluetoothDevice(this.config.deviceId);

      while (Date.now() - startTime < timeout) {
        await delay(interval);

        const connectedDevices =
          await this.adapter.getConnectedBluetoothDevices();

        // Robust matching: check name OR address
        const isConnected = connectedDevices.some(
          (d) =>
            d.name === this.config.deviceId ||
            d.address === this.config.deviceId ||
            d.name.includes(this.config.deviceId!)
        );

        if (isConnected) {
          debugLog(
            '[BluetoothAction] Successfully connected to ' +
              this.config.deviceId
          );
          return;
        }

        debugLog(
          '[BluetoothAction] Retrying connection to ' +
            this.config.deviceId +
            '...'
        );
        await this.adapter.connectBluetoothDevice(this.config.deviceId);
      }
      console.warn(
        '[BluetoothAction] Timed out connecting to ' + this.config.deviceId
      );
    }
  }

  async revert(): Promise<void> {
    if (this.initialState !== null) {
      await this.adapter.setBluetooth(this.initialState);
      this.initialState = null;
    } else {
      await this.adapter.setBluetooth(!this.config.enabled);
    }
  }
}

// Deprecated - kept for backward compatibility if needed, but ActionFactory should handle migration
export class BluetoothDeviceAction extends BaseAction {
  constructor(
    id: string,
    config: { deviceId: string; action: 'connect' | 'disconnect' },
    adapter: SystemAdapter
  ) {
    super(id, 'bluetooth_device' as any, config, adapter);
  }

  async execute(): Promise<void> {
    if (this.config.action === 'connect') {
      this.adapter.connectBluetoothDevice(this.config.deviceId);
    } else {
      this.adapter
        .disconnectBluetoothDevice(this.config.deviceId)
        .catch((e) => console.error(e));
    }
  }

  async revert(): Promise<void> {
    const isPowered = await this.adapter.getBluetoothPowerState();
    if (!isPowered) {
      debugLog(
        `[BluetoothDeviceAction] Skipping revert for ${this.config.deviceId} because Bluetooth is OFF.`
      );
      return;
    }

    if (this.config.action === 'connect') {
      this.adapter
        .disconnectBluetoothDevice(this.config.deviceId)
        .catch((e) => console.error(e));
    } else {
      this.adapter
        .connectBluetoothDevice(this.config.deviceId)
        .catch((e) => console.error(e));
    }
  }
}

export class AirplaneModeAction extends BaseAction {
  constructor(
    id: string,
    config: { enabled: boolean },
    adapter: SystemAdapter
  ) {
    super(id, ActionType.AIRPLANE_MODE, config, adapter);
  }

  async execute(): Promise<void> {
    this.adapter.setAirplaneMode(this.config.enabled);
  }

  async revert(): Promise<void> {
    this.adapter.setAirplaneMode(!this.config.enabled);
  }
}
