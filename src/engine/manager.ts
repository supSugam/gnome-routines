import debugLog from '../utils/log.js';
import {
  Routine,
  RoutineManagerInterface,
  Trigger,
  Action,
  RoutineHealth,
  RoutineState,
  ExecutionLog,
  ACTION_RESOURCE_MAP,
  ResourceType,
  TriggerStrategy,
  ExecutionStatus,
  ExecutionType,
} from './types.js';
import { StorageAdapter } from './storage.js';
import { SystemAdapter } from '../gnome/adapters/adapter.js';
import { TriggerFactory } from './triggerFactory.js';
import { ActionFactory } from './actionFactory.js';
import { StateManager } from './stateManager.js';
import { RoutineValidator } from './validator.js';
import { EventEmitter } from './events.js';
import { TRIGGER_METADATA } from './triggerMetadata.js';

export class RoutineManager implements RoutineManagerInterface {
  private routines: Map<string, Routine> = new Map();
  private routineStates: Map<string, RoutineState> = new Map();
  private storage: StorageAdapter;
  private adapter: SystemAdapter;
  private stateManager: StateManager;

  constructor(storage: StorageAdapter, adapter: SystemAdapter, settings: any) {
    this.storage = storage;
    this.adapter = adapter;
    this.stateManager = new StateManager(settings);
  }

  getRoutineHealth(id: string): RoutineState {
    let state = this.routineStates.get(id);
    if (!state) {
      state = {
        health: RoutineHealth.UNKNOWN,
        lastRun: 0,
        runCount: 0,
        failureCount: 0,
        history: [],
      };
      this.routineStates.set(id, state);
    }
    return state;
  }

  private updateHealth(
    id: string,
    health: RoutineHealth,
    log?: Partial<ExecutionLog>
  ) {
    const state = this.getRoutineHealth(id);
    if (health !== RoutineHealth.UNKNOWN) {
      state.health = health;
    }

    if (log) {
      state.history.unshift({
        timestamp: Date.now(),
        type: log.type || ExecutionType.CHECK,
        status: log.status || ExecutionStatus.SUCCESS,
        message: log.message,
      });
      if (state.history.length > 50) state.history.pop();
    }

    this.stateManager.setState(id, 'health_status', state);
  }

  async load() {
    debugLog('[RoutineManager] load() called');
    const rawRoutines = await this.storage.loadRoutines();
    debugLog(
      `[RoutineManager] Loaded ${rawRoutines.length} raw routines from storage`
    );

    rawRoutines.forEach((r) => {
      debugLog(`[RoutineManager] Hydrating routine: ${r.name} (${r.id})`);
      const routine = this._hydrate(r);
      if (routine) {
        this.routines.set(routine.id, routine);
        debugLog(
          `[RoutineManager] Routine hydrated and added: ${routine.name}`
        );
      } else {
        debugLog(`[RoutineManager] Failed to hydrate routine: ${r.name}`);
      }
    });

    debugLog(`[RoutineManager] Total active routines: ${this.routines.size}`);
    this.evaluate().catch((e) =>
      debugLog('[RoutineManager] Error during initial evaluation:', e)
    );
  }

  async reload() {
    debugLog('[RoutineManager] Reloading routines from settings...');
    this._isFirstRun = true;
    const rawRoutines = await this.storage.loadRoutines();
    const newRoutineMap = new Map<string, Routine>();

    rawRoutines.forEach((r) => {
      const routine = this._hydrate(r);
      if (routine) newRoutineMap.set(routine.id, routine);
    });

    for (const id of this.routines.keys()) {
      if (!newRoutineMap.has(id)) {
        debugLog(`[RoutineManager] Routine ${id} removed`);
        this._removeRoutine(id);
      }
    }

    for (const [id, newRoutine] of newRoutineMap) {
      const existing = this.routines.get(id);
      if (!existing) {
        debugLog(`[RoutineManager] Routine ${id} added`);
        this.routines.set(id, newRoutine);
      } else {
        if (this.areRoutinesEqual(existing, newRoutine)) {
          debugLog(
            `[RoutineManager] Routine ${id} configuration unchanged. Keeping active state.`
          );
          continue;
        }
        debugLog(`[RoutineManager] Routine ${id} updated (config changed)`);
        this._removeRoutine(id);
        this.routines.set(id, newRoutine);
        newRoutine.isActive = false;
      }
    }

    this.evaluate().catch((e) =>
      debugLog('[RoutineManager] Error during reload evaluation:', e)
    );
  }

