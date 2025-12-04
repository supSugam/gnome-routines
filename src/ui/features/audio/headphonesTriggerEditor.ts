import { BinaryStateTriggerEditor } from '../../components/binaryStateTriggerEditor.js';

export class HeadphonesTriggerEditor extends BinaryStateTriggerEditor {
  protected getTitle(): string { return 'State'; }
  protected getTrueLabel(): string { return 'Connected'; }
  protected getFalseLabel(): string { return 'Disconnected'; }
  protected getTrueValue(): string { return 'connected'; }
  protected getFalseValue(): string { return 'disconnected'; }
}
