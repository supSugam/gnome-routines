// @ts-ignore
import Adw from 'gi://Adw';
// @ts-ignore
import Gtk from 'gi://Gtk';
// @ts-ignore
import GObject from 'gi://GObject';
// @ts-ignore
import GLib from 'gi://GLib';
// @ts-ignore
import Gio from 'gi://Gio';

export class RoutineEditor {
    private routine: any;
    private onSave: (routine: any) => void;
    private window: any;

    constructor(routine: any | null, onSave: (routine: any) => void) {
        this.routine = routine || {
            id: GLib.uuid_string_random(),
            name: 'New Routine',
            enabled: true,
            triggers: [],
            actions: []
        };
        this.onSave = onSave;
    }

    show(parentWindow: any) {
        const winConfig: any = {
            title: this.routine.name,
            modal: true,
            default_width: 600,
            default_height: 500,
        };
        if (parentWindow) {
            winConfig.transient_for = parentWindow;
        }

        this.window = new Adw.Window(winConfig);

        // Main Navigation View
        const navView = new Adw.NavigationView();
        this.window.content = navView;

        // Main Page (Routine List)
        const mainPage = new Adw.NavigationPage({ title: 'Edit Routine', tag: 'main' });
        navView.add(mainPage);

        const toolbarView = new Adw.ToolbarView();
        mainPage.child = toolbarView;

        const headerBar = new Adw.HeaderBar();
        toolbarView.add_top_bar(headerBar);

        const saveBtn = new Gtk.Button({ label: 'Save', css_classes: ['suggested-action'] });
        // @ts-ignore
        saveBtn.connect('clicked', () => {
            console.log('[Editor] Save clicked');
            if (!this.routine.name) {
                console.log('[Editor] Name is empty');
                // TODO: Show error
                return;
            }
            try {
                console.log('[Editor] Calling onSave', JSON.stringify(this.routine));
                this.onSave(this.routine);
                console.log('[Editor] onSave completed');
                this.window.close();
            } catch (e) {
                console.error('[Editor] Save failed', e);
            }
        });
        headerBar.pack_end(saveBtn);

        const content = new Adw.PreferencesPage();
        toolbarView.content = content;

        const group = new Adw.PreferencesGroup({ title: 'General' });
        content.add(group);

        const nameEntry = new Adw.EntryRow({ title: 'Name', text: this.routine.name });
        group.add(nameEntry);

        // If Section (Triggers)
        const triggerGroup = new Adw.PreferencesGroup({ title: 'If', description: 'Add what will trigger this routine' });
        content.add(triggerGroup);

        // Match Type Selector
        const matchTypeRow = new Adw.ComboRow({
            title: 'Condition Logic',
            model: new Gtk.StringList({ strings: ['All conditions met', 'Any condition met'] }),
            selected: this.routine.matchType === 'any' ? 1 : 0
        });
        // @ts-ignore
        matchTypeRow.connect('notify::selected', () => {
            this.routine.matchType = matchTypeRow.selected === 1 ? 'any' : 'all';
        });
        triggerGroup.add(matchTypeRow);

        const getTriggerSummary = (trigger: any) => {
            if (trigger.type === 'time') {
                const days = trigger.config.days || [];
                let dayText = '';
                if (days.length === 7) dayText = 'Everyday';
                else if (days.length === 0) dayText = 'Never'; // Should not happen if validated
                else if (days.length === 5 && !days.includes(0) && !days.includes(6)) dayText = 'Weekdays';
                else if (days.length === 2 && days.includes(0) && days.includes(6)) dayText = 'Weekends';
                else dayText = days.map((d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');

                if (trigger.config.time) return `At ${trigger.config.time}, ${dayText}`;
                if (trigger.config.startTime) return `From ${trigger.config.startTime} to ${trigger.config.endTime}, ${dayText}`;
            }
            if (trigger.type === 'app') {
                const count = trigger.config.appIds ? trigger.config.appIds.length : 0;
                return `App: ${count} selected`;
            }
            return trigger.type;
        };
        
        const editTrigger = (trigger: any, isNew: boolean = false) => {
            const page = new Adw.NavigationPage({ title: isNew ? 'Add Condition' : 'Edit Condition', tag: 'edit-trigger' });
            
            const toolbarView = new Adw.ToolbarView();
            page.child = toolbarView;
            
            const headerBar = new Adw.HeaderBar();
            toolbarView.add_top_bar(headerBar);

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            // @ts-ignore
            cancelBtn.connect('clicked', () => navView.pop());
            headerBar.pack_start(cancelBtn);

            const addBtn = new Gtk.Button({ label: isNew ? 'Add' : 'Done', css_classes: ['suggested-action'] });
            headerBar.pack_end(addBtn);

            const content = new Adw.PreferencesPage();
            toolbarView.content = content;
            
            const group = new Adw.PreferencesGroup();
            content.add(group);

            let tempConfig = JSON.parse(JSON.stringify(trigger.config));
            let currentType = trigger.type;

            const triggerTypes = [
                { id: 'time', title: 'Time' },
                { id: 'app', title: 'App Opened' }
            ];
            
            const typeModel = new Gtk.StringList({ strings: triggerTypes.map(t => t.title) });
            const typeRow = new Adw.ComboRow({
                title: 'Condition Type',
                model: typeModel,
                selected: triggerTypes.findIndex(t => t.id === currentType)
            });
            group.add(typeRow);

            // Config Groups
            const timeGroup = new Adw.PreferencesGroup();
            const appGroup = new Adw.PreferencesGroup();
            content.add(timeGroup);
            content.add(appGroup);

            // --- Time Config UI ---
            // Sub-type selector for Time
            const timeTypeRow = new Adw.ComboRow({
                title: 'Time Mode',
                model: new Gtk.StringList({ strings: ['Specific Time', 'Time Period'] }),
                selected: tempConfig.startTime ? 1 : 0
            });
            timeGroup.add(timeTypeRow);

            // Helper to create 12h picker
            const createTimePicker = (initialTime24h: string = '09:00') => {
                const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6, valign: Gtk.Align.CENTER });
                
                let [h, m] = initialTime24h.split(':').map(Number);
                if (isNaN(h)) h = 9;
                if (isNaN(m)) m = 0;

                let isPm = h >= 12;
                if (h > 12) h -= 12;
                if (h === 0) h = 12;

                const hourSpin = Gtk.SpinButton.new_with_range(1, 12, 1);
                hourSpin.value = h;
                // hourSpin.orientation = Gtk.Orientation.VERTICAL; // Removed to fix height issue
                
                const label = new Gtk.Label({ label: ':' });
                
                const minuteSpin = Gtk.SpinButton.new_with_range(0, 59, 1);
                minuteSpin.value = m;
                // Pad with zero? SpinButton doesn't easily do that without custom formatting, but it's fine.

                const amPmBtn = new Gtk.Button({ label: isPm ? 'PM' : 'AM' });
                // @ts-ignore
                amPmBtn.connect('clicked', () => {
                    isPm = !isPm;
                    amPmBtn.label = isPm ? 'PM' : 'AM';
                });

                box.append(hourSpin);
                box.append(label);
                box.append(minuteSpin);
                box.append(amPmBtn);

                const getTime = () => {
                    let hour = hourSpin.value;
                    const minute = minuteSpin.value;
                    
                    if (isPm && hour !== 12) hour += 12;
                    if (!isPm && hour === 12) hour = 0;
                    
                    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                };

                return { widget: box, getTime };
            };

            const timeRow = new Adw.ActionRow({ title: 'Time' });
            const timePicker = createTimePicker(tempConfig.time);
            timeRow.add_suffix(timePicker.widget);
            timeGroup.add(timeRow);

            const startRow = new Adw.ActionRow({ title: 'Start Time' });
            const startPicker = createTimePicker(tempConfig.startTime);
            startRow.add_suffix(startPicker.widget);
            timeGroup.add(startRow);

            const endRow = new Adw.ActionRow({ title: 'End Time' });
            const endPicker = createTimePicker(tempConfig.endTime || '17:00');
            endRow.add_suffix(endPicker.widget);
            timeGroup.add(endRow);

            const refreshTimeFields = () => {
                timeRow.visible = timeTypeRow.selected === 0;
                startRow.visible = timeTypeRow.selected === 1;
                endRow.visible = timeTypeRow.selected === 1;
            };
            // @ts-ignore
            timeTypeRow.connect('notify::selected', refreshTimeFields);
            refreshTimeFields();

            // Days
            // We use a separate group for days to visually separate it from time, or keep it in same?
            // User wanted grouping. Let's keep it in the same group but maybe add a header?
            // Or just add it.
            // Actually, "Repeat" is distinct. Let's use a separate group but make sure the time rows above are grouped.
            // The issue was that timeTypeRow and timeEntry were in different groups. Now they are in timeGroup.
            
            const daysGroup = new Adw.PreferencesGroup({ title: 'Repeat' });
            content.add(daysGroup);
            
            const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Short labels
            const selectedDays = new Set(tempConfig.days || [1, 2, 3, 4, 5]);

            const everydayRow = new Adw.ActionRow({ title: 'Everyday' });
            const everydaySwitch = new Gtk.Switch({ active: selectedDays.size === 7 });
            everydaySwitch.valign = Gtk.Align.CENTER;
            everydayRow.add_suffix(everydaySwitch);
            daysGroup.add(everydayRow);

            // Horizontal Day Toggles
            const dayBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10, halign: Gtk.Align.CENTER, margin_top: 10, margin_bottom: 10 });
            const dayButtons: Gtk.Button[] = [];

