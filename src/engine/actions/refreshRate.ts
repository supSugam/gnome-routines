import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { StateManager } from '../stateManager.js';

export class RefreshRateAction extends BaseAction {
  private stateManager: StateManager;
  private routineId: string;

  constructor(
    id: string,
    config: { rate: number },
    adapter: SystemAdapter,
    stateManager: StateManager,
    routineId: string
  ) {
    super(id, 'refresh_rate', config, adapter);
    this.stateManager = stateManager;
    this.routineId = routineId;
  }

  async execute(): Promise<void> {
    debugLog(`[RefreshRateAction] Executing with rate: ${this.config.rate}`);
    const currentRate = await this.adapter.getRefreshRate();
    this.stateManager.saveState(this.routineId, 'refresh_rate', currentRate);
    await this.adapter.setRefreshRate(this.config.rate);
  }

  async revert(): Promise<void> {
    const savedRate = this.stateManager.restoreState(
      this.routineId,
      'refresh_rate'
    );
    if (savedRate !== null) {
      await this.adapter.setRefreshRate(savedRate);
    }
  }
}
