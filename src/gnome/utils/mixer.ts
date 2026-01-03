// @ts-ignore
import Gvc from 'gi://Gvc';

// Each Gvc.MixerControl is a connection to PulseAudio,
// so it's better to make it a singleton
let _mixerControl: any;

/**
 * @returns {Gvc.MixerControl} - the mixer control singleton
 */
export function getMixerControl() {
  if (_mixerControl) return _mixerControl;

  _mixerControl = new Gvc.MixerControl({ name: 'GNOME Routines Extension' });
  _mixerControl.open();

  return _mixerControl;
}
