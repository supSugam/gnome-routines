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

      // Retry (fight system override)
      this.retryWithVerification(targetLevel, 3);
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

  private retryWithVerification(
    targetLevel: number,
    retriesLeft: number
  ): void {
    if (retriesLeft <= 0) {
      debugLog('[VolumeAction] Max retries reached, giving up');
      return;
    }

    // Wait & Verify
    this.retryTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
      this.retryTimeoutId = null;

      this.adapter.getVolume().then((currentVolume) => {
        // 2% tolerance
        if (Math.abs(currentVolume - targetLevel) <= 2) {
          debugLog(
            `[VolumeAction] Volume verified at ${currentVolume}% (target: ${targetLevel}%)`
          );
          return;
        }

        debugLog(
          `[VolumeAction] Volume drifted to ${currentVolume}%, re-setting to ${targetLevel}% (${retriesLeft - 1} retries left)`
        );

        this.setVolumeAll(targetLevel).then(() => {
          this.retryWithVerification(targetLevel, retriesLeft - 1);
        });
      });

      return GLib.SOURCE_REMOVE;
    });
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
