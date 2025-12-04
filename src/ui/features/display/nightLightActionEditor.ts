import { BinaryStateActionEditor } from '../../components/binaryStateActionEditor.js';

export class NightLightActionEditor extends BinaryStateActionEditor {
  protected getTitle(): string { return 'Night Light'; }
  protected getTrueLabel(): string { return 'Enable'; }
  protected getFalseLabel(): string { return 'Disable'; }
}
