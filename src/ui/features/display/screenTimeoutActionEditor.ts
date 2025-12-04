import { RangeActionEditor } from '../../components/rangeActionEditor.js';

export class ScreenTimeoutActionEditor extends RangeActionEditor {
  protected getTitle(): string { return 'Timeout (seconds)'; }
  protected getMin(): number { return 30; }
  protected getMax(): number { return 3600; }
  protected getStep(): number { return 30; }
  protected getConfigKey(): string { return 'seconds'; }
}