            const validate = () => {
                let isValid = true;
                let errorMsg = '';

                if (currentType === 'time') {
                    // Duplication check
                    const hasTime = this.routine.triggers.some((tr: any) => tr.type === 'time' && tr !== trigger);
                    if (hasTime) {
                        isValid = false;
                        errorMsg = 'Time trigger already exists';
                    } else if (selectedDays.size === 0) {
                        isValid = false;
                        errorMsg = 'Select at least one day';
                    }
                    // Time validation is implicit with SpinButtons
                } else if (currentType === 'app') {
                    if (!tempConfig.appIds || tempConfig.appIds.length === 0) {
                        isValid = false;
                        errorMsg = 'Select at least one app';
                    }
                }

                addBtn.sensitive = isValid;
                if (!isValid && errorMsg) {
                    addBtn.tooltip_text = errorMsg;
                } else {
                    addBtn.tooltip_text = '';
                }
            };

            // @ts-ignore
            everydaySwitch.connect('notify::active', () => {
                if (everydaySwitch.active) {
                    days.forEach((_, idx) => selectedDays.add(idx));
                } else {
                    selectedDays.clear();
                }
                dayButtons.forEach((btn, idx) => {
                    // Update visual state
                    if (everydaySwitch.active) btn.add_css_class('suggested-action');
                    else btn.remove_css_class('suggested-action');
                });
                validate();
            });

