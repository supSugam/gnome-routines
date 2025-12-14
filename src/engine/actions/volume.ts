// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

import { ActionType, VolumeActionConfig } from '../types.js';

export class VolumeAction extends BaseAction {
  private previousVolume: number | null = null;
  private isEnforcing: boolean = false;

  constructor(id: string, config: VolumeActionConfig, adapter: SystemAdapter) {
    super(id, ActionType.VOLUME, config, adapter);
  }

  async execute(): Promise<void> {
    debugLog(
      `[VolumeAction] Starting volume enforcement. Target: ${this.config.level}%`
    );
    this.isEnforcing = true;
    try {
      if (this.previousVolume === null) {
        this.previousVolume = await this.adapter.getVolume();
        debugLog(
          `[VolumeAction] Initial volume captured: ${this.previousVolume}%`
        );
      } else {
        debugLog(
          `[VolumeAction] Using previously captured volume: ${this.previousVolume}%`
        );
      }

      let attempts = 0;
      let stableCount = 0;
      const maxAttempts = 30; // 30 * 500ms = 15 seconds
      const stabilityThreshold = 10; // 10 * 500ms = 5 seconds of stability

      const checkLoop = async () => {
        if (!this.isEnforcing) {
          debugLog(`[VolumeAction] Enforcement cancelled (stopped/reverted).`);
          return;
        }

        attempts++;

        // Check current volume
        const currentVolume = await this.adapter.getVolume();

        if (currentVolume !== this.config.level) {
          stableCount = 0; // Reset stability counter

          // Try setting Bluetooth volume first (if sink available)
          await this.adapter.setBluetoothVolume(this.config.level);

          // Fallback/Force system volume (often needed if sink is default)
          await this.adapter.setVolume(this.config.level);

          debugLog(
            `[VolumeAction] Enforced volume to ${this.config.level}% (was ${currentVolume}%)`
          );
        } else {
          stableCount++;
        }

        // Exit if stable for 2 seconds
        if (stableCount >= stabilityThreshold) {
          debugLog(
            `[VolumeAction] Volume stable at ${this.config.level}% for 2s. Finishing.`
          );
          this.isEnforcing = false;
          return;
        }

        if (attempts >= maxAttempts) {
          debugLog(
            `[VolumeAction] Enforcement finished (max attempts reached)`
          );
          this.isEnforcing = false;
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
      this.isEnforcing = false;
    }
  }

  async revert(): Promise<void> {
    this.isEnforcing = false; // Stop enforcement loop

    if (this.previousVolume !== null) {
      debugLog(`[VolumeAction] Reverting volume to: ${this.previousVolume}%`);
      try {
        await this.adapter.setVolume(this.previousVolume);
        debugLog(`[VolumeAction] Volume reverted successfully`);
      } catch (e) {
        console.error(`[VolumeAction] Failed to revert:`, e);
      }
      this.previousVolume = null;
    }
  }
}

