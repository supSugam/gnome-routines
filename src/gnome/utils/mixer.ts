// @ts-ignore
import Gvc from 'gi://Gvc';

// Singleton Gvc.MixerControl (PulseAudio)
let _mixerControl: any;

/** Singleton Mixer */
export function getMixerControl() {
  if (_mixerControl) return _mixerControl;

  _mixerControl = new Gvc.MixerControl({ name: 'GNOME Routines Extension' });
  _mixerControl.open();

  return _mixerControl;
}
