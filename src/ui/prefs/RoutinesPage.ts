// @ts-ignore
import Adw from 'gi://Adw';
import { PreferencesHeader } from './header.js';
import { RoutineList } from './routineList.js';

export class RoutinesPage {
  public widget: any;
  private settings: any;
  private parentWindow: any;

  private header: PreferencesHeader;
  private list: RoutineList;
  private listGroup: any;

  private currentSearchTerm: string = '';

  constructor(settings: any, parentWindow: any) {
    this.settings = settings;
    this.parentWindow = parentWindow;

    this.widget = new Adw.PreferencesPage();
    this.widget.set_title(''); // Hide default title if using custom header? Or title 'Routines'

    // Header Group
    const headerGroup = new Adw.PreferencesGroup({ title: 'Routines' });
    this.header = new PreferencesHeader(
      this.settings,
      this.parentWindow,
      () => this.refresh(),
      (term) => {
        this.currentSearchTerm = term;
        this.refresh();
      }
    );
    headerGroup.add(this.header.widget);
    this.widget.add(headerGroup);

    // List Group Placeholder
    this.listGroup = new Adw.PreferencesGroup();
    this.widget.add(this.listGroup);

    this.list = new RoutineList(this.settings, this.parentWindow, () =>
      this.refresh()
    );

    this.refresh();
  }

  public refresh() {
    this.widget.remove(this.listGroup);

    const routinesJson = this.settings.get_string('routines');
    let routines = [];
    try {
      routines = JSON.parse(routinesJson || '[]');
    } catch (e) {
      console.error('Failed to parse routines', e);
    }

    this.listGroup = this.list.createGroup(routines, this.currentSearchTerm);
    this.widget.add(this.listGroup);
  }
}
