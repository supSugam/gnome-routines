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
    const rawRoutines = await this.storage.loadRoutines();
    rawRoutines.forEach((r) => {
      const routine = this._hydrate(r);
      if (routine) this.routines.set(routine.id, routine);
    });
    this.evaluate();
  }

  async reload() {
    console.log('[RoutineManager] Reloading routines from settings...');
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
        console.log(`[RoutineManager] Routine ${id} removed`);
        this._removeRoutine(id);
      }
    }

    // 2. Handle Added & Modified
    for (const [id, newRoutine] of newRoutineMap) {
      const existing = this.routines.get(id);
      if (!existing) {
        // Added
        console.log(`[RoutineManager] Routine ${id} added`);
        this.routines.set(id, newRoutine);
      } else {
        // Modified - Replace
        // We compare raw JSON to avoid unnecessary deactivation/reactivation
        // But since we don't have raw of existing easily, we just replace.
        // To avoid flicker, we could check if enabled/triggers/actions changed.
        // For now, simple replace.
        console.log(`[RoutineManager] Routine ${id} updated`);
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

  async evaluate(): Promise<void> {
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
        this.activateRoutine(routine);
      } else if (!shouldBeActive && routine.isActive) {
        this.deactivateRoutine(routine);
      }
    }
  }

  private activateTriggers(routine: Routine) {
    routine.triggers.forEach((trigger: any) => {
      if (trigger.activate && !trigger._isActivated) {
        // Mark as activated BEFORE calling activate() to prevent infinite recursion
        // if the trigger emits 'triggered' synchronously during activation (like AppTrigger)
        trigger._isActivated = true;

        // Listen for changes
        if (trigger.on) {
          trigger.on('triggered', () => {
            console.log(
              `[RoutineManager] Trigger ${trigger.id} fired for routine ${routine.name}`
            );
            this.evaluate();
          });
          trigger.on('activate', () => this.evaluate());
          trigger.on('deactivate', () => this.evaluate());
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
    console.log(`Activating routine: ${routine.name}`);
    routine.isActive = true;
    for (const action of routine.actions) {
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
    console.log(`Deactivating routine: ${routine.name}`);
    routine.isActive = false;
    // Execute revert actions in reverse order
    for (let i = routine.actions.length - 1; i >= 0; i--) {
      const action = routine.actions[i];
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
