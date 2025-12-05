import { Routine, RoutineManagerInterface, Trigger, Action } from './types.js';
import { StorageAdapter } from './storage.js';
import { SystemAdapter } from '../gnome/adapters/adapter.js';
import { TriggerFactory } from './triggerFactory.js';
import { ActionFactory } from './actionFactory.js';
import { StateManager } from './stateManager.js';

export class RoutineManager implements RoutineManagerInterface {
  private routines: Map<string, Routine> = new Map();
  private storage: StorageAdapter;
  private adapter: SystemAdapter;
  private stateManager: StateManager;

  constructor(storage: StorageAdapter, adapter: SystemAdapter, settings: any) {
    this.storage = storage;
    this.adapter = adapter;
    this.stateManager = new StateManager(settings);
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
        // Modified - Replace
        // We compare raw JSON to avoid unnecessary deactivation/reactivation
        // But since we don't have raw of existing easily, we just replace.
        // To avoid flicker, we could check if enabled/triggers/actions changed.
        // For now, simple replace.
        debugLog(`[RoutineManager] Routine ${id} updated`);
        this._removeRoutine(id); // Deactivates if active
        this.routines.set(id, newRoutine);
      }
    }

    this.evaluate();
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
      return true;
    }
    return false;
  }

  getRoutine(id: string): Routine | undefined {
    return this.routines.get(id);
  }

  private _evaluationCount: number = 0;
  private _lastResetTime: number = Date.now();

  async evaluate(): Promise<void> {
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

      const shouldBeActive = await this.checkTriggers(
        routine.triggers,
        routine.matchType || 'all'
      );

      if (shouldBeActive && !routine.isActive) {
        debugLog(`[RoutineManager] Activating routine ${routine.name}`);
        this.activateRoutine(routine);
      } else if (!shouldBeActive && routine.isActive) {
        debugLog(`[RoutineManager] Deactivating routine ${routine.name}`);
        this.deactivateRoutine(routine);
      }
    }
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
          trigger.on('triggered', () => {
            debugLog(
              `[RoutineManager] Trigger ${trigger.id} fired for routine ${routine.name}.`
            );
            if (routine.isActive) {
              debugLog(
                `[RoutineManager] Routine is already active. Re-executing actions for event trigger.`
              );
              this.activateRoutine(routine);
            } else {
              debugLog(`[RoutineManager] Routine not active. Evaluating...`);
              this.evaluate();
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
    matchType: 'any' | 'all'
  ): Promise<boolean> {
    if (triggers.length === 0) return false;

    if (matchType === 'any') {
      // OR logic: At least one trigger must be true
      for (const trigger of triggers) {
        if (await trigger.check()) {
          return true;
        }
      }
      return false;
    } else {
      // AND logic: All triggers must be true
      for (const trigger of triggers) {
        if (!(await trigger.check())) {
          return false;
        }
      }
      return true;
    }
  }

  private async activateRoutine(routine: Routine) {
    debugLog(`Activating routine: ${routine.name}`);
    debugLog(`[RoutineManager] Routine has ${routine.actions.length} actions.`);
    routine.isActive = true;
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
      }
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

  private save() {
    this.storage.saveRoutines(Array.from(this.routines.values()));
  }
}