  private areRoutinesEqual(r1: Routine, r2: Routine): boolean {
    if (
      r1.name !== r2.name ||
      r1.enabled !== r2.enabled ||
      r1.matchType !== r2.matchType
    ) {
      return false;
    }

    // Compare Triggers
    if (r1.triggers.length !== r2.triggers.length) return false;
    for (let i = 0; i < r1.triggers.length; i++) {
      const t1 = r1.triggers[i];
      const t2 = r2.triggers[i];
      if (
        t1.type !== t2.type ||
        t1.id !== t2.id ||
        !this.isConfigEqual(t1.config, t2.config)
      ) {
        return false;
      }
    }

    if (r1.actions.length !== r2.actions.length) return false;
    for (let i = 0; i < r1.actions.length; i++) {
      const a1 = r1.actions[i];
      const a2 = r2.actions[i];
      if (
        a1.type !== a2.type ||
        a1.id !== a2.id ||
        !this.isConfigEqual(a1.config, a2.config) ||
        !this.isConfigEqual(a1.onDeactivate, a2.onDeactivate)
      ) {
        return false;
      }
    }

    return true;
  }

  private isConfigEqual(c1: any, c2: any): boolean {
    if (c1 === undefined && c2 === undefined) return true;
    if (c1 === undefined || c2 === undefined) return false;
    return JSON.stringify(c1) === JSON.stringify(c2);
  }

  private _hydrate(rawRoutine: any): Routine | null {
    try {
      const triggers = rawRoutine.triggers
        .map((t: any) =>
          TriggerFactory.create(
            t,
            this.adapter,
            this.stateManager,
            rawRoutine.id
          )
        )
        .filter((t: any) => t !== null) as Trigger[];

      debugLog(
        `[RoutineManager] Hydrating actions for ${rawRoutine.name}. Raw count: ${rawRoutine.actions?.length}`
      );
      const actions = rawRoutine.actions
        .map((a: any) =>
          ActionFactory.create(
            a,
            this.adapter,
            this.stateManager,
            rawRoutine.id
          )
        )
        .filter((a: any) => a !== null) as Action[];

      return {
        ...rawRoutine,
        triggers,
        actions,
      };
    } catch (e) {
      debugLog(
        `[RoutineManager] Failed to hydrate routine ${rawRoutine.id}:`,
        e
      );
      return null;
    }
  }

  addRoutine(rawRoutine: Routine): void {
    const routine = this._hydrate(rawRoutine);
    if (routine) {
      // Validate
      const validation = RoutineValidator.validate(routine);
      if (!validation.valid) {
        debugLog(
          `[RoutineManager] Validation Failed for ${routine.name}: ${validation.error}`
        );
        this.routines.set(routine.id, routine);
        this.updateHealth(routine.id, RoutineHealth.ERROR, {
          type: ExecutionType.CHECK,
          status: ExecutionStatus.FAILURE,
          message: validation.error,
        });
        routine.enabled = false;
        this.save();
        return;
      }

      this.routines.set(routine.id, routine);
      this.save();
      this.evaluate().catch((e) =>
        debugLog('[RoutineManager] Error during addRoutine evaluation:', e)
      );
    }
  }

  removeRoutine(id: string): void {
    if (this._removeRoutine(id)) {
      this.save();
      this.evaluate().catch((e) =>
        debugLog('[RoutineManager] Error during removeRoutine evaluation:', e)
      );
    }
  }

  private _removeRoutine(id: string): boolean {
    const routine = this.routines.get(id);
    if (routine) {
      this.deactivateTriggers(routine);
      if (routine.isActive) {
        this.deactivateRoutine(routine);
      }
      this.routines.delete(id);
      this.routineStates.delete(id);
      return true;
    }
    return false;
  }

  getRoutine(id: string): Routine | undefined {
    return this.routines.get(id);
  }

  private _evaluationCount: number = 0;
  private _lastResetTime: number = Date.now();
  private _isFirstRun: boolean = true;

