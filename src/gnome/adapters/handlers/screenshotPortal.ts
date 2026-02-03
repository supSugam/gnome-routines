// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import GLib from 'gi://GLib';
import debugLog from '../../../utils/log.js';

const PortalInterface = `
<node>
  <interface name="org.freedesktop.portal.Screenshot">
    <method name="Screenshot">
      <arg type="s" name="parent_window" direction="in"/>
      <arg type="a{sv}" name="options" direction="in"/>
      <arg type="o" name="handle" direction="out"/>
    </method>
  </interface>
  <interface name="org.freedesktop.portal.Request">
    <signal name="Response">
      <arg type="u" name="response"/>
      <arg type="a{sv}" name="results"/>
    </signal>
  </interface>
</node>
`;

const PortalProxy = Gio.DBusProxy.makeProxyWrapper(PortalInterface);

export async function captureScreenshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const proxy = new PortalProxy(
        Gio.DBus.session,
        'org.freedesktop.portal.Desktop',
        '/org/freedesktop/portal/desktop'
      );

      const connection = proxy.get_connection();

      // DBus handle management
      // Using DBusProxy.call for more control if needed, but wrapper is okay if we use the returned handle path.

      debugLog('[ScreenshotPortal] Requesting screenshot via Portal...');

      // Options: interactive: false (no UI), modal: false
      const options = {
        interactive: new GLib.Variant('b', false),
        modal: new GLib.Variant('b', false),
      };

      // 1. Call Screenshot
      // Remote call

      proxy.ScreenshotRemote('', options, (result: any, error: any) => {
        if (error) {
          // GJS callback quirks
          // Let's check if result is actually the handle string.

          debugLog(
            '[ScreenshotPortal] ScreenshotRemote callback error/result:',
            error,
            result
          );
          reject(error || new Error('Unknown dbus error'));

          return;
        }

        // Handle result
        // In GJS, single return values are often unwrapped.

        let handlePath = result;

        if (Array.isArray(result)) handlePath = result[0];

        debugLog(`[ScreenshotPortal] Request handle: ${handlePath}`);

        if (typeof handlePath !== 'string') {
          reject(new Error(`Invalid handle path type: ${typeof handlePath}`));

          return;
        }

        // 2. Subscribe to Response signal on the handle path
        const id = connection.signal_subscribe(
          'org.freedesktop.portal.Desktop', // sender
          'org.freedesktop.portal.Request', // interface
          'Response', // member
          handlePath, // object path
          null, // arg0
          Gio.DBusSignalFlags.NONE,
          (
            conn: any,
            sender: any,
            path: any,
            iface: any,
            signal: any,
            params: any
          ) => {
            // Unpack params: (u, a{sv})
            const unpacked = params.deep_unpack();
            const responseCode = unpacked[0];
            const results = unpacked[1];

            debugLog(
              `[ScreenshotPortal] Response received. Code: ${responseCode}`
            );

            connection.signal_unsubscribe(id);

            if (responseCode === 0) {
              const uri = results['uri'];
              // uri is likely a Variant, need to unpack again or it acts as string?
              // unpackVariant logic
              let finalUri = uri;

              if (uri && uri.deep_unpack) finalUri = uri.deep_unpack();
              if (uri && uri.unpack) finalUri = uri.unpack();

              resolve(finalUri || '');
            } else if (responseCode === 1) {
              reject(new Error('User cancelled'));
            } else {
              reject(new Error(`Screenshot failed with code ${responseCode}`));
            }
          }
        );
      });
    } catch (e) {
      debugLog('[ScreenshotPortal] Exception:', e);
      reject(e);
    }
  });
}
