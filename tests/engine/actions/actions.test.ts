import { MockSystemAdapter } from '../../tests/mocks/adapter.mock';
import { ActionFactory } from '../../src/engine/actionFactory';
import { ActionType } from '../../src/engine/types';
import { StateManager } from '../../src/engine/stateManager';

// Mock StateManager
class MockStateManager extends StateManager {
    constructor() { super({ get_string: () => '{}', set_string: () => {} }); }
    getState() { return {}; }
    setState() {}
}

describe('Actions Logic', () => {
    let adapter: MockSystemAdapter;
    let stateManager: MockStateManager;

    beforeEach(() => {
        adapter = new MockSystemAdapter();
        stateManager = new MockStateManager();
    });

    test('WifiAction should toggle wifi', async () => {
        const action = ActionFactory.create({
            id: 'a1',
            type: ActionType.WIFI,
            config: { state: 'off' }
        }, adapter, stateManager, 'r1');

        if (!action) throw new Error('Action creation failed');

        adapter.wifiState = true;
        await action.execute();
        expect(adapter.wifiState).toBe(false);

        // Revert
        await action.revert();
        expect(adapter.wifiState).toBe(true);
    });

    test('VolumeAction should set volume', async () => {
        const action = ActionFactory.create({
            id: 'a2',
            type: ActionType.VOLUME,
            config: { level: 80 }
        }, adapter, stateManager, 'r1');

        if (!action) throw new Error('Action creation failed');

        adapter.volume = 50;
        await action.execute();
        expect(adapter.volume).toBe(80);

        // Previous state logic requires StateManager to persist "original" value.
        // Mock state manager doesn't persist, so revert might rely on internal capture.
        // BaseAction typically captures state before execute.
        
        await action.revert();
        expect(adapter.volume).toBe(50);
    });
});
