import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import {
  ActionType,
  OpenLinkActionConfig,
  OpenAppActionConfig,
} from '../types.js';
import debugLog from '../../utils/log.js';

export class OpenLinkAction extends BaseAction {
  constructor(
    id: string,
    config: OpenLinkActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.OPEN_LINK, config, adapter);
  }

  async execute(): Promise<void> {
    this.adapter.openLink(this.config.url);
  }

  async revert(): Promise<void> {
    // Cannot revert opening a link
  }
}

export class ScreenshotAction extends BaseAction {
  constructor(id: string, config: {}, adapter: SystemAdapter) {
    super(id, ActionType.TAKE_SCREENSHOT, config, adapter);
  }

  async execute(): Promise<void> {
    this.adapter.takeScreenshot();
  }

  async revert(): Promise<void> {
    // Cannot revert screenshot
  }
}

export class OpenAppAction extends BaseAction {
  constructor(id: string, config: OpenAppActionConfig, adapter: SystemAdapter) {
    super(id, ActionType.OPEN_APP, config, adapter);
  }

  async execute(): Promise<void> {
    const apps = this.config.appIds || [];
    if (apps.length === 0) {
      debugLog(
        `[OpenAppAction] No apps configured to open for action ${this.id}`
      );
      return;
    }
    this.adapter.openApp(apps);
  }

  async revert(): Promise<void> {
    // Could close app, but that's aggressive.
  }
}