  async evaluate(forceActiveTriggers: Trigger[] = []): Promise<void> {
    try {
      // Safety Circuit Breaker
      const now = Date.now();
      if (now - this._lastResetTime > 60000) {
        this._evaluationCount = 0;
        this._lastResetTime = now;
      }

      this._evaluationCount++;
      if (this._evaluationCount > 100) {
        if (this._evaluationCount === 101) {
          debugLog(
            '[RoutineManager] CRITICAL: Excessive routine evaluations detected (>100/min). Pausing evaluations for safety.'
          );
          this.adapter.showNotification({
            title: 'Gnome Routines Error',
            message: 'Excessive activity detected. Routines paused for safety.',
            urgency: 'critical',
          });
        }
        return;
      }

      for (const routine of this.routines.values()) {
        try {
          // Ensure triggers are activated if routine is enabled
          if (routine.enabled) {
            this.activateTriggers(routine);
          } else {
            this.deactivateTriggers(routine);
          }

          if (!routine.enabled) {
            if (routine.isActive) {
              this.deactivateRoutine(routine);
            }
            continue;
          }

          const activeTriggers = await this.checkTriggers(
            routine.triggers,
            routine.matchType || 'all',
            forceActiveTriggers
          );
          const shouldBeActive = activeTriggers.length > 0;

          if (shouldBeActive && !routine.isActive) {
            // STRATEGY CHECK
            if (this._isFirstRun) {
              const allIgnorable = activeTriggers.every(
                (t) => t.strategy === TriggerStrategy.NEW_CHANGE_ONLY
              );

              if (allIgnorable) {
                debugLog(
                  `[RoutineManager] Skipping activation for ${routine.name} on first run (Trigger Strategy).`
                );
                routine.isActive = true;
                this.save();
                continue;
              }
            }

            // CONFLICT CHECK
            const conflicts = this.checkConflicts(routine);
            if (conflicts.length > 0) {
              debugLog(
                `[RoutineManager] Conflict detected for ${
                  routine.name
                }: ${conflicts.join(', ')}`
              );
              this.updateHealth(routine.id, RoutineHealth.WARNING, {
                type: ExecutionType.ACTIVATE,
                status: ExecutionStatus.WARNING, // Use WARNING instead of FAILURE
                message: `Conflict detected with: ${conflicts.join(', ')}`,
              });
              // Proceed anyway
            }

            debugLog(`[RoutineManager] Activating routine ${routine.name}`);
            this.activateRoutine(routine).catch((err) =>
              debugLog(
                `[RoutineManager] Error activating routine ${routine.name}:`,
                err
              )
            );
          } else if (!shouldBeActive && routine.isActive) {
            debugLog(`[RoutineManager] Deactivating routine ${routine.name}`);
            this.deactivateRoutine(routine).catch((err) =>
              debugLog(
                `[RoutineManager] Error deactivating routine ${routine.name}:`,
                err
              )
            );
          }
        } catch (routineError) {
          debugLog(
            `[RoutineManager] Error evaluating routine ${routine.id} (${routine.name}):`,
            routineError
          );
          this.updateHealth(routine.id, RoutineHealth.ERROR, {
            type: ExecutionType.CHECK,
            status: ExecutionStatus.FAILURE,
            message: `Evaluation failed: ${String(routineError)}`,
          });
        }
      }
    } catch (globalError) {
      debugLog('[RoutineManager] Fatal error in evaluate():', globalError);
    } finally {
      this._isFirstRun = false;
    }
  }

  private checkConflicts(candidate: Routine): string[] {
    const conflicts: Set<string> = new Set();
    const candidateResources = this.getRoutineResources(candidate);

    for (const active of this.routines.values()) {
      if (active.id === candidate.id) continue;
      if (!active.isActive) continue;

      const activeResources = this.getRoutineResources(active);
      // Check intersection
      for (const res of candidateResources) {
        if (activeResources.has(res)) {
          conflicts.add(active.name);
          break; // Found one conflict with this routine
        }
      }
    }
    return Array.from(conflicts);
  }

  private getRoutineResources(routine: Routine): Set<ResourceType> {
    const resources = new Set<ResourceType>();
    for (const action of routine.actions) {
      const resList = ACTION_RESOURCE_MAP[action.type];
      if (resList) {
        resList.forEach((r) => resources.add(r));
      }
    }
    return resources;
  }

