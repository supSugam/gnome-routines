import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class VolumeAction extends BaseAction {
    private previousVolume: number | null = null;

    constructor(id: string, config: { level: number }, adapter: SystemAdapter) {
        super(id, 'volume', config, adapter);
    }

    execute(): void {
        console.log(
          `[VolumeAction] Starting volume enforcement. Target: ${this.config.level}%`
        );
        try {
          this.previousVolume = this.adapter.getVolume();
          console.log(`[VolumeAction] Initial volume: ${this.previousVolume}%`);

          // @ts-ignore
          const GLib = imports.gi.GLib;

          let attempts = 0;
          let stableCount = 0;
          const maxAttempts = 30; // 30 * 500ms = 15 seconds
          const stabilityThreshold = 10; // 10 * 500ms = 5 seconds of stability

          const pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            attempts++;

            // Check current volume
            const currentVolume = this.adapter.getVolume();

            if (currentVolume !== this.config.level) {
              stableCount = 0; // Reset stability counter

              // Try setting Bluetooth volume first (if sink available)
              this.adapter.setBluetoothVolume(this.config.level);

              // Fallback/Force system volume (often needed if sink is default)
              this.adapter.setVolume(this.config.level);

              console.log(
                `[VolumeAction] Enforced volume to ${this.config.level}% (was ${currentVolume}%)`
              );
            } else {
              stableCount++;
            }

            // Exit if stable for 2 seconds
            if (stableCount >= stabilityThreshold) {
              console.log(
                `[VolumeAction] Volume stable at ${this.config.level}% for 2s. Finishing.`
              );
              return GLib.SOURCE_REMOVE;
            }

            if (attempts >= maxAttempts) {
              console.log(
                `[VolumeAction] Enforcement finished (max attempts reached)`
              );
              return GLib.SOURCE_REMOVE;
            }

            return GLib.SOURCE_CONTINUE;
          });
        } catch (e) {
          console.error(`[VolumeAction] Failed to execute:`, e);
        }
    }

    revert(): void {
        if (this.previousVolume !== null) {
            console.log(`[VolumeAction] Reverting volume to: ${this.previousVolume}%`);
            try {
                this.adapter.setVolume(this.previousVolume);
                console.log(`[VolumeAction] Volume reverted successfully`);
            } catch (e) {
                console.error(`[VolumeAction] Failed to revert:`, e);
            }
        }
    }
}
