import debugLog from '../utils/log.js';
import {
  Routine,
  RoutineManagerInterface,
  Trigger,
  RoutineState,
  RoutineHealth,
  TriggerStrategy,
  ExecutionType,
  ExecutionStatus,
} from './types.js';
import { StorageAdapter } from './storage.js';
import { SystemAdapter } from '../gnome/adapters/adapter.js';
import { StateManager } from './stateManager.js';
import { RoutineValidator } from './validator.js';
import {
  RoutineRepository,
  HealthTracker,
  ConflictDetector,
  TriggerOrchestrator,
  RoutineExecutor,
} from './services/index.js';

/**
 * RoutineManager
 * Orchestrates routine evaluation and lifecycle.
 */
export class RoutineManager implements RoutineManagerInterface {
  private repository: RoutineRepository;
  private healthTracker: HealthTracker;
  private conflictDetector: ConflictDetector;
  private triggerOrchestrator: TriggerOrchestrator;
  private executor: RoutineExecutor;
  private adapter: SystemAdapter;

  // Check frequency
  private _evaluationCount: number = 0;
  private _lastResetTime: number = Date.now();
  private _isFirstRun: boolean = true;

  constructor(storage: StorageAdapter, adapter: SystemAdapter, settings: any) {
    this.adapter = adapter;
    const stateManager = new StateManager(settings);

    this.healthTracker = new HealthTracker(stateManager);
    this.repository = new RoutineRepository(storage, adapter, stateManager);
    this.conflictDetector = new ConflictDetector();
    this.executor = new RoutineExecutor(
      adapter,
      stateManager,
      this.healthTracker
    );

    // Callbacks
    this.triggerOrchestrator = new TriggerOrchestrator({
      getRoutineHealth: (id) => this.healthTracker.getHealth(id),
      activateRoutine: (routine) => this.activateRoutine(routine),
      evaluate: (triggers) => this.evaluate(triggers),
    });
  }

  getRoutineHealth(id: string): RoutineState {
    return this.healthTracker.getHealth(id);
  }

  async load(): Promise<void> {
    debugLog('[RoutineManager] load() called');
    await this.repository.load();
    debugLog(`[RoutineManager] Total routines: ${this.repository.size}`);

    this.evaluate().catch((e) =>
      debugLog('[RoutineManager] Error during initial evaluation:', e)
    );
  }

  async reload(): Promise<void> {
    debugLog('[RoutineManager] Reloading from settings...');
    this._isFirstRun = true;

    // Get fresh data from storage
    const storage = (this.repository as any).storage;
    const rawRoutines = await storage.loadRoutines();
    const newRoutines = new Map<string, Routine>();

    for (const raw of rawRoutines) {
      const routine = this.repository.hydrate(raw);

      if (routine) newRoutines.set(routine.id, routine);
    }

    // Remove deleted routines
    for (const id of Array.from(this.repository.values()).map((r) => r.id)) {
      if (!newRoutines.has(id)) {
        debugLog(`[RoutineManager] Routine ${id} removed`);
        this.removeRoutineInternal(id);
      }
    }

    // Add/update routines
    for (const [id, newRoutine] of newRoutines) {
      const existing = this.repository.get(id);

      if (!existing) {
        debugLog(`[RoutineManager] Routine ${id} added`);
        this.repository.set(id, newRoutine);
      } else if (!this.repository.areEqual(existing, newRoutine)) {
        debugLog(`[RoutineManager] Routine ${id} updated`);
        this.removeRoutineInternal(id);
        this.repository.set(id, newRoutine);
        newRoutine.isActive = false;
      }
    }

    this.evaluate().catch((e) =>
      debugLog('[RoutineManager] Error during reload evaluation:', e)
    );
  }

  addRoutine(rawRoutine: Routine): void {
    const routine = this.repository.hydrate(rawRoutine);

    if (!routine) return;

    // Validate
    const validation = RoutineValidator.validate(routine);

    if (!validation.valid) {
      debugLog(`[RoutineManager] Validation failed: ${validation.error}`);
      this.repository.set(routine.id, routine);
      this.healthTracker.updateHealth(routine.id, RoutineHealth.ERROR, {
        type: ExecutionType.CHECK,
        status: ExecutionStatus.FAILURE,
        message: validation.error,
      });
      routine.enabled = false;
      this.save();

      return;
    }

    this.repository.set(routine.id, routine);
    this.save();
    this.evaluate().catch((e) =>
      debugLog('[RoutineManager] Error during addRoutine evaluation:', e)
    );
  }