  private activateTriggers(routine: Routine) {
    routine.triggers.forEach((trigger: any) => {
      debugLog(
        `[RoutineManager] Checking trigger activation for ${trigger.id} (active: ${trigger._isActivated})`
      );
      debugLog(
        `[RoutineManager] Trigger type: ${
          trigger.constructor.name
        }, has activate: ${typeof trigger.activate}`
      );

      if (trigger.activate && !trigger._isActivated) {
        trigger._isActivated = true;

        if (trigger.on) {
          trigger.on('triggered', async () => {
            try {
              debugLog(
                `[GR-DEBUG] [RoutineManager] Trigger ${trigger.id} fired for routine "${routine.name}". Evaluating condition...`
              );

              // Get trigger metadata to check if it's purely event-based
              const metadata =
                TRIGGER_METADATA[trigger.type as keyof typeof TRIGGER_METADATA];
              const isEventBasedOnly =
                metadata?.defaultStrategy === TriggerStrategy.NEW_CHANGE_ONLY;

              const isValid = isEventBasedOnly ? true : await trigger.check();
              debugLog(
                `[GR-DEBUG] [RoutineManager] Trigger check result for "${routine.name}": ${isValid} (eventBased: ${isEventBasedOnly})`
              );

              if (routine.isActive || isEventBasedOnly) {
                if (isValid) {
                  const state = this.getRoutineHealth(routine.id);
                  const timeSinceLastRun = Date.now() - state.lastRun;
                  if (timeSinceLastRun > 3000) {
                    // 3s debounce to prevent rapid re-execution
                    debugLog(
                      `[GR-DEBUG] [RoutineManager] Routine active & trigger valid & debounce passed (${timeSinceLastRun}ms). Re-executing actions.`
                    );
                    this.activateRoutine(routine).catch((err) =>
                      debugLog(
                        `[RoutineManager] Error re-executing routine ${routine.name}:`,
                        err
                      )
                    );
                  } else {
                    debugLog(
                      `[GR-DEBUG] [RoutineManager] Routine active & trigger valid but DEBOUNCED (${timeSinceLastRun}ms < 3000ms). Skipping re-execution.`
                    );
                  }
                } else {
                  debugLog(
                    `[GR-DEBUG] [RoutineManager] Routine active but trigger invalid (e.g. disconnected). Re-evaluating manager state...`
                  );
                  this.evaluate().catch((err) =>
                    debugLog(
                      '[RoutineManager] Error during triggered evaluation (active/invalid):',
                      err
                    )
                  );
                }
              } else {
                if (isValid) {
                  debugLog(
                    `[GR-DEBUG] [RoutineManager] Routine inactive & trigger valid. Evaluating with forced trigger...`
                  );
                  this.evaluate([trigger]).catch((err) =>
                    debugLog(
                      '[RoutineManager] Error during triggered evaluation (inactive/valid):',
                      err
                    )
                  );
                } else {
                  debugLog(
                    `[GR-DEBUG] [RoutineManager] Routine inactive & trigger invalid. Evaluating normal flow...`
                  );
                  this.evaluate().catch((err) =>
                    debugLog(
                      '[RoutineManager] Error during triggered evaluation (inactive/invalid):',
                      err
                    )
                  );
                }
              }
            } catch (triggeredError) {
              debugLog(
                `[RoutineManager] Error in trigger callback for ${trigger.id} on routine ${routine.name}:`,
                triggeredError
              );
            }
          });
          trigger.on('activate', () => {
            debugLog(`[RoutineManager] Trigger ${trigger.id} activated`);
            this.evaluate().catch((err) =>
              debugLog(
                '[RoutineManager] Error during trigger activate signal:',
                err
              )
            );
          });
          trigger.on('deactivate', () => {
            debugLog(`[RoutineManager] Trigger ${trigger.id} deactivated`);
            this.evaluate().catch((err) =>
              debugLog(
                '[RoutineManager] Error during trigger deactivate signal:',
                err
              )
            );
          });
        }

        try {
          trigger.activate();
        } catch (e) {
          debugLog(
            `[RoutineManager] Failed to activate trigger ${trigger.id}:`,
            e
          );
          trigger._isActivated = false; // Revert if failed
        }
      }
    });
  }

