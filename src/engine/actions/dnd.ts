import debugLog from '../../utils/log.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ActionType } from '../types.js';
import { StateManager } from '../stateManager.js';

export class DndAction extends BaseAction {
  private stateManager: StateManager;
  private routineId: string;

  constructor(
    id: string,
    config: { enabled: boolean },
    adapter: SystemAdapter,
    stateManager: StateManager,
    routineId: string
  ) {
    super(id, ActionType.DND, config, adapter);
    this.stateManager = stateManager;
    this.routineId = routineId;
  }

  async execute(): Promise<void> {
    debugLog(`[DndAction] Setting DND to: ${this.config.enabled}`);
    // Store current state before changing
    const currentState = this.adapter.getDND();

    // Save to stateManager for persistence
    this.stateManager.saveState(this.routineId, ActionType.DND, currentState);
    debugLog(`[DndAction] Saved previous DND state: ${currentState}`);

    this.adapter.setDND(this.config.enabled);
  }

  async revert(): Promise<void> {
    const savedState = this.stateManager.restoreState(
      this.routineId,
      ActionType.DND
    );

    if (savedState !== null) {
      debugLog(`[DndAction] Reverting DND to: ${savedState}`);
      this.adapter.setDND(savedState);
    } else {
      debugLog(`[DndAction] No saved state found to revert.`);
    }
  }
}
