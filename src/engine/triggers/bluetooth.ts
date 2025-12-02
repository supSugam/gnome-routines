import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class BluetoothTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;

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
    // Power state check
    if (this.config.state === 'enabled' || this.config.state === 'disabled') {
      const isEnabled = this.adapter.getBluetoothPowerState();
      return this.config.state === 'enabled' ? isEnabled : !isEnabled;
    }

    // Connection state check
    const connectedDevices = this.adapter.getConnectedBluetoothDevices();

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
    console.log(
      `[BluetoothTrigger] Activating listener for ${this.config.state}`
    );

    if (this.config.state === 'enabled' || this.config.state === 'disabled') {
      this.adapter.onBluetoothPowerStateChanged((isEnabled: boolean) => {
        console.log(
          `[BluetoothTrigger] Bluetooth power changed to: ${isEnabled}`
        );
        this.emit('triggered');
      });
    } else {
      this.adapter.onBluetoothDeviceStateChanged(() => {
        console.log(
          `[BluetoothTrigger] Bluetooth device state changed event received`
        );
        this.emit('triggered');
      });

      // Polling fallback for device connection
      // @ts-ignore
      const GLib = imports.gi.GLib;
      let lastState = false;

      // Initial check
      this.check().then((state) => (lastState = state));

      GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
        this.check()
          .then((currentState) => {
            if (currentState !== lastState) {
              console.log(
                `[BluetoothTrigger] Polling detected state change: ${lastState} -> ${currentState}`
              );
              lastState = currentState;
              if (currentState) {
                console.log(`[BluetoothTrigger] Triggered via polling`);
                this.emit('triggered');
              }
            }
          })
          .catch((e) => {
            console.error('[BluetoothTrigger] Polling check failed:', e);
          });
        return GLib.SOURCE_CONTINUE;
      });
    }

    this._isActivated = true;
  }
}
