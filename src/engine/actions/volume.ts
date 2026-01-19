// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

import { ActionType, VolumeActionConfig } from '../types.js';

export class VolumeAction extends BaseAction {
  private previousVolume: number | null = null;
  private retryTimeoutId: number | null = null;

  constructor(id: string, config: VolumeActionConfig, adapter: SystemAdapter) {
    super(id, ActionType.VOLUME, config, adapter);
  }

  destroy(): void {
    if (this.retryTimeoutId) {
      GLib.source_remove(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  async execute(): Promise<void> {
    const targetLevel = this.config.level;
    debugLog(`[VolumeAction] Setting volume to: ${targetLevel}%`);

    try {
      if (this.previousVolume === null) {
        this.previousVolume = await this.adapter.getVolume();
        debugLog(
          `[VolumeAction] Initial volume captured: ${this.previousVolume}%`
        );
      }

      // Set volume immediately
      await this.setVolumeAll(targetLevel);

      // Enforce for 5 seconds (event-driven)
      this.monitorAndEnforce(targetLevel, 5000);
    } catch (e) {
      debugLog(`[VolumeAction] Failed to execute:`, e);
    }
  }

  private async setVolumeAll(level: number): Promise<void> {
    // Set BT volume
    await this.adapter.setBluetoothVolume(level);
    // Set system volume
    await this.adapter.setVolume(level);
  }

  private monitorAndEnforce(targetLevel: number, durationMs: number): void {
    debugLog(
      `[VolumeAction] Enforcing volume at ${targetLevel}% for ${durationMs}ms`
    );

    // Clean up previous enforcement
    this.destroy();

    const startTime = Date.now();
    let isEnforcing = false;

    const cleanupSignal = this.adapter.onVolumeChanged((currentVolume) => {
      // Check expiration
      if (Date.now() - startTime > durationMs) {
        this.destroy();
        return;
      }

      // Avoid feedback loop during restoration
      if (isEnforcing) return;

      // Check deviation (tolerance 2%)
      if (Math.abs(currentVolume - targetLevel) > 2) {
        debugLog(
          `[VolumeAction] Volume deviation DETECTED: ${currentVolume}% (Target: ${targetLevel}%)`
        );
        debugLog(`[VolumeAction] Consistently forcing volume restoration...`);

        isEnforcing = true;
        this.setVolumeAll(targetLevel).then(() => {
          isEnforcing = false;
        });
      }
    });

    // Hard stop timer
    const timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, durationMs, () => {
      debugLog(`[VolumeAction] Enforcement period ended.`);
      cleanupSignal();
      this.retryTimeoutId = null;
      return GLib.SOURCE_REMOVE;
    });

    // Store cleanup (hijacking retryTimeoutId to store the timer ID, signal is separate)
    // To strictly stick to the existing class structure, we'll store the timer ID.
    // Ideally we would store the cleanup callback too, but let's wrap it.

    this.retryTimeoutId = timerId;

    // Overwrite destroy to clean up both
    const originalDestroy = this.destroy.bind(this);
    this.destroy = () => {
      cleanupSignal();
      // Call original to clear timer
      if (this.retryTimeoutId) {
        GLib.source_remove(this.retryTimeoutId);
        this.retryTimeoutId = null;
      }
      // Restore original destroy for next time? No, this instance is short lived usually or reused.
      // Better pattern:
      this.destroy = originalDestroy;
    };
  }

  async revert(): Promise<void> {
    this.destroy();

    if (this.previousVolume !== null) {
      debugLog(`[VolumeAction] Reverting volume to: ${this.previousVolume}%`);
      try {
        await this.adapter.setVolume(this.previousVolume);
        debugLog(`[VolumeAction] Volume reverted successfully`);
      } catch (e) {
        debugLog(`[VolumeAction] Failed to revert:`, e);
      }
      this.previousVolume = null;
    }
  }
}
