import { IntervalTriggerEditor } from '../src/ui/features/interval/triggerEditor';

// Mock UI components
const mockGroup = { add: jest.fn() };
const mockAdjustment = {
  connect: jest.fn(),
  value: 30,
  upper: 1000,
};
const mockSpinRow = {
  connect: jest.fn(),
  value: 30,
};
const mockComboRow = {
  connect: jest.fn(),
  selected: 0,
};

jest.mock('gi://Adw', () => ({
  SpinRow: jest.fn(() => mockSpinRow),
  ComboRow: jest.fn(() => mockComboRow),
  ActionRow: jest.fn(),
}), { virtual: true });

jest.mock('gi://Gtk', () => ({
  Adjustment: jest.fn(() => mockAdjustment),
  StringList: jest.fn(),
}), { virtual: true });

describe('IntervalTriggerEditor', () => {
  let editor: IntervalTriggerEditor;
  let onChange: jest.Mock;

  beforeEach(() => {
    onChange = jest.fn();
    editor = new IntervalTriggerEditor({}, onChange);
  });

  it('should validate correct interval', () => {
    // @ts-ignore
    editor.config.interval = 30;
    expect(editor.validate()).toBe(true);
  });

  it('should invalidate 0 interval', () => {
    // @ts-ignore
    editor.config.interval = 0;
    const result = editor.validate();
    expect(result).toBe('Interval must be at least 1 minute');
  });

  it('should invalidate negative interval', () => {
    // @ts-ignore
    editor.config.interval = -5;
    const result = editor.validate();
    expect(result).toBe('Interval must be at least 1 minute');
  });

});
