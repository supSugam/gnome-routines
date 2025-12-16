import { ActionType, NotificationActionConfig } from '../types.js';
import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import debugLog from '../../utils/log.js';

export class NotificationAction extends BaseAction {
  constructor(
    id: string,
    config: NotificationActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.NOTIFICATION, config, adapter);
  }

  async execute(): Promise<void> {
    const config = this.config as NotificationActionConfig;
    debugLog(`[NotificationAction] Showing notification: ${config.title}`);
    this.adapter.showNotification(config);
  }

  revert(): void {
    // No revert for notification
  }
}
