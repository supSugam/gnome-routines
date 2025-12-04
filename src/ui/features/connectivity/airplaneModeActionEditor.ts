import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class AirplaneModeActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string { return 'Airplane Mode'; }
  protected getTrueLabel(): string { return 'Enable'; }
  protected getFalseLabel(): string { return 'Disable'; }
}
