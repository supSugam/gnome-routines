import debugLog from '../../utils/log.js';
import { Routine, Trigger, Action } from '../types.js';
import { StorageAdapter } from '../storage.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { TriggerFactory } from '../triggerFactory.js';
import { ActionFactory } from '../actionFactory.js';
import { StateManager } from '../stateManager.js';

/**
 * RoutineRepository
 * Single Responsibility: Data access and routine object lifecycle.
 */
export class RoutineRepository {
  private routines: Map<string, Routine> = new Map();
  private storage: StorageAdapter;
  private adapter: SystemAdapter;
  private stateManager: StateManager;

  constructor(
    storage: StorageAdapter,
    adapter: SystemAdapter,
    stateManager: StateManager
  ) {
    this.storage = storage;
    this.adapter = adapter;
    this.stateManager = stateManager;
  }

  /** Load and hydrate routines from storage */
  async load(): Promise<void> {
    debugLog('[RoutineRepository] Loading routines from storage...');
    const rawRoutines = await this.storage.loadRoutines();
    debugLog(`[RoutineRepository] Loaded ${rawRoutines.length} raw routines`);

    rawRoutines.forEach((raw) => {
      const routine = this.hydrate(raw);
      if (routine) {
        this.routines.set(routine.id, routine);
        debugLog(`[RoutineRepository] Hydrated: ${routine.name}`);
      } else {
        debugLog(`[RoutineRepository] Failed to hydrate: ${raw.name}`);
      }
    });

    debugLog(`[RoutineRepository] Total routines: ${this.routines.size}`);
  }

  /** Save all routines */
  async save(): Promise<void> {
    const list = Array.from(this.routines.values());
    await this.storage.saveRoutines(list);
  }

  get(id: string): Routine | undefined {
    return this.routines.get(id);
  }

  getAll(): Routine[] {
    return Array.from(this.routines.values());
  }

  values(): IterableIterator<Routine> {
    return this.routines.values();
  }

  has(id: string): boolean {
    return this.routines.has(id);
  }

  get size(): number {
    return this.routines.size;
  }

  set(id: string, routine: Routine): void {
    this.routines.set(id, routine);
  }

  delete(id: string): boolean {
    return this.routines.delete(id);
  }

  clear(): void {
    this.routines.clear();
  }

  /** Hydrate a raw routine from storage */
  hydrate(rawRoutine: any): Routine | null {
    try {
      const triggers = (rawRoutine.triggers || [])
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
        `[RoutineRepository] Hydrating actions for ${rawRoutine.name}. Count: ${rawRoutine.actions?.length || 0}`
      );

      const actions = (rawRoutine.actions || [])
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
      debugLog(`[RoutineRepository] Hydration failed for ${rawRoutine.id}:`, e);
      return null;
    }
  }

  /** Compare two routines (config-based) */
  areEqual(r1: Routine, r2: Routine): boolean {
    if (
      r1.name !== r2.name ||
      r1.enabled !== r2.enabled ||
      r1.matchType !== r2.matchType
    ) {
      return false;
    }

    // Triggers
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

    // Actions
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

  getEnabledCount(): number {
    let count = 0;
    for (const routine of this.routines.values()) {
      if (routine.enabled) count++;
    }
    return count;
  }
}