  removeRoutine(id: string): void {
    if (this.removeRoutineInternal(id)) {
      this.save();
      this.evaluate().catch((e) =>
        debugLog('[RoutineManager] Error during removeRoutine evaluation:', e)
      );
    }
  }

  getRoutine(id: string): Routine | undefined {
    return this.repository.get(id);
  }

  getEnabledRoutineCount(): number {
    return this.repository.getEnabledCount();
  }

  destroy(): void {
    debugLog('[RoutineManager] Destroying...');

    for (const routine of this.repository.values()) {
      try {
        this.triggerOrchestrator.deactivateAll(routine);
        routine.isActive = false;
      } catch (e) {
        debugLog('[RoutineManager] Error destroying routine:', e);
      }
    }

    this.repository.clear();
    this.healthTracker.clear();
    debugLog('[RoutineManager] Destroyed');
  }

  async evaluate(forceActiveTriggers: Trigger[] = []): Promise<void> {
    try {
      // Check frequency
      const now = Date.now();

      if (now - this._lastResetTime > 60000) {
        this._evaluationCount = 0;
        this._lastResetTime = now;
      }

      this._evaluationCount++;

      if (this._evaluationCount > 100) {
        if (this._evaluationCount === 101) {
          debugLog(
            '[RoutineManager] CRITICAL: Excessive evaluations (>100/min). Pausing.'
          );
          this.adapter.showNotification({
            title: 'Gnome Routines Error',
            message: 'Excessive activity detected. Routines paused for safety.',
            urgency: 'critical',
          });
        }

        return;
      }

      for (const routine of this.repository.values()) {
        await this.evaluateRoutine(routine, forceActiveTriggers);
      }
    } catch (e) {
      debugLog('[RoutineManager] Fatal error in evaluate():', e);
    } finally {
      this._isFirstRun = false;
    }
  }

  private async evaluateRoutine(
    routine: Routine,
    forceActiveTriggers: Trigger[]
  ): Promise<void> {
    try {
      // Lifecycle management
      if (routine.enabled) {
        this.triggerOrchestrator.activateAll(routine);
      } else {
        this.triggerOrchestrator.deactivateAll(routine);

        if (routine.isActive) {
          await this.deactivateRoutine(routine);
        }

        return;
      }

      const activeTriggers = await this.triggerOrchestrator.checkAll(
        routine.triggers,
        routine.matchType || 'all',
        forceActiveTriggers
      );
      const shouldBeActive = activeTriggers.length > 0;

      if (shouldBeActive && !routine.isActive) {
        // Strategy check
        if (this._isFirstRun) {
          const allIgnorable = activeTriggers.every(
            (t) => t.strategy === TriggerStrategy.NEW_CHANGE_ONLY
          );

          if (allIgnorable) {
            debugLog(
              `[RoutineManager] Skipping ${routine.name} on first run (strategy)`
            );
            routine.isActive = true;
            this.save();

            return;
          }
        }

        const conflicts = this.conflictDetector.checkConflicts(
          routine,
          this.repository.values()
        );

        if (conflicts.length > 0) {
          debugLog(
            `[RoutineManager] Conflict for ${routine.name}: ${conflicts.join(', ')}`
          );
          this.healthTracker.recordWarning(
            routine.id,
            `Conflict with: ${conflicts.join(', ')}`
          );
        }

        debugLog(`[RoutineManager] Activating ${routine.name}`);
        await this.activateRoutine(routine);
      } else if (!shouldBeActive && routine.isActive) {
        debugLog(`[RoutineManager] Deactivating ${routine.name}`);
        await this.deactivateRoutine(routine);
      }
    } catch (e) {
      debugLog(`[RoutineManager] Error evaluating ${routine.name}:`, e);
      this.healthTracker.recordFailure(
        routine.id,
        `Evaluation failed: ${String(e)}`
      );
    }
  }

  private async activateRoutine(routine: Routine): Promise<void> {
    await this.executor.activate(routine);
  }

  private async deactivateRoutine(routine: Routine): Promise<void> {
    await this.executor.deactivate(routine);
  }

  private removeRoutineInternal(id: string): boolean {
    const routine = this.repository.get(id);

    if (!routine) return false;

    this.triggerOrchestrator.deactivateAll(routine);

    if (routine.isActive) {
      this.executor.deactivate(routine);
    }

    this.repository.delete(id);
    this.healthTracker.delete(id);

    return true;
  }

  private async save(): Promise<void> {
    await this.repository.save();
  }
}
