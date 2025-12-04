import { RangeActionEditor } from '../../components/rangeActionEditor.js';

export class BrightnessActionEditor extends RangeActionEditor {
  protected getTitle(): string { return 'Brightness (%)'; }
  protected getMin(): number { return 0; }
  protected getMax(): number { return 100; }
  protected getStep(): number { return 5; }
  protected getConfigKey(): string { return 'level'; }
}
