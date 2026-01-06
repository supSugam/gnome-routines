import debugLog from '../../utils/log.js';
import { Routine, Action, RoutineHealth, ExecutionType, ExecutionStatus } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { ActionFactory } from '../actionFactory.js';
import { StateManager } from '../stateManager.js';
import { HealthTracker } from './healthTracker.js';

/**
 * RoutineExecutor - Executes and reverts routine actions.
 * Single Responsibility: Action execution lifecycle.
 */
export class RoutineExecutor {
  private adapter: SystemAdapter;
  private stateManager: StateManager;
  private healthTracker: HealthTracker;

  constructor(
    adapter: SystemAdapter,
    stateManager: StateManager,
    healthTracker: HealthTracker
  ) {
    this.adapter = adapter;
    this.stateManager = stateManager;
    this.healthTracker = healthTracker;
  }

  /**
   * Execute all actions for a routine (activation).
   */
  async activate(routine: Routine): Promise<void> {
    debugLog(`[RoutineExecutor] Activating: ${routine.name}`);
    debugLog(`[RoutineExecutor] Actions: ${routine.actions.length}`);

    routine.isActive = true;
    const state = this.healthTracker.getHealth(routine.id);
    state.lastRun = Date.now();
    state.runCount++;

    let hasError = false;

    for (const action of routine.actions) {
      debugLog(
        `[RoutineExecutor] Executing action ${action.id} (${action.type})`
      );

      try {
        await action.execute();
        debugLog(`[RoutineExecutor] Action ${action.id} completed`);
      } catch (e) {
        debugLog(`[RoutineExecutor] Action ${action.id} failed:`, e);
        this.healthTracker.recordFailure(
          routine.id,
          `Action ${action.type} failed: ${String(e)}`
        );
        state.failureCount++;
        state.lastError = String(e);
        hasError = true;
      }
    }

    if (!hasError) {
      this.healthTracker.recordSuccess(routine.id);
    }
  }

  /**
   * Deactivate a routine by reverting or applying custom deactivation.
   */
  async deactivate(routine: Routine): Promise<void> {
    debugLog(`[RoutineExecutor] Deactivating: ${routine.name}`);
    routine.isActive = false;

    // Process actions in reverse order
    for (let i = routine.actions.length - 1; i >= 0; i--) {
      const action = routine.actions[i];
      await this.deactivateAction(action, routine.id);
    }
  }

  private async deactivateAction(action: Action, routineId: string): Promise<void> {
    const onDeactivate = action.onDeactivate;

    if (onDeactivate) {
      if (onDeactivate.type === 'keep') {
        debugLog(`[RoutineExecutor] Keeping state for ${action.id}`);
        return;
      }

      if (onDeactivate.type === 'custom' && onDeactivate.config) {
        debugLog(`[RoutineExecutor] Custom deactivation for ${action.id}`);
        debugLog(`[RoutineExecutor] Config: ${JSON.stringify(onDeactivate.config)}`);

        const customAction = ActionFactory.create(
          { ...action, config: onDeactivate.config },
          this.adapter,
          this.stateManager,
          routineId
        );

        if (customAction) {
          try {
            await customAction.execute();
          } catch (e) {
            debugLog(`[RoutineExecutor] Custom deactivation failed for ${action.id}:`, e);
          }
        }
        return;
      }
    }

    // Default: revert
    if (action.revert) {
      try {
        await action.revert();
      } catch (e) {
        debugLog(`[RoutineExecutor] Revert failed for ${action.id}:`, e);
      }
    }
  }
}
