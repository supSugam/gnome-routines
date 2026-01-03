import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ActionType, PowerProfile } from '../types.js';

interface PowerProfileActionConfig {
  profile?: PowerProfile;
  enabled?: boolean; // For backward compatibility
}

export class PowerSaverAction extends BaseAction {
  constructor(
    id: string,
    config: PowerProfileActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.POWER_SAVER, config, adapter);
    this.adapter = adapter;
  }

  async execute(): Promise<void> {
    const config = this.config as PowerProfileActionConfig;

    // Support both new profile format and legacy enabled format
    if (config.profile) {
      this.adapter.setPowerProfile(config.profile);
    } else if (config.enabled !== undefined) {
      // Legacy compatibility: enabled=true -> power-saver, enabled=false -> balanced
      this.adapter.setPowerProfile(
        config.enabled ? PowerProfile.POWER_SAVER : PowerProfile.BALANCED
      );
    }
  }

  async revert(): Promise<void> {
    // Revert to balanced by default
    this.adapter.setPowerProfile(PowerProfile.BALANCED);
  }
}
