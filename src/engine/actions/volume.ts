import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class VolumeAction extends BaseAction {
  private previousVolume: number | null = null;

  constructor(id: string, config: { level: number }, adapter: SystemAdapter) {
    super(id, 'volume', config, adapter);
  }

  async execute(): Promise<void> {
    console.log(
      `[VolumeAction] Starting volume enforcement. Target: ${this.config.level}%`
    );
    try {
      this.previousVolume = await this.adapter.getVolume();
      console.log(`[VolumeAction] Initial volume: ${this.previousVolume}%`);

      // @ts-ignore
      const GLib = imports.gi.GLib;

      let attempts = 0;
      let stableCount = 0;
      const maxAttempts = 30; // 30 * 500ms = 15 seconds
      const stabilityThreshold = 10; // 10 * 500ms = 5 seconds of stability

      const checkLoop = async () => {
        attempts++;

        // Check current volume
        const currentVolume = await this.adapter.getVolume();

        if (currentVolume !== this.config.level) {
          stableCount = 0; // Reset stability counter

          // Try setting Bluetooth volume first (if sink available)
          await this.adapter.setBluetoothVolume(this.config.level);

          // Fallback/Force system volume (often needed if sink is default)
          await this.adapter.setVolume(this.config.level);

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
          return;
        }

        if (attempts >= maxAttempts) {
          console.log(
            `[VolumeAction] Enforcement finished (max attempts reached)`
          );
          return;
        }

        // Schedule next check
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
          checkLoop();
          return GLib.SOURCE_REMOVE;
        });
      };

      // Start loop
      checkLoop();
    } catch (e) {
      console.error(`[VolumeAction] Failed to execute:`, e);
    }
  }

  async revert(): Promise<void> {
    if (this.previousVolume !== null) {
      console.log(
        `[VolumeAction] Reverting volume to: ${this.previousVolume}%`
      );
      try {
        await this.adapter.setVolume(this.previousVolume);
        console.log(`[VolumeAction] Volume reverted successfully`);
      } catch (e) {
        console.error(`[VolumeAction] Failed to revert:`, e);
      }
    }
  }
}
