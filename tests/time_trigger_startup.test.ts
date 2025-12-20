
import { TimeTrigger } from '../src/engine/triggers/time';
// @ts-ignore
import { mockState } from './mocks/gi.mock';

// Mock debugLog to avoid console spam and filesystem errors
jest.mock('../src/utils/log', () => ({
    __esModule: true,
    default: jest.fn()
}));


describe('TimeTrigger Startup Behavior', () => {
    let trigger: TimeTrigger;

    beforeEach(() => {
        mockState.intervals.clear();
        mockState.intervalIdCounter = 1;
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (trigger) trigger.deactivate();
    });

    it('should fire IMMEDIATELY on activate if current time is within time window', async () => {
        // Setup current time to 6:00 PM (18:00)
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        mockState.setCurrentTime(d);

        // Configure trigger for 5pm - 10pm (17:00 - 22:00)
        trigger = new TimeTrigger('test-startup-id', {
            startTime: '17:00',
            endTime: '22:00',
            days: []
        });

        const emitSpy = jest.fn();
        trigger.on('triggered' as any, emitSpy);

        // ACT
        trigger.activate();
        
        // Wait a microtask to allow any immediate async checks to resolve
        await new Promise(resolve => process.nextTick(resolve));

        // ASSERT
        // Should have fired once immediately without waiting for interval
        expect(emitSpy).toHaveBeenCalledTimes(1); 
    });

    it('should NOT fire on activate if current time is OUTSIDE time window', async () => {
        // Setup current time to 2:00 PM (14:00)
        const d = new Date();
        d.setHours(14, 0, 0, 0);
        mockState.setCurrentTime(d);

        // Configure trigger for 5pm - 10pm (17:00 - 22:00)
        trigger = new TimeTrigger('test-startup-outside-id', {
            startTime: '17:00',
            endTime: '22:00',
            days: []
        });

        const emitSpy = jest.fn();
        trigger.on('triggered' as any, emitSpy);

        // ACT
        trigger.activate();
        
        await new Promise(resolve => process.nextTick(resolve));

        // ASSERT
        expect(emitSpy).not.toHaveBeenCalled();
    });
});
