import { BaseAction } from './base.js';
import { SystemAdapter } from '../../gnome/adapters/adapter.js';

export class OpenLinkAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: { url: string }, adapter: SystemAdapter) {
        super(id, 'open_link', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        this.adapter.openLink(this.config.url);
    }

    async revert(): Promise<void> {
        // Cannot revert opening a link
    }
}

export class ScreenshotAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: {}, adapter: SystemAdapter) {
        super(id, 'screenshot', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        this.adapter.takeScreenshot();
    }

    async revert(): Promise<void> {
        // Cannot revert screenshot
    }
}

export class OpenAppAction extends BaseAction {
    private adapter: SystemAdapter;

    constructor(id: string, config: { appIds: string[] }, adapter: SystemAdapter) {
        super(id, 'open_app', config);
        this.adapter = adapter;
    }

    async execute(): Promise<void> {
        this.adapter.openApp(this.config.appIds || []);
    }

    async revert(): Promise<void> {
        // Could close app, but that's aggressive.
    }
}
