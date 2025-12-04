import { BinaryStateTriggerEditor } from '../../components/binaryStateTriggerEditor.js';

export class PowerSaverTriggerEditor extends BinaryStateTriggerEditor {
  protected getTitle(): string { return 'State'; }
  protected getTrueLabel(): string { return 'On'; }
  protected getFalseLabel(): string { return 'Off'; }
  protected getTrueValue(): string { return 'on'; }
  protected getFalseValue(): string { return 'off'; }
}
