
import { BaseAction } from '../base.js';
import { ActionType, ExecuteCommandActionConfig } from '../types.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import debugLog from '../../utils/log.js';

export class ExecuteCommandAction extends BaseAction {
  private adapter: SystemAdapter;
  public config: ExecuteCommandActionConfig;

  constructor(
    id: string,
    config: ExecuteCommandActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.EXECUTE_COMMAND, config);
    this.adapter = adapter;
    this.config = config;
  }

  async execute(): Promise<void> {
    debugLog(`[ExecuteCommandAction] Executing: ${this.config.command}`);
    this.adapter.executeCommand(this.config.command);
  }
}