            days.forEach((day, idx) => {
                const btn = new Gtk.Button({ label: day });
                btn.add_css_class('circular');
                if (selectedDays.has(idx)) btn.add_css_class('suggested-action');
                
                // @ts-ignore
                btn.connect('clicked', () => {
                    const isActive = selectedDays.has(idx);
                    if (!isActive) {
                        selectedDays.add(idx);
                        btn.add_css_class('suggested-action');
                    } else {
                        selectedDays.delete(idx);
                        btn.remove_css_class('suggested-action');
                    }
                    
                    if (selectedDays.size === 7 && !everydaySwitch.active) {
                        everydaySwitch.active = true;
                    } else if (selectedDays.size < 7 && everydaySwitch.active) {
                        everydaySwitch.active = false;
                    }
                    validate();
                });
                
                dayBox.append(btn);
                dayButtons.push(btn);
            });

            // Add dayBox to a row or directly to group?
            // AdwPreferencesGroup expects rows usually.
            // Let's try adding it to a custom ActionRow that is not activatable.
            const dayRow = new Adw.ActionRow();
            dayRow.add_suffix(dayBox);
            daysGroup.add(dayRow);

            // --- App Config UI ---
            // Inline Search and List
            const appSearch = new Gtk.SearchEntry({ placeholder_text: 'Search Apps...' });
            appSearch.margin_bottom = 10;
            appGroup.add(appSearch);

            const appScroll = new Gtk.ScrolledWindow();
            appScroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            appScroll.min_content_height = 300; // Fixed height for scrollable area
            appScroll.propagate_natural_height = true;

            const appList = new Gtk.ListBox({ selection_mode: Gtk.SelectionMode.NONE });
            appList.add_css_class('boxed-list');
            appScroll.child = appList;
            appGroup.add(appScroll);

            // Initialize selected apps
            if (!tempConfig.appIds) {
                tempConfig.appIds = tempConfig.appId ? [tempConfig.appId] : [];
            }
            const selectedAppIds = new Set(tempConfig.appIds);

            const allApps = Gio.AppInfo.get_all().filter(app => app.should_show());
            const appRows: { row: Adw.ActionRow, name: string }[] = [];

