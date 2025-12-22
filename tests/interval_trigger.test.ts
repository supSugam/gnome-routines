import { IntervalTrigger } from '../src/engine/triggers/interval';
import { SystemAdapter } from '../src/gnome/adapters/adapter';

// Mock GLib inline to avoid hoisting issues
jest.mock(
  'gi://GLib',
  () => {
    const mockImpl = {
      timeout_add_seconds: jest.fn(),
      source_remove: jest.fn(),
      PRIORITY_DEFAULT: 0,
      SOURCE_CONTINUE: true,
    };
    return {
      __esModule: true,
      default: mockImpl,
      ...mockImpl,
    };
  },
  { virtual: true }
);

// @ts-ignore
const GLib = require('gi://GLib');

describe('IntervalTrigger', () => {
  let trigger: IntervalTrigger;
  let mockAdapter: SystemAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter = {} as SystemAdapter;
  });

  it('should activate logic with correct interval (minutes)', () => {
    trigger = new IntervalTrigger(
      'test-id',
      { interval: 30, unit: 'minutes' },
      mockAdapter
    );
    trigger.activate();

    // Access the mock directly via the required module
    expect(GLib.timeout_add_seconds).toHaveBeenCalledTimes(1);
    expect(GLib.timeout_add_seconds).toHaveBeenCalledWith(
      0,
      1800, // 30 * 60
      expect.any(Function)
    );
  });

  it('should activate logic with correct interval (hours)', () => {
    trigger = new IntervalTrigger(
      'test-id',
      { interval: 2, unit: 'hours' },
      mockAdapter
    );
    trigger.activate();

    expect(GLib.timeout_add_seconds).toHaveBeenCalledWith(
      0,
      7200, // 2 * 3600
      expect.any(Function)
    );
  });

  it('should enforce minimum 60s interval', () => {
    trigger = new IntervalTrigger(
      'test-id',
      { interval: 0, unit: 'minutes' },
      mockAdapter
    );
    trigger.activate();
    expect(GLib.timeout_add_seconds).not.toHaveBeenCalled();

    trigger = new IntervalTrigger(
      'test-id',
      { interval: 0.5, unit: 'minutes' },
      mockAdapter
    );
    trigger.activate();
    expect(GLib.timeout_add_seconds).toHaveBeenCalledWith(
      0,
      60,
      expect.any(Function)
    );
  });

  it('should deactivate logic by removing source', () => {
    (GLib.timeout_add_seconds as jest.Mock).mockReturnValue(123);
    trigger = new IntervalTrigger(
      'test-id',
      { interval: 10, unit: 'minutes' },
      mockAdapter
    );
    trigger.activate(); // ID = 123

    trigger.deactivate();
    expect(GLib.source_remove).toHaveBeenCalledWith(123);
  });

  it('should fail gracefully if deactivate called without active timer', () => {
    trigger = new IntervalTrigger(
      'test-id',
      { interval: 10, unit: 'minutes' },
      mockAdapter
    );
    trigger.deactivate();
    expect(GLib.source_remove).not.toHaveBeenCalled();
  });
});
