import { BaseTrigger } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import { TriggerType, SystemTriggerConfig, TriggerStrategy } from '../types.js';
import debugLog from '../../utils/log.js';

export class DarkModeTrigger extends BaseTrigger {
  private adapter: SystemAdapter;
  public _isActivated: boolean = false;
  private _lastMatch: boolean | null = null;
  private cleanup: (() => void) | null = null;

  constructor(id: string, config: SystemTriggerConfig, adapter: SystemAdapter) {
    super(id, TriggerType.DARK_MODE, config);
    this.adapter = adapter;
  }

  async check(): Promise<boolean> {
    const currentState = await this.adapter.getDarkModeState();
    const targetState = this.config.state === 'on';

    debugLog(
      `[DarkModeTrigger] Checking state. Current: ${currentState}, Target: ${targetState}`
    );

    return currentState === targetState;
  }

  activate(): void {
    debugLog(`[DarkModeTrigger] Activating listener`);
    this._isActivated = true;

    // Initialize state
    this.check().then((initialState) => {
      if (this._lastMatch === null) {
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;

        if (shouldIgnoreInitial) {
          debugLog(
            `[DarkModeTrigger] Initial state: ${initialState} (Ignored)`
          );
          this._lastMatch = initialState;
        } else {
          debugLog(
            `[DarkModeTrigger] Initial state: ${initialState} (Checking immediate)`
          );
          this._lastMatch = initialState;

          if (initialState) {
            this.emit('triggered');
          }
        }
      }
    });

    const callback = async (isDark: boolean) => {
      const isMatch = await this.check();

      if (this._lastMatch === null) {
        const shouldIgnoreInitial =
          this.strategy === TriggerStrategy.NEW_CHANGE_ONLY;

        if (shouldIgnoreInitial) {
          debugLog(`[DarkModeTrigger] Initial Race: ${isMatch} (Ignored)`);
          this._lastMatch = isMatch;

          return;
        } else {
          debugLog(
            `[DarkModeTrigger] Initial Race: ${isMatch} (Checking immediate)`
          );
          this._lastMatch = isMatch;

          if (isMatch) {
            this.emit('triggered');
          }

          return;
        }
      }

      if (isMatch !== this._lastMatch) {
        debugLog(
          `[DarkModeTrigger] State changed: ${this._lastMatch} -> ${isMatch}`
        );
        this._lastMatch = isMatch;

        if (isMatch) {
          debugLog(
            `[DarkModeTrigger] Condition met (TRUE). Emitting 'triggered'.`
          );
        } else {
          debugLog(
            `[DarkModeTrigger] Condition lost (FALSE). Emitting 'triggered' to signal update.`
          );
        }

        this.emit('triggered');
      }
    };

    this.cleanup = this.adapter.onDarkModeStateChanged((isDark) =>
      callback(isDark)
    );
  }

  deactivate(): void {
    if (!this._isActivated) return;
    this._isActivated = false;
    this._lastMatch = null;

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }
}
