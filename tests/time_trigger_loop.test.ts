
import { TimeTrigger } from '../src/engine/triggers/time';
// @ts-ignore
import { mockState } from './mocks/gi.mock';

describe('TimeTrigger', () => {
    let trigger: TimeTrigger;

    beforeEach(() => {
        mockState.intervals.clear();
        mockState.intervalIdCounter = 1;
        // Default time: 10:00 (inside 09-17 range)
        const d = new Date();
        d.setHours(10, 0, 0, 0);
        mockState.setCurrentTime(d);
    });

    afterEach(() => {
        if (trigger) trigger.deactivate();
    });

    it('should NOT emit triggered event repeatedly if state remains same (Fix Verification)', async () => {
        trigger = new TimeTrigger('test-id', {
            startTime: '09:00',
            endTime: '17:00',
            days: []
        });

        const emitSpy = jest.fn();
        trigger.on('triggered' as any, emitSpy);

        trigger.activate();

        // Get the interval callback
        // The first interval added should be ID 1 given our mock reset
        const callback = mockState.intervals.get(1);
        expect(callback).toBeDefined();

        // --- Minute 1 ---
        // Time is 10:00. Trigger is active (true).
        // _lastState starts as false. So this should be a State Change -> Emit.
        await (callback as any)();
        
        // In current BUGGY implementation, it emits blindly.
        // In FIXED implementation, check()=true, lastState=false -> New=true -> Emit.
        
        // Note: For the test to pass with the FIX, I need to know what to expect.
        // But for reproduction, I want to see failure (re-emit).
        // I will write the test assuming the FIX.
        // So I expect 1 call here.
        expect(emitSpy).toHaveBeenCalledTimes(1);

        // --- Minute 2 ---
        // Advance time to 10:01 (still active)
        const d2 = new Date(); 
        d2.setHours(10, 1, 0, 0);
        mockState.setCurrentTime(d2);

        await (callback as any)();

        // Current BUGGY implementation: Emits again -> Total 2.
        // FIXED implementation: check()=true, lastState=true -> No Change -> No Emit -> Total 1.
        expect(emitSpy).toHaveBeenCalledTimes(1); 
    });
    
    it('should emit when state changes from valid to invalid', async () => {
        trigger = new TimeTrigger('test-id-2', {
            startTime: '09:00',
            endTime: '10:00', // Ends at 10:00
            days: []
        });

        const emitSpy = jest.fn();
        trigger.on('triggered' as any, emitSpy);
        trigger.activate();
        const callback = mockState.intervals.get(mockState.intervalIdCounter - 1)!;

        // Time: 10:00. Range: 09:00 - 10:00.
        // check() logic:
        // currentMinutes (600) < endTotal (600) ? 
        // 10:00 is EXCLUSIVE of end?
        // time.ts values: startTotal = 540, endTotal = 600.
        // isActive = current >= start && current < end.
        // So 10:00 is INVALID.
        
        // Let's start with VALID time. 09:30.
        const t1 = new Date(); t1.setHours(9, 30, 0);
        mockState.setCurrentTime(t1);
        
        // Trigger check. 
        await (callback as any)(); 
        // Should become TRUE. lastState=false. -> Emit 1.
        expect(emitSpy).toHaveBeenCalledTimes(1);
        
        // Advance to 10:00 (Invalid)
        const t2 = new Date(); t2.setHours(10, 0, 0);
        mockState.setCurrentTime(t2);
        
        await (callback as any)();
        // Should become FALSE. lastState=true. -> Change -> Emit 2.
        expect(emitSpy).toHaveBeenCalledTimes(2);
        
        // Advance to 10:01 (Still Invalid)
        const t3 = new Date(); t3.setHours(10, 1, 0);
        mockState.setCurrentTime(t3);
        
        await (callback as any)();
        // Should remain FALSE. lastState=false. -> No Change -> Emit 2.
        expect(emitSpy).toHaveBeenCalledTimes(2);
    });
});
