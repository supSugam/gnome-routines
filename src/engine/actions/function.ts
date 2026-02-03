import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import {
  ActionType,
  OpenLinkActionConfig,
  OpenAppActionConfig,
  ScreenshotActionConfig,
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
    const urlsToOpen: string[] = [];

    // Migrate/Support legacy single URL
    if (this.config.url) {
      urlsToOpen.push(this.config.url);
    }

    // Support new multiple URLs
    if (this.config.urls && Array.isArray(this.config.urls)) {
      urlsToOpen.push(...this.config.urls);
    }

    // Deduplicate and open
    const uniqueUrls = [...new Set(urlsToOpen)];

    if (uniqueUrls.length === 0) {
      debugLog(
        `[OpenLinkAction] No URLs configured to open for action ${this.id}`
      );

      return;
    }

    for (const url of uniqueUrls) {
      this.adapter.openLink(url);
    }
  }

  async revert(): Promise<void> {
    // No revert
  }
}

export class ScreenshotAction extends BaseAction {
  constructor(
    id: string,
    config: ScreenshotActionConfig,
    adapter: SystemAdapter
  ) {
    super(id, ActionType.TAKE_SCREENSHOT, config, adapter);
  }

  async execute(): Promise<void> {
    const config = this.config as ScreenshotActionConfig;

    this.adapter.takeScreenshot(config.directory);
  }

  async revert(): Promise<void> {
    // No revert
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
    // No revert
  }
}
