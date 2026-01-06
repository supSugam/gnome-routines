import debugLog from '../../utils/log.js';
import { Routine, Trigger, TriggerStrategy, RoutineState } from '../types.js';
import { TRIGGER_METADATA } from '../triggerMetadata.js';

/** Callbacks that TriggerOrchestrator needs from the manager */
export interface TriggerOrchestratorCallbacks {
  getRoutineHealth: (id: string) => RoutineState;
  activateRoutine: (routine: Routine) => Promise<void>;
  evaluate: (forceTriggers?: Trigger[]) => Promise<void>;
}

/**
 * TriggerOrchestrator
 * Single Responsibility: Trigger activation, deactivation, and event routing.
 */
export class TriggerOrchestrator {
  private callbacks: TriggerOrchestratorCallbacks;
  private static readonly DEBOUNCE_MS = 3000;

  constructor(callbacks: TriggerOrchestratorCallbacks) {
    this.callbacks = callbacks;
  }

  /** Activate and listen to all triggers */
  activateAll(routine: Routine): void {
    for (const trigger of routine.triggers) {
      this.activateTrigger(trigger as any, routine);
    }
  }

  deactivateAll(routine: Routine): void {
    for (const trigger of routine.triggers) {
      const t = trigger as any;
      if (t.deactivate && t._isActivated) {
        t.deactivate();
        t._isActivated = false;
      }
    }
  }

  async checkAll(
    triggers: Trigger[],
    matchType: 'any' | 'all',
    forceTriggers: Trigger[] = []
  ): Promise<Trigger[]> {
    if (triggers.length === 0) return [];

    const activeTriggers: Trigger[] = [];

    for (const trigger of triggers) {
      // Bypass check for forced triggers
      if (forceTriggers.some((t) => t.id === trigger.id)) {
        activeTriggers.push(trigger);
        continue;
      }

      if (await trigger.check()) {
        activeTriggers.push(trigger);
      }
    }

    if (matchType === 'any') {
      return activeTriggers.length > 0 ? activeTriggers : [];
    } else {
      // ALL - only return if all triggers matched
      return activeTriggers.length === triggers.length ? activeTriggers : [];
    }
  }

  private activateTrigger(trigger: any, routine: Routine): void {
    debugLog(
      `[TriggerOrchestrator] Checking activation for ${trigger.id} (active: ${trigger._isActivated})`
    );
    debugLog(
      `[TriggerOrchestrator] Type: ${trigger.constructor.name}, hasActivate: ${typeof trigger.activate}`
    );

    if (!trigger.activate || trigger._isActivated) return;

    trigger._isActivated = true;

    // Setup handlers
    if (trigger.on) {
      this.setupTriggeredHandler(trigger, routine);
      this.setupActivateHandler(trigger);
      this.setupDeactivateHandler(trigger);
    }

    try {
      trigger.activate();
    } catch (e) {
      debugLog(`[TriggerOrchestrator] Failed to activate ${trigger.id}:`, e);
      trigger._isActivated = false;
    }
  }

  private setupTriggeredHandler(trigger: any, routine: Routine): void {
    trigger.on('triggered', async () => {
      try {
        debugLog(
          `[TriggerOrchestrator] Trigger ${trigger.id} fired for "${routine.name}"`
        );

        const metadata =
          TRIGGER_METADATA[trigger.type as keyof typeof TRIGGER_METADATA];
        const isEventBased =
          metadata?.defaultStrategy === TriggerStrategy.NEW_CHANGE_ONLY;
        const isValid = isEventBased ? true : await trigger.check();

        debugLog(
          `[TriggerOrchestrator] Check result: ${isValid} (eventBased: ${isEventBased})`
        );

        if (routine.isActive || isEventBased) {
          if (isValid) {
            const state = this.callbacks.getRoutineHealth(routine.id);
            const timeSinceLastRun = Date.now() - state.lastRun;

            if (timeSinceLastRun > TriggerOrchestrator.DEBOUNCE_MS) {
              debugLog(
                `[TriggerOrchestrator] Debounce passed (${timeSinceLastRun}ms). Executing.`
              );
              await this.callbacks.activateRoutine(routine);
            } else {
              debugLog(
                `[TriggerOrchestrator] Debounced (${timeSinceLastRun}ms < ${TriggerOrchestrator.DEBOUNCE_MS}ms). Skipping.`
              );
            }
          } else {
            debugLog('[TriggerOrchestrator] Trigger invalid. Re-evaluating...');
            await this.callbacks.evaluate();
          }
        } else {
          if (isValid) {
            debugLog(
              '[TriggerOrchestrator] Inactive routine, valid trigger. Force-evaluating.'
            );
            await this.callbacks.evaluate([trigger]);
          } else {
            debugLog(
              '[TriggerOrchestrator] Inactive routine, invalid trigger. Normal evaluation.'
            );
            await this.callbacks.evaluate();
          }
        }
      } catch (e) {
        debugLog(
          `[TriggerOrchestrator] Error handling trigger ${trigger.id}:`,
          e
        );
      }
    });
  }

  private setupActivateHandler(trigger: any): void {
    trigger.on('activate', () => {
      debugLog(`[TriggerOrchestrator] Trigger ${trigger.id} activated`);
      this.callbacks
        .evaluate()
        .catch((e) => debugLog('[TriggerOrchestrator] Error on activate:', e));
    });
  }

  private setupDeactivateHandler(trigger: any): void {
    trigger.on('deactivate', () => {
      debugLog(`[TriggerOrchestrator] Trigger ${trigger.id} deactivated`);
      this.callbacks
        .evaluate()
        .catch((e) =>
          debugLog('[TriggerOrchestrator] Error on deactivate:', e)
        );
    });
  }
}