            allApps.forEach(app => {
                const row = new Adw.ActionRow({ title: app.get_name() });
                
                // Icon
                const icon = app.get_icon();
                if (icon) {
                    const img = Gtk.Image.new_from_gicon(icon);
                    img.pixel_size = 32;
                    row.add_prefix(img);
                }

                // Switch for selection
                const toggle = new Gtk.Switch({ active: selectedAppIds.has(app.get_id()) });
                toggle.valign = Gtk.Align.CENTER;
                
                // @ts-ignore
                toggle.connect('notify::active', () => {
                    if (toggle.active) selectedAppIds.add(app.get_id());
                    else selectedAppIds.delete(app.get_id());
                    
                    tempConfig.appIds = Array.from(selectedAppIds);
                    validate();
                });
                
                row.add_suffix(toggle);
                appList.append(row);
                appRows.push({ row, name: app.get_name().toLowerCase() });
            });

            // Search logic
            // @ts-ignore
            appSearch.connect('search-changed', () => {
                const query = appSearch.text.toLowerCase();
                appRows.forEach(item => {
                    item.row.visible = item.name.includes(query);
                });
            });

            const updateVisibility = () => {
                const selectedType = triggerTypes[typeRow.selected].id;
                currentType = selectedType;
                
                timeGroup.visible = selectedType === 'time';
                daysGroup.visible = selectedType === 'time'; // Hide repeat for non-time triggers
                appGroup.visible = selectedType === 'app';
                
                validate();
            };

            // @ts-ignore
            typeRow.connect('notify::selected', updateVisibility);
            updateVisibility();

            // @ts-ignore
            addBtn.connect('clicked', () => {
                let finalConfig: any = {};
                
                if (currentType === 'time') {
                    if (timeTypeRow.selected === 0) {
                        finalConfig = {
                            time: timePicker.getTime(),
                            days: Array.from(selectedDays)
                        };
                    } else {
                        finalConfig = {
                            startTime: startPicker.getTime(),
                            endTime: endPicker.getTime(),
                            days: Array.from(selectedDays)
                        };
                    }
                } else if (currentType === 'app') {
                    finalConfig = {
                        appIds: tempConfig.appIds
                    };
                }

                trigger.type = currentType;
                trigger.config = finalConfig;

                if (isNew) this.routine.triggers.push(trigger);
                refreshTriggers();
                navView.pop();
            });

