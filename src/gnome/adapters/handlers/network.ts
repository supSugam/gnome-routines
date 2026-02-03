// @ts-ignore
import NM from 'gi://NM';
import debugLog from '../../../utils/log.js';
import { GObjectSignalDispatcher } from '../../utils/signalDispatcher.js';

export class NetworkAdapter {
  private _client: any; // NM.Client
  // Shared dispatchers for WiFi signals
  private _wifiStateDispatcher: GObjectSignalDispatcher<() => void> | null =
    null;

  private _wifiPowerDispatcher: GObjectSignalDispatcher<() => void> | null =
    null;

  constructor() {
    try {
      this._client = NM.Client.new(null);
    } catch (e) {
      debugLog('[NetworkAdapter] Failed to simple-init NM Client:', e);
      // Async fallback
      NM.Client.new_async(null, (_obj: any, _result: any) => {
        try {
          this._client = NM.Client.new_finish(_result);
          debugLog('[NetworkAdapter] NM Client initialized async');
        } catch (err) {
          debugLog('[NetworkAdapter] NM Client async init failed:', err);
        }
      });
    }
  }

  private _ensureClient(): any {
    if (!this._client) {
      try {
        this._client = NM.Client.new(null);
      } catch (_e) {
        // Sync init failed
        debugLog('[NetworkAdapter] Warning: NM Client re-init attempted');
      }
    }

    return this._client;
  }

  setWifi(enabled: boolean): void {
    const client = this._ensureClient();

    if (client) {
      debugLog(`[NetworkAdapter] Setting WiFi enabled: ${enabled}`);
      client.wireless_enabled = enabled;
    }
  }

  connectToWifi(ssid: string): void {
    const client = this._ensureClient();

    if (!client) return;

    client.activate_connection_async(
      null,
      null,
      null,
      null,
      (client: any, _result: any) => {
        // Complex connection logic
        try {
          const connections = client.get_connections();

          for (const conn of connections) {
            const s_wireless = conn.get_setting_wireless();

            if (s_wireless && s_wireless.get_ssid()) {
              const ssidBytes = s_wireless.get_ssid();
              let connSsid = '';

              if (ssidBytes) {
                const data = ssidBytes.get_data();

                if (data) {
                  const decoder = new TextDecoder('utf-8');

                  connSsid = decoder.decode(new Uint8Array(data));
                }
              }

              if (connSsid === ssid) {
                debugLog(
                  `[NetworkAdapter] Found connection for ${ssid}, activating...`
                );

                // Find compatible device
                const devices = client.get_devices();
                let device = null;

                for (const dev of devices) {
                  if (dev.device_type === NM.DeviceType.WIFI) {
                    device = dev;
                    break;
                  }
                }

                if (device) {
                  client.activate_connection_async(
                    conn,
                    device,
                    null,
                    null,
                    (c: any, res: any) => {
                      try {
                        c.activate_connection_finish(res);
                        debugLog(
                          `[NetworkAdapter] Activated connection for ${ssid}`
                        );
                      } catch (e) {
                        debugLog(
                          `[NetworkAdapter] Failed to activate connection: ${e}`
                        );
                      }
                    }
                  );
                }

                return;
              }
            }
          }

          debugLog(
            `[NetworkAdapter] No saved connection found for SSID: ${ssid}`
          );
        } catch (e) {
          debugLog('[NetworkAdapter] Error connecting to WiFi:', e);
        }
      }
    );
  }

  getWifiState(): boolean {
    // Connected check
    const client = this._ensureClient();

    if (!client) return false;

    // Check if there's an active WiFi connection
    const ssid = this.getCurrentWifiSSID();

    return ssid !== null;
  }

  getWifiPowerState(): boolean {
    // Enabled check
    const client = this._ensureClient();

    return client ? client.wireless_enabled : false;
  }

  onWifiStateChanged(callback: (isConnected: boolean) => void): () => void {
    const client = this._ensureClient();

    if (!client) return () => {};

    // Primary connection signal
    if (!this._wifiStateDispatcher) {
      debugLog('[NetworkAdapter] Creating shared WiFi state dispatcher');
      this._wifiStateDispatcher = new GObjectSignalDispatcher(
        'WifiState',
        client,
        'notify::primary-connection'
      );
    }

    const wrappedCallback = () => {
      const isConnected = this.getCurrentWifiSSID() !== null;

      debugLog(`[NetworkAdapter] WiFi connection changed: ${isConnected}`);
      callback(isConnected);
    };

    return this._wifiStateDispatcher.addCallback(wrappedCallback as any);
  }

  onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): () => void {
    const client = this._ensureClient();

    if (!client) return () => {};

    if (!this._wifiPowerDispatcher) {
      debugLog('[NetworkAdapter] Creating shared WiFi power dispatcher');
      this._wifiPowerDispatcher = new GObjectSignalDispatcher(
        'WifiPower',
        client,
        'notify::wireless-enabled'
      );
    }

    const wrappedCallback = () => {
      const state = client.wireless_enabled;

      debugLog(`[NetworkAdapter] WiFi power state changed: ${state}`);
      callback(state);
    };

    return this._wifiPowerDispatcher.addCallback(wrappedCallback as any);
  }

  getCurrentWifiSSID(): string | null {
    const client = this._ensureClient();

    if (!client) return null;

    try {
      const activeConn = client.get_primary_connection();

      if (activeConn) {
        const conn = activeConn.get_connection();

        if (conn) {
          const s_wireless = conn.get_setting_wireless();

          if (s_wireless) {
            const ssidBytes = s_wireless.get_ssid();

            if (ssidBytes) {
              // Extract SSID data
              const data = ssidBytes.get_data();

              if (data) {
                // Convert to string
                const decoder = new TextDecoder('utf-8');

                return decoder.decode(new Uint8Array(data));
              }
            }
          }

          // Fallback: use connection ID (usually matches SSID for WiFi)
          return conn.get_id() || null;
        }
      }
    } catch (e: any) {
      debugLog(
        `[NetworkAdapter] Error getting current SSID: ${e?.message || e}`
      );
    }

    return null;
  }

  getSavedWifiNetworks(): string[] {
    const client = this._ensureClient();

    if (!client) return [];
    const networks: string[] = [];

    try {
      const connections = client.get_connections();

      for (const conn of connections) {
        const s_wireless = conn.get_setting_wireless();

        if (s_wireless) {
          const ssidBytes = s_wireless.get_ssid();

          if (ssidBytes) {
            const data = ssidBytes.get_data();

            if (data) {
              const decoder = new TextDecoder('utf-8');

              networks.push(decoder.decode(new Uint8Array(data)));
            }
          }
        }
      }
    } catch (e: any) {
      debugLog(
        `[NetworkAdapter] Error getting saved networks: ${e?.message || e}`
      );
    }

    return networks;
  }

  setAirplaneMode(enabled: boolean): void {
    const client = this._ensureClient();

    if (client) {
      debugLog(
        `[NetworkAdapter] Setting Airplane Mode to: ${enabled} (Radios: ${!enabled})`
      );

      // WiFi
      client.wireless_enabled = !enabled;

      // Mobile Broadband (WWAN)
      if (client.wwan_enabled !== undefined) {
        client.wwan_enabled = !enabled;
      }
    }
  }

  getAirplaneModeState(): boolean {
    const client = this._ensureClient();

    if (!client) {
      debugLog('[NetworkAdapter] No client for airplane mode check');

      return false;
    }

    // GNOME airplane mode logic
    const isAirplane = !client.wireless_enabled;

    debugLog(
      `[NetworkAdapter] Airplane mode check: wifi_enabled=${client.wireless_enabled}, result=${isAirplane}`
    );

    return isAirplane;
  }

  onAirplaneModeStateChanged(
    callback: (isEnabled: boolean) => void
  ): () => void {
    const client = this._ensureClient();

    if (!client) {
      debugLog('[NetworkAdapter] No client for airplane mode listener');

      return () => {};
    }

    debugLog('[NetworkAdapter] Subscribing to airplane mode changes');

    // Listen for wireless state changes (GNOME airplane mode)
    const checkAirplaneMode = () => {
      const isAirplane = !client.wireless_enabled;

      debugLog(`[NetworkAdapter] Airplane mode changed: ${isAirplane}`);
      callback(isAirplane);
    };

    const wirelessId = client.connect(
      'notify::wireless-enabled',
      checkAirplaneMode
    );

    return () => {
      try {
        client.disconnect(wirelessId);
        debugLog('[NetworkAdapter] Airplane mode listener disconnected');
      } catch (e) {
        debugLog(
          '[NetworkAdapter] Error disconnecting airplane mode listeners:',
          e
        );
      }
    };
  }
}
