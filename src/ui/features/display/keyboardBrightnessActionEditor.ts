import { RangeActionEditor } from '../../components/rangeActionEditor.js';

export class KeyboardBrightnessActionEditor extends RangeActionEditor {
  protected getTitle(): string { return 'Keyboard Brightness (%)'; }
  protected getMin(): number { return 0; }
  protected getMax(): number { return 100; }
  protected getStep(): number { return 5; }
  protected getConfigKey(): string { return 'level'; }
}
