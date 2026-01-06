import {
  RoutineHealth,
  RoutineState,
  ExecutionLog,
  ExecutionType,
  ExecutionStatus,
} from '../types.js';
import { StateManager } from '../stateManager.js';

/**
 * HealthTracker - Tracks routine execution health and history.
 * Single Responsibility: Health state management.
 */
export class HealthTracker {
  private states: Map<string, RoutineState> = new Map();
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  /** Get health state for a routine, creating default if needed */
  getHealth(id: string): RoutineState {
    let state = this.states.get(id);
    if (!state) {
      state = {
        health: RoutineHealth.UNKNOWN,
        lastRun: 0,
        runCount: 0,
        failureCount: 0,
        history: [],
      };
      this.states.set(id, state);
    }
    return state;
  }

  /** Update health status and optionally add a log entry */
  updateHealth(
    id: string,
    health: RoutineHealth,
    log?: Partial<ExecutionLog>
  ): void {
    const state = this.getHealth(id);

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
      // Keep history capped at 50 entries
      if (state.history.length > 50) {
        state.history.pop();
      }
    }

    this.stateManager.setState(id, 'health_status', state);
  }

  /** Record a successful execution */
  recordSuccess(id: string, message?: string): void {
    const state = this.getHealth(id);
    state.lastRun = Date.now();
    state.runCount++;

    this.updateHealth(id, RoutineHealth.OK, {
      type: ExecutionType.ACTIVATE,
      status: ExecutionStatus.SUCCESS,
      message,
    });
  }

  /** Record a failed execution */
  recordFailure(id: string, error: string): void {
    const state = this.getHealth(id);
    state.failureCount++;
    state.lastError = error;

    this.updateHealth(id, RoutineHealth.ERROR, {
      type: ExecutionType.ACTIVATE,
      status: ExecutionStatus.FAILURE,
      message: error,
    });
  }

  /** Record a warning (non-fatal issue) */
  recordWarning(id: string, message: string): void {
    this.updateHealth(id, RoutineHealth.WARNING, {
      type: ExecutionType.ACTIVATE,
      status: ExecutionStatus.WARNING,
      message,
    });
  }

  /** Remove health state for a routine */
  delete(id: string): void {
    this.states.delete(id);
  }

  /** Clear all health states */
  clear(): void {
    this.states.clear();
  }
}