  private deactivateTriggers(routine: Routine) {
    routine.triggers.forEach((trigger: any) => {
      if (trigger.deactivate && trigger._isActivated) {
        trigger.deactivate();
        trigger._isActivated = false;
      }
    });
  }

  private async checkTriggers(
    triggers: Trigger[],
    matchType: 'any' | 'all',
    forceActiveTriggers: Trigger[] = []
  ): Promise<Trigger[]> {
    if (triggers.length === 0) return [];

    const activeTriggers: Trigger[] = [];
    for (const trigger of triggers) {
      if (forceActiveTriggers.some((t) => t.id === trigger.id)) {
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
      // ALL
      return activeTriggers.length === triggers.length ? activeTriggers : [];
    }
  }

  private async activateRoutine(routine: Routine) {
    debugLog(`Activating routine: ${routine.name}`);
    debugLog(`[RoutineManager] Routine has ${routine.actions.length} actions.`);
    routine.isActive = true;
    const state = this.getRoutineHealth(routine.id);
    state.lastRun = Date.now();
    state.runCount++;

    for (const action of routine.actions) {
      debugLog(
        `[GR-DEBUG] [RoutineManager] Executing action ${action.id} (Type: ${action.type}) for routine "${routine.name}"`
      );
      try {
        await action.execute();
        debugLog(
          `[GR-DEBUG] [RoutineManager] Action ${action.id} completed successfully.`
        );
      } catch (e) {
        debugLog(
          `[GR-DEBUG] Failed to execute action ${action.id} in routine ${routine.name}:`,
          e
        );
        this.updateHealth(routine.id, RoutineHealth.ERROR, {
          type: ExecutionType.ACTIVATE,
          status: ExecutionStatus.FAILURE,
          message: `Action ${action.type} failed: ${String(e)}`,
        });
        state.failureCount++;
        state.lastError = String(e);
      }
    }
    // If no crash, update success log if not already error
    if (state.health !== RoutineHealth.ERROR) {
      this.updateHealth(routine.id, RoutineHealth.OK, {
        type: ExecutionType.ACTIVATE,
        status: ExecutionStatus.SUCCESS,
      });
    }
  }

  private async deactivateRoutine(routine: Routine) {
    debugLog(`Deactivating routine: ${routine.name}`);
    routine.isActive = false;
    // Execute revert actions in reverse order
    for (let i = routine.actions.length - 1; i >= 0; i--) {
      const action = routine.actions[i];
      const onDeactivate = action.onDeactivate;

      if (onDeactivate) {
        if (onDeactivate.type === 'keep') {
          debugLog(`[RoutineManager] Keeping state for action ${action.id}`);
          continue;
        } else if (onDeactivate.type === 'custom' && onDeactivate.config) {
          debugLog(
            `[RoutineManager] Executing custom deactivation for action ${action.id}`
          );
          debugLog(
            `[RoutineManager] Custom config: ${JSON.stringify(
              onDeactivate.config
            )}`
          );
          const customAction = ActionFactory.create(
            { ...action, config: onDeactivate.config },
            this.adapter,
            this.stateManager,
            routine.id
          );
          if (customAction) {
            try {
              await customAction.execute();
            } catch (e) {
              debugLog(
                `[RoutineManager] Failed to execute custom deactivation for ${action.id}:`,
                e
              );
            }
          }
          continue;
        }
      }

      // Default behavior: Revert
      if (action.revert) {
        try {
          await action.revert();
        } catch (e) {
          debugLog(
            `Failed to revert action ${action.id} in routine ${routine.name}:`,
            e
          );
        }
      }
    }
  }

  destroy(): void {
    debugLog('[RoutineManager] Destroying manager...');
    this.routines.forEach((routine) => {
      try {
        this.deactivateTriggers(routine);
        if (routine.isActive) {
          routine.isActive = false;
        }
      } catch (e) {
        debugLog('Error destroying routine', e);
      }
    });
    this.routines.clear();
    this.routineStates.clear();
    debugLog('[RoutineManager] Manager destroyed.');
  }

  private async save(): Promise<void> {
    const list = Array.from(this.routines.values());
    await this.storage.saveRoutines(list);
  }

  getEnabledRoutineCount(): number {
    let count = 0;
    for (const routine of this.routines.values()) {
      if (routine.enabled) {
        count++;
      }
    }
    return count;
  }
}