            navView.push(page);
        };

        // Track added rows to remove them cleanly
        let triggerRows: any[] = [];

        const refreshTriggers = () => {
             // Remove previously added rows
             triggerRows.forEach(row => triggerGroup.remove(row));
             triggerRows = [];
             
             this.routine.triggers.forEach((trigger: any, index: number) => {
                 const row = new Adw.ActionRow({ title: trigger.type, subtitle: getTriggerSummary(trigger) });
                 
                 // Edit on click
                 // @ts-ignore
                 row.connect('activated', () => editTrigger(trigger));
                 row.activatable = true;

                 const deleteBtn = new Gtk.Button({ icon_name: 'user-trash-symbolic', valign: Gtk.Align.CENTER });
                 deleteBtn.add_css_class('flat');
                 // @ts-ignore
                 deleteBtn.connect('clicked', () => {
                     this.routine.triggers.splice(index, 1);
                     refreshTriggers();
                 });
                 row.add_suffix(deleteBtn);
                 triggerGroup.add(row);
                 triggerRows.push(row);
             });
        };

        const addTriggerBtn = new Gtk.Button({ label: 'Add what will trigger this routine', margin_top: 10 });
        addTriggerBtn.add_css_class('pill');
        // @ts-ignore
        addTriggerBtn.connect('clicked', () => {
            const hasTime = this.routine.triggers.some((tr: any) => tr.type === 'time');
            const defaultType = hasTime ? 'app' : 'time';
            
            const newTrigger = {
                id: GLib.uuid_string_random(),
                type: defaultType,
                config: {} 
            };
            editTrigger(newTrigger, true);
        });
        triggerGroup.add(addTriggerBtn);
        refreshTriggers();

        // Then Section (Actions)
        const actionGroup = new Adw.PreferencesGroup({ title: 'Then', description: 'Add what this routine will do' });
        content.add(actionGroup);

        const getActionSummary = (action: any) => {
            if (action.type === 'dnd') return action.config.enabled === false ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb';
            if (action.type === 'wallpaper') return `Set Wallpaper: ...${action.config.uri?.slice(-20)}`;
            return action.type;
        };

        const editAction = (action: any, isNew: boolean = false) => {
            const page = new Adw.NavigationPage({ title: isNew ? 'Add Action' : 'Edit Action', tag: 'edit-action' });
            
            const toolbarView = new Adw.ToolbarView();
            page.child = toolbarView;
            
            const headerBar = new Adw.HeaderBar();
            toolbarView.add_top_bar(headerBar);

            const cancelBtn = new Gtk.Button({ label: 'Cancel' });
            // @ts-ignore
            cancelBtn.connect('clicked', () => navView.pop());
            headerBar.pack_start(cancelBtn);

            const addBtn = new Gtk.Button({ label: isNew ? 'Add' : 'Done', css_classes: ['suggested-action'] });
            headerBar.pack_end(addBtn);

            const content = new Adw.PreferencesPage();
            toolbarView.content = content;
            
            const group = new Adw.PreferencesGroup();
            content.add(group);

            let tempConfig = JSON.parse(JSON.stringify(action.config));
            let currentType = action.type;

            const actionTypes = [
                { id: 'dnd', title: 'Do Not Disturb' },
                { id: 'wallpaper', title: 'Set Wallpaper' }
            ];
            
            const typeModel = new Gtk.StringList({ strings: actionTypes.map(t => t.title) });
            const typeRow = new Adw.ComboRow({
                title: 'Action Type',
                model: typeModel,
                selected: actionTypes.findIndex(t => t.id === currentType)
            });
            group.add(typeRow);

            const dndGroup = new Adw.PreferencesGroup();
            const wallpaperGroup = new Adw.PreferencesGroup();
            content.add(dndGroup);
            content.add(wallpaperGroup);

            const dndRow = new Adw.ActionRow({ title: 'Enable DND' });
            const dndToggle = new Gtk.Switch({ active: tempConfig.enabled !== false });
            dndToggle.valign = Gtk.Align.CENTER;
            dndRow.add_suffix(dndToggle);
            dndGroup.add(dndRow);

            const uriEntry = new Adw.EntryRow({ title: 'Image URI', text: tempConfig.uri || 'file://' });
            wallpaperGroup.add(uriEntry);

            const validate = () => {
                let isValid = true;
                if (currentType === 'wallpaper' && !uriEntry.text) isValid = false;
                
                // Duplication check for actions?
                const hasAction = this.routine.actions.some((ac: any) => ac.type === currentType && ac !== action);
                if (hasAction) isValid = false;

                addBtn.sensitive = isValid;
            };

            const updateVisibility = () => {
                const selectedType = actionTypes[typeRow.selected].id;
                currentType = selectedType;
                dndGroup.visible = selectedType === 'dnd';
                wallpaperGroup.visible = selectedType === 'wallpaper';
                validate();
            };
            // @ts-ignore
            typeRow.connect('notify::selected', updateVisibility);
            updateVisibility();

            // @ts-ignore
            addBtn.connect('clicked', () => {
                let finalConfig: any = {};
                
                if (currentType === 'dnd') {
                    finalConfig = { enabled: dndToggle.active };
                } else if (currentType === 'wallpaper') {
                    let uri = uriEntry.text;
                    if (uri && !uri.startsWith('file://') && !uri.startsWith('http')) {
                        uri = `file://${uri}`;
                    }
                    finalConfig = { uri: uri };
                }

                action.type = currentType;
                action.config = finalConfig;

                if (isNew) this.routine.actions.push(action);
                refreshActions();
                navView.pop();
            });

            navView.push(page);
        };

        let actionRows: any[] = [];

        const refreshActions = () => {
             actionRows.forEach(row => actionGroup.remove(row));
             actionRows = [];
             
             this.routine.actions.forEach((action: any, index: number) => {
                 const row = new Adw.ActionRow({ title: action.type, subtitle: getActionSummary(action) });
                 
                 // Edit on click
                 // @ts-ignore
                 row.connect('activated', () => editAction(action));
                 row.activatable = true;

                 const deleteBtn = new Gtk.Button({ icon_name: 'user-trash-symbolic', valign: Gtk.Align.CENTER });
                 deleteBtn.add_css_class('flat');
                 // @ts-ignore
                 deleteBtn.connect('clicked', () => {
                     this.routine.actions.splice(index, 1);
                     refreshActions();
                 });
                 row.add_suffix(deleteBtn);
                 actionGroup.add(row);
                 actionRows.push(row);
             });
        };

        const addActionBtn = new Gtk.Button({ label: 'Add what this routine will do', margin_top: 10 });
        addActionBtn.add_css_class('pill');
        // @ts-ignore
        addActionBtn.connect('clicked', () => {
            const hasDnd = this.routine.actions.some((ac: any) => ac.type === 'dnd');
            const defaultType = hasDnd ? 'wallpaper' : 'dnd';

            const newAction = {
                id: GLib.uuid_string_random(),
                type: defaultType,
                config: {} 
            };
            editAction(newAction, true);
        });
        actionGroup.add(addActionBtn);
        refreshActions();

        this.window.present();
    }
}
