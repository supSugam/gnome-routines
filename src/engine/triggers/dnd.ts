import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { TriggerType, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

export class DndTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;
  private _lastMatchState: boolean | null = null;
  private _initialized: boolean = false;
  private cleanup: (() => void) | null = null;

  constructor(id: string, config: any, adapter: SystemAdapter) {
    // Use default strategy
    super(id, TriggerType.DND, config);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    const currentState = this.adapter.getDND();
    const targetState = this.config.state === 'on';

    debugLog(
      `[DndTrigger] Checking state. Current: ${currentState}, Target: ${targetState}`
    );

    return currentState === targetState;
  }

  activate(): void {
    debugLog(
      `[DndTrigger] Activating listener. State: ${this.config.state}, Strategy: ${this.strategy}`
    );
    this._isActivated = true;
    this._initialized = false;
    this._lastMatchState = null;

    // Check strategy
    const shouldIgnoreInitial =
      this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;

    this.check().then((initialState) => {
      if (!this._initialized) {
        if (shouldIgnoreInitial) {
          debugLog(
            `[DndTrigger] Initial State: ${initialState} (Baselined - Ignored by Strategy)`
          );
          this._lastMatchState = initialState;
          this._initialized = true;
        } else {
          debugLog(
            `[DndTrigger] Initial State: ${initialState} (Checking for immediate trigger)`
          );
          this._lastMatchState = initialState;
          this._initialized = true;

          if (initialState) {
            debugLog(`[DndTrigger] Initial State met. Emitting 'triggered'.`);
            this.emit('triggered');
          }
        }
      }
    });

    if (this.adapter.onDndStateChanged) {
      this.cleanup = this.adapter.onDndStateChanged(async (isDnd) => {
        if (!this._isActivated) return;

        const targetState = this.config.state === 'on';
        const isMatch = isDnd === targetState;

        if (!this._initialized) {
          // Race condition
          if (shouldIgnoreInitial) {
            debugLog(
              `[DndTrigger] Initial Event: ${isMatch} (Baselined - Ignored)`
            );
            this._lastMatchState = isMatch;
            this._initialized = true;

            return;
          } else {
            debugLog(
              `[DndTrigger] Initial Event: ${isMatch} (Checking immediate)`
            );
            this._lastMatchState = isMatch;
            this._initialized = true;

            if (isMatch) {
              this.emit('triggered');
            }

            return;
          }
        }

        if (isMatch !== this._lastMatchState) {
          debugLog(
            `[DndTrigger] State transition: ${this._lastMatchState} -> ${isMatch}`
          );
          this._lastMatchState = isMatch;

          if (isMatch) {
            debugLog(
              `[DndTrigger] Condition met (TRUE). Emitting 'triggered'.`
            );
          } else {
            debugLog(
              `[DndTrigger] Condition lost (FALSE). Emitting 'triggered' to signal update.`
            );
          }

          this.emit('triggered');
        }
      });
    } else {
      debugLog(`[DndTrigger] Adapter does not support onDndStateChanged!`);
    }
  }

  deactivate(): void {
    if (!this._isActivated) return;
    this._isActivated = false;
    this._lastMatchState = null;
    this._initialized = false;

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }

    debugLog(`[DndTrigger] Deactivated`);
  }
}
