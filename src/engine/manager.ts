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
      // Don't downgrade ERROR to WARNING or OK immediately unless specific success logic
      // Simplification: Set to new health
      state.health = health;
    }

    if (log) {
      state.history.unshift({
        timestamp: Date.now(),
        type: log.type || ExecutionType.CHECK,
        status: log.status || ExecutionStatus.SUCCESS,
        message: log.message,
      });
      // Limit history
      if (state.history.length > 50) state.history.pop();
    }

    // Persist to StateManager
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
        console.error(`[RoutineManager] Failed to hydrate routine: ${r.name}`);
      }
    });

    debugLog(`[RoutineManager] Total active routines: ${this.routines.size}`);
    this.evaluate();
  }

  async reload() {
    debugLog('[RoutineManager] Reloading routines from settings...');
    const rawRoutines = await this.storage.loadRoutines();
    const newRoutineMap = new Map<string, Routine>();

    // Hydrate new routines
    rawRoutines.forEach((r) => {
      const routine = this._hydrate(r);
      if (routine) newRoutineMap.set(routine.id, routine);
    });

    // 1. Handle Removed
    for (const id of this.routines.keys()) {
      if (!newRoutineMap.has(id)) {
        debugLog(`[RoutineManager] Routine ${id} removed`);
        this._removeRoutine(id);
      }
    }

    // 2. Handle Added & Modified
    for (const [id, newRoutine] of newRoutineMap) {
      const existing = this.routines.get(id);
      if (!existing) {
        // Added
        debugLog(`[RoutineManager] Routine ${id} added`);
        this.routines.set(id, newRoutine);
      } else {
        // Modified - Check if actually changed
        if (this.areRoutinesEqual(existing, newRoutine)) {
          debugLog(
            `[RoutineManager] Routine ${id} configuration unchanged. Keeping active state.`
          );
          continue;
        }

        debugLog(`[RoutineManager] Routine ${id} updated (config changed)`);
        this._removeRoutine(id); // Deactivates if active
        this.routines.set(id, newRoutine);
      }
    }

    this.evaluate();
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

    // Compare Actions
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
    // Simple JSON stringify comparison is usually sufficient for our config objects
    // as they are generated consistently.
    // Handle undefined/null explicitly if needed, but stringify handles null. source undefined becomes undefined.
    if (c1 === undefined && c2 === undefined) return true;
    if (c1 === undefined || c2 === undefined) return false;
    return JSON.stringify(c1) === JSON.stringify(c2);
  }

  private _hydrate(rawRoutine: any): Routine | null {
    try {
      const triggers = rawRoutine.triggers
        .map((t: any) => TriggerFactory.create(t, this.adapter))
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
      console.error(
        `[RoutineManager] Failed to hydrate routine ${rawRoutine.id}:`,
        e
      );
      return null;
    }
  }

  addRoutine(rawRoutine: Routine): void {
    const routine = this._hydrate(rawRoutine);
    if (routine) {
      this.routines.set(routine.id, routine);
      this.save();
      this.evaluate();
    }
  }

  removeRoutine(id: string): void {
    if (this._removeRoutine(id)) {
      this.save();
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
    // Safety Circuit Breaker
    const now = Date.now();
    if (now - this._lastResetTime > 60000) {
      this._evaluationCount = 0;
      this._lastResetTime = now;
    }

    this._evaluationCount++;
    if (this._evaluationCount > 100) {
      if (this._evaluationCount === 101) {
        console.error(
          '[RoutineManager] CRITICAL: Excessive routine evaluations detected (>100/min). Pausing evaluations for safety.'
        );
        this.adapter.showNotification(
          'Gnome Routines Error',
          'Excessive activity detected. Routines paused for safety.'
        );
      }
      return;
    }

    for (const routine of this.routines.values()) {
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
            (t) =>
              t.strategy === TriggerStrategy.INITIAL_IGNORE ||
              t.strategy === TriggerStrategy.EVENT_CHANGE
          );

          if (allIgnorable) {
            debugLog(
              `[RoutineManager] Skipping activation for ${routine.name} on first run (Trigger Strategy).`
            );
            routine.isActive = true; // Mark active silently
            // We should probably save this state change so next run knows it's active
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
        this.activateRoutine(routine); // This is async but we don't await in loop in original code
      } else if (!shouldBeActive && routine.isActive) {
        debugLog(`[RoutineManager] Deactivating routine ${routine.name}`);
        this.deactivateRoutine(routine);
      }
    }
    this._isFirstRun = false;
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
        // Mark as activated BEFORE calling activate() to prevent infinite recursion
        // if the trigger emits 'triggered' synchronously during activation (like AppTrigger)
        trigger._isActivated = true;

        // Listen for changes
        if (trigger.on) {
          trigger.on('triggered', async () => {
            debugLog(
              `[RoutineManager] Trigger ${trigger.id} fired for routine ${routine.name}.`
            );

            // Verify if the trigger condition is actually currently valid
            const isValid = await trigger.check();

            if (routine.isActive) {
              if (isValid) {
                debugLog(
                  `[RoutineManager] Routine active & trigger valid. Re-executing actions.`
                );
                this.activateRoutine(routine);
              } else {
                debugLog(
                  `[RoutineManager] Routine active but trigger invalid (e.g. disconnected). Evaluating...`
                );
                this.evaluate();
              }
            } else {
              if (isValid) {
                debugLog(
                  `[RoutineManager] Routine inactive & trigger valid. Evaluating with forced trigger...`
                );
                this.evaluate([trigger]);
              } else {
                debugLog(`[RoutineManager] Routine inactive. Evaluating...`);
                this.evaluate();
              }
            }
          });
          trigger.on('activate', () => {
            debugLog(`[RoutineManager] Trigger ${trigger.id} activated`);
            this.evaluate();
          });
          trigger.on('deactivate', () => {
            debugLog(`[RoutineManager] Trigger ${trigger.id} deactivated`);
            this.evaluate();
          });
        }

        try {
          trigger.activate();
        } catch (e) {
          console.error(
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
        // Remove listeners?
        // EventEmitter usually handles this if we implement off, but for now deactivation stops internal listeners.
        // We should ideally clean up our own listeners to avoid leaks if routine is removed.
        // But simplified for now.
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
      // If this trigger is in the forced list, treat it as true immediately
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
        `[RoutineManager] Executing action ${action.id} (Type: ${action.type})`
      );
      try {
        await action.execute();
      } catch (e) {
        console.error(
          `Failed to execute action ${action.id} in routine ${routine.name}:`,
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
    // If we didn't crash, update success log if not already error
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
          // Create a temporary action to execute the custom config
          const customAction = ActionFactory.create(
            { ...action, config: onDeactivate.config }, // Reuse type and ID, swap config
            this.adapter,
            this.stateManager,
            routine.id
          );
          if (customAction) {
            try {
              await customAction.execute();
            } catch (e) {
              console.error(
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
          console.error(
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
          // We should probably NOT execute revert actions on disable,
          // as that might be unexpected when just turning off the extension.
          // We just stop tracking.
          routine.isActive = false;
        }
      } catch (e) {
        console.error('Error destroying routine', e);
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
