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


export class WifiAction extends BaseAction {
  private initialState: boolean | null = null;
  private initialSsid: string | null = null;
  private timeoutId: number | null = null;
  private cancelResolve: (() => void) | null = null;
  private isDestroyed: boolean = false;

  constructor(
    id: string,
    config: ConnectWifiActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.WIFI, config, adapter);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.cancelResolve = resolve;
      this.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        this.timeoutId = null;
        this.cancelResolve = null;
        resolve();
        return GLib.SOURCE_REMOVE;
      });
    });
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.timeoutId) {
      GLib.source_remove(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.cancelResolve) {
      this.cancelResolve();
      this.cancelResolve = null;
    }
  }

  async execute(): Promise<void> {
    this.isDestroyed = false; // Reset on new execution
    // Capture state if not already captured
    if (this.initialState === null) {
      this.initialState = this.adapter.getWifiState();
      this.initialSsid = this.adapter.getCurrentWifiSSID();
    }

    // Default true
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

      // Retry loop
      while (!this.isDestroyed) {
        const elapsedSinceStart = Date.now() - startTime;
        const isFinalAttempt = elapsedSinceStart >= timeoutMs;

        // Attempt
        const currentSSID = this.adapter.getCurrentWifiSSID();
        if (currentSSID === this.config.ssid) {
          debugLog(
            '[WifiAction] Successfully connected to ' + this.config.ssid
          );
          return;
        }

        debugLog(
          `[WifiAction] Attempting connection to ${this.config.ssid}... ${isFinalAttempt ? '(Final Attempt)' : ''}`
        );
        this.adapter.connectToWifi(this.config.ssid);

        // Wait check
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) break;

        // Calc wait time
        const remaining = timeoutMs - elapsed;
        const waitTime = Math.min(intervalMs, remaining);

        await this.wait(waitTime);
      }

      if (!this.isDestroyed) {
        debugLog('[WifiAction] Timed out connecting to ' + this.config.ssid);
      }
    }
  }

  async revert(): Promise<void> {
    this.destroy(); // Cancel any ongoing loop
    if (this.initialState !== null) {
      debugLog(
        `[WifiAction] Reverting state. Enabled: ${this.initialState}, SSID: ${this.initialSsid}`
      );
      this.adapter.setWifi(this.initialState);
      if (this.initialState && this.initialSsid) {
        // Reconnect if needed
        this.adapter.connectToWifi(this.initialSsid);
      }
      // Reset state capture
      this.initialState = null;
      this.initialSsid = null;
    } else {
      // Fallback
      this.adapter.setWifi(!this.config.enabled);
    }
  }
}

export class BluetoothAction extends BaseAction {
  private initialState: boolean | null = null;
  private timeoutId: number | null = null;
  private cancelResolve: (() => void) | null = null;
  private isDestroyed: boolean = false;

  constructor(
    id: string,
    config: ConnectBluetoothActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.BLUETOOTH, config, adapter);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.cancelResolve = resolve;
      this.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        this.timeoutId = null;
        this.cancelResolve = null;
        resolve();
        return GLib.SOURCE_REMOVE;
      });
    });
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.timeoutId) {
      GLib.source_remove(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.cancelResolve) {
      this.cancelResolve();
      this.cancelResolve = null;
    }
  }

  async execute(): Promise<void> {
    this.isDestroyed = false;
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
      while (!this.isDestroyed) {
        const elapsedSinceStart = Date.now() - startTime;
        const isFinalAttempt = elapsedSinceStart >= timeoutMs;

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
          `[BluetoothAction] Attempting connection to ${this.config.deviceName || this.config.deviceId}... ${isFinalAttempt ? '(Final Attempt)' : ''}`
        );
        await this.adapter.connectBluetoothDevice(this.config.deviceId);

        // Check if we should wait for next attempt
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) break;

        // Calculate time to next interval or timeout cap
        const remaining = timeoutMs - elapsed;
        const waitTime = Math.min(intervalMs, remaining);

        await this.wait(waitTime);
      }

      if (!this.isDestroyed) {
        debugLog(
          '[BluetoothAction] Timed out connecting to ' +
            (this.config.deviceName || this.config.deviceId)
        );
      }
    }
  }

  async revert(): Promise<void> {
    this.destroy();
    if (this.initialState !== null) {
      await this.adapter.setBluetooth(this.initialState);
      this.initialState = null;
    } else {
      await this.adapter.setBluetooth(!this.config.enabled);
    }
  }
}

export class BluetoothDeviceAction extends BaseAction {
  private timeoutId: number | null = null;
  private cancelResolve: (() => void) | null = null;
  private isDestroyed: boolean = false;

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

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.cancelResolve = resolve;
      this.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        this.timeoutId = null;
        this.cancelResolve = null;
        resolve();
        return GLib.SOURCE_REMOVE;
      });
    });
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.timeoutId) {
      GLib.source_remove(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.cancelResolve) {
      this.cancelResolve();
      this.cancelResolve = null;
    }
  }

  async execute(): Promise<void> {
    this.isDestroyed = false;
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
      while (!this.isDestroyed) {
        const elapsedSinceStart = Date.now() - startTime;
        const isFinalAttempt = elapsedSinceStart >= timeoutMs;

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
          `[BluetoothDeviceAction] Attempting connection to ${this.config.deviceName || this.config.deviceId}... ${isFinalAttempt ? '(Final Attempt)' : ''}`
        );
        try {
          await this.adapter.connectBluetoothDevice(this.config.deviceId);
        } catch (e) {
          debugLog(`[BluetoothDeviceAction] Connection attempt failed:`, e);
        }

        // Wait check
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) break;

        // Calc wait time
        const remaining = timeoutMs - elapsed;
        const waitTime = Math.min(intervalMs, remaining);

        await this.wait(waitTime);
      }

      if (!this.isDestroyed) {
        debugLog(
          `[BluetoothDeviceAction] Failed to connect to ${
            this.config.deviceName || this.config.deviceId
          } after timeout`
        );
      }
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
    this.destroy(); // stop loops
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
