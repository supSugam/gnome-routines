// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import {
  ActionType,
  ConnectWifiActionConfig,
  ConnectBluetoothActionConfig,
  BluetoothDeviceActionConfig,
  ActionOperation,
} from '../types.js';
import { RETRY_DEFAULTS } from '../constants.js';

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
    config: ConnectWifiActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.WIFI, config, adapter);
  }

  async execute(): Promise<void> {
    // Capture state if not already captured
    if (this.initialState === null) {
      this.initialState = this.adapter.getWifiState();
      this.initialSsid = this.adapter.getCurrentWifiSSID();
    }

    // Default to true if undefined (legacy/connect_wifi compatibility)
    const shouldEnable = this.config.enabled !== false;

    this.adapter.setWifi(shouldEnable);

    if (shouldEnable && this.config.ssid) {
      const timeoutMs =
        (this.config.timeout || RETRY_DEFAULTS.TIMEOUT.DEFAULT) * 1000;
      const intervalMs =
        (this.config.interval || RETRY_DEFAULTS.INTERVAL.DEFAULT) * 1000;
      const startTime = Date.now();

      debugLog(
        `[WifiAction] Auto-connecting to ${this.config.ssid}. Timeout: ${
          timeoutMs / 1000
        }s, Interval: ${intervalMs / 1000}s`
      );

      // Attempt loop: Try at 0, interval, ..., timeout (inclusive)

      while (true) {
        // Attempt
        const currentSSID = this.adapter.getCurrentWifiSSID();
        if (currentSSID === this.config.ssid) {
          debugLog(
            '[WifiAction] Successfully connected to ' + this.config.ssid
          );
          return;
        }

        debugLog(
          '[WifiAction] Attempting connection to ' + this.config.ssid + '...'
        );
        this.adapter.connectToWifi(this.config.ssid);

        // Check if we should wait for next attempt
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) break;

        // Calculate time to next interval or timeout cap
        const remaining = timeoutMs - elapsed;
        const waitTime = Math.min(intervalMs, remaining);

        await delay(waitTime);
      }
      debugLog('[WifiAction] Timed out connecting to ' + this.config.ssid);
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
    config: ConnectBluetoothActionConfig,
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
      const timeoutMs =
        (this.config.timeout || RETRY_DEFAULTS.TIMEOUT.DEFAULT) * 1000;
      const intervalMs =
        (this.config.interval || RETRY_DEFAULTS.INTERVAL.DEFAULT) * 1000;
      const startTime = Date.now();

      debugLog(
        `[BluetoothAction] Auto-connecting to ${
          this.config.deviceName || this.config.deviceId
        }. Timeout: ${timeoutMs / 1000}s, Interval: ${intervalMs / 1000}s`
      );

      // Attempt loop: Try at 0, interval, ..., timeout (inclusive)
      while (true) {
        // Check if connected
        const connectedDevices =
          await this.adapter.getConnectedBluetoothDevices();

        const isConnected = connectedDevices.some(
          (d) =>
            d.name === this.config.deviceId ||
            d.address === this.config.deviceId ||
            (d.name && d.name.includes(this.config.deviceId!))
        );

        if (isConnected) {
          debugLog(
            '[BluetoothAction] Successfully connected to ' +
              (this.config.deviceName || this.config.deviceId)
          );
          return;
        }

        debugLog(
          '[BluetoothAction] Attempting connection to ' +
            (this.config.deviceName || this.config.deviceId) +
            '...'
        );
        await this.adapter.connectBluetoothDevice(this.config.deviceId);

        // Check if we should wait for next attempt
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) break;

        // Calculate time to next interval or timeout cap
        const remaining = timeoutMs - elapsed;
        const waitTime = Math.min(intervalMs, remaining);

        await delay(waitTime);
      }

      debugLog(
        '[BluetoothAction] Timed out connecting to ' +
          (this.config.deviceName || this.config.deviceId)
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

export class BluetoothDeviceAction extends BaseAction {
  constructor(
    id: string,
    config: BluetoothDeviceActionConfig,
    adapter: SystemAdapter
  ) {
    // Determine strict type based on action
    const type =
      config.action === ActionOperation.CONNECT
        ? ActionType.CONNECT_BLUETOOTH
        : ActionType.DISCONNECT_BLUETOOTH;
    super(id, type, config, adapter);
  }

  async execute(): Promise<void> {
    if (this.config.action === ActionOperation.CONNECT) {
      const timeoutMs =
        (this.config.timeout || RETRY_DEFAULTS.TIMEOUT.DEFAULT) * 1000;
      const intervalMs =
        (this.config.interval || RETRY_DEFAULTS.INTERVAL.DEFAULT) * 1000;
      const startTime = Date.now();

      debugLog(
        `[BluetoothDeviceAction] Auto-connecting to ${
          this.config.deviceName || this.config.deviceId
        }. Timeout: ${timeoutMs / 1000}s, Interval: ${intervalMs / 1000}s`
      );

      // Attempt loop: Try at 0, interval, ..., timeout (inclusive)
      while (true) {
        // Attempt connection
        // Note: We don't check already connected first because user might want to force reconnect
        // But for efficiency we should probably check?
        // Let's stick to connect() -> verify pattern

        // Check verification first?
        const connectedDevices =
          await this.adapter.getConnectedBluetoothDevices();
        const isConnected = connectedDevices.some(
          (d) =>
            d.address === this.config.deviceId ||
            d.name === this.config.deviceId
        );

        if (isConnected) {
          debugLog(
            `[BluetoothDeviceAction] Successfully connected to ${
              this.config.deviceName || this.config.deviceId
            }`
          );
          return;
        }

        debugLog(
          `[BluetoothDeviceAction] Attempting connection to ${
            this.config.deviceName || this.config.deviceId
          }...`
        );
        try {
          await this.adapter.connectBluetoothDevice(this.config.deviceId);
        } catch (e) {
          debugLog(`[BluetoothDeviceAction] Connection attempt failed:`, e);
        }

        // Check if we should wait for next attempt
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) break;

        // Calculate time to next interval or timeout cap
        const remaining = timeoutMs - elapsed;
        const waitTime = Math.min(intervalMs, remaining);

        await delay(waitTime);
      }
      debugLog(
        `[BluetoothDeviceAction] Failed to connect to ${
          this.config.deviceName || this.config.deviceId
        } after timeout`
      );
    } else {
      debugLog(
        `[BluetoothDeviceAction] Disconnecting from ${
          this.config.deviceName || this.config.deviceId
        }`
      );
      this.adapter
        .disconnectBluetoothDevice(this.config.deviceId)
        .catch((e) => debugLog(e));
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

    if (this.config.action === ActionOperation.CONNECT) {
      // Revert of connect is disconnect
      this.adapter
        .disconnectBluetoothDevice(this.config.deviceId)
        .catch((e) => debugLog(e));
    } else {
      // Revert of disconnect is connect
      // Should we use loop here? Usually revert is "fire and forget" or simple attempt
      this.adapter
        .connectBluetoothDevice(this.config.deviceId)
        .catch((e) => debugLog(e));
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
