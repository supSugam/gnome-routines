import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class BluetoothTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;
  private _timeoutId: number = 0;
  private _hasWitnessedChange: boolean = false;

  constructor(
    id: string,
    config: {
      state: 'connected' | 'disconnected' | 'enabled' | 'disabled';
      deviceIds?: string[];
    },
    adapter: SystemAdapter
  ) {
    super(id, 'bluetooth', config);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    // If we haven't witnessed a change event yet, ignore the state
    // This prevents triggering on restart/unlock if state is already met
    if (!this._hasWitnessedChange) {
      return false;
    }

    // Power state check
    if (this.config.state === 'enabled' || this.config.state === 'disabled') {
      const isEnabled = await this.adapter.getBluetoothPowerState();
      return this.config.state === 'enabled' ? isEnabled : !isEnabled;
    }

    // Connection state check
    const connectedDevices = await this.adapter.getConnectedBluetoothDevices();

    // If specific devices are configured
    if (this.config.deviceIds && this.config.deviceIds.length > 0) {
      const isMatch = connectedDevices.some(
        (d) =>
          this.config.deviceIds!.includes(d.name) ||
          this.config.deviceIds!.includes(d.address)
      );

      if (this.config.state === 'connected') {
        return isMatch;
      } else {
        return !isMatch;
      }
    }

    // Default behavior (any device)
    const isAnyConnected = connectedDevices.length > 0;
    if (this.config.state === 'connected') {
      return isAnyConnected;
    } else {
      return !isAnyConnected;
    }
  }

  activate(): void {
    debugLog(`[BluetoothTrigger] Activating listener for ${this.config.state}`);

    if (this.config.state === 'enabled' || this.config.state === 'disabled') {
      this.adapter.onBluetoothPowerStateChanged((isEnabled: boolean) => {
        debugLog(`[BluetoothTrigger] Bluetooth power changed to: ${isEnabled}`);
        this._hasWitnessedChange = true;
        this.emit('triggered');
      });
    } else {
      this.adapter.onBluetoothDeviceStateChanged(() => {
        debugLog(
          `[BluetoothTrigger] Bluetooth device state changed event received`
        );
        this._hasWitnessedChange = true;
        this.emit('triggered');
      });

      // Removed initial check block to prevent triggering on load
    }

    this._isActivated = true;
  }

  deactivate(): void {
    if (this._timeoutId > 0) {
      // @ts-ignore
      const GLib = imports.gi.GLib;
      GLib.source_remove(this._timeoutId);
      this._timeoutId = 0;
      debugLog(`[BluetoothTrigger] Polling timer removed`);
    }
    this._isActivated = false;
    this._hasWitnessedChange = false; // Reset on deactivate
  }
}
