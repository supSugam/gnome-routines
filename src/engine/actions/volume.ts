// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

import { ActionType, VolumeActionConfig } from '../types.js';

export class VolumeAction extends BaseAction {
  private previousVolume: number | null = null;
  private timeoutId: number | null = null;

  constructor(id: string, config: VolumeActionConfig, adapter: SystemAdapter) {
    super(id, ActionType.VOLUME, config, adapter);
  }

  destroy(): void {
    if (this.timeoutId) {
      GLib.source_remove(this.timeoutId);
      this.timeoutId = null;
    }
  }

  async execute(): Promise<void> {
    debugLog(`[VolumeAction] Setting volume to: ${this.config.level}%`);

    try {
      if (this.previousVolume === null) {
        this.previousVolume = await this.adapter.getVolume();
        debugLog(
          `[VolumeAction] Initial volume captured: ${this.previousVolume}%`
        );
      }

      // Try setting Bluetooth volume first (if sink available)
      await this.adapter.setBluetoothVolume(this.config.level);

      // Force system volume
      await this.adapter.setVolume(this.config.level);

      debugLog(`[VolumeAction] Volume set to ${this.config.level}%`);
    } catch (e) {
      debugLog(`[VolumeAction] Failed to execute:`, e);
    }
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
