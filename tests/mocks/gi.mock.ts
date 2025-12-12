// State to control mocks from tests
export class MockState {
  currentTime: Date = new Date();
  intervals: Map<number, Function> = new Map();
  intervalIdCounter = 1;

  setCurrentTime(date: Date) {
    this.currentTime = date;
  }
}

export const mockState = new MockState();

export const GLib = {
  PRIORITY_DEFAULT: 0,
  DateTime: {
    new_now_local: () => {
      const d = mockState.currentTime;
      return {
        get_hour: () => d.getHours(),
        get_minute: () => d.getMinutes(),
        get_day_of_week: () => {
          // GLib: 1=Mon...7=Sun. JS: 0=Sun, 1=Mon...
          const jsDay = d.getDay();
          return jsDay === 0 ? 7 : jsDay;
        },
        compare: (other: any) => 0,
      };
    },
  },
  timeout_add_seconds: (
    priority: number,
    seconds: number,
    callback: () => boolean
  ) => {
    const id = mockState.intervalIdCounter++;
    mockState.intervals.set(id, callback);
    return id;
  },
  source_remove: (id: number) => {
    mockState.intervals.delete(id);
  },
};

// Handle both Default and Named exports for compatibility
export default GLib;
