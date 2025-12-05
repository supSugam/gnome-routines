import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';
import {
  ActionType,
  OpenLinkActionConfig,
  OpenAppActionConfig,
} from '../types.js';

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
    this.adapter.openApp(this.config.appIds || []);
  }

  async revert(): Promise<void> {
    // Could close app, but that's aggressive.
  }
}
