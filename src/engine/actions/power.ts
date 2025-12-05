import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ActionType, BinaryStateActionConfig } from '../types.js';
export class PowerSaverAction extends BaseAction {
  constructor(
    id: string,
    config: BinaryStateActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.POWER_SAVER, config, adapter);
    this.adapter = adapter;
  }

  async execute(): Promise<void> {
    this.adapter.setPowerSaver(this.config.enabled);
  }

  async revert(): Promise<void> {
    this.adapter.setPowerSaver(!this.config.enabled);
  }
}
