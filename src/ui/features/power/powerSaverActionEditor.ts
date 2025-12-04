import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class PowerSaverActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string { return 'Power Saver'; }
  protected getTrueLabel(): string { return 'Enable'; }
  protected getFalseLabel(): string { return 'Disable'; }
}
