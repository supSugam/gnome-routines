// @ts-ignore
import Gio from 'gi://Gio';
// @ts-ignore
import NM from 'gi://NM';
import debugLog from '../../../utils/log.js';

export class NetworkAdapter {
    private _client: any; // NM.Client

    constructor() {
        try {
            this._client = NM.Client.new(null);
        } catch (e) {
            debugLog('[NetworkAdapter] Failed to simple-init NM Client:', e);
            // Async fallback if sync fails? But constructor can't be async.
            // We'll rely on method calls doing their checks.
            NM.Client.new_async(null, (obj: any, result: any) => {
                try {
                    this._client = NM.Client.new_finish(result);
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
            } catch (e) {
                // If sync new() fails, we might be in a context where it's not allowed?
                // But usually we just return what we have.
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
            (client: any, result: any) => {
                // Logic for connection is complex in NM (need device/access point).
                // Reusing simplified logic or placeholder from original adapter.
                // The original code iterated connections to find matching SSID.
                try {
                    const connections = client.get_connections();
                    for (const conn of connections) {
                        const s_wireless = conn.get_setting_wireless();
                        if (
                            s_wireless &&
                            s_wireless.get_ssid() &&
                            NM.utils_ssid_to_utf8(s_wireless.get_ssid()) === ssid
                        ) {
                            debugLog(`[NetworkAdapter] Found connection for ${ssid}, activating...`);
                            
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
                                            debugLog(`[NetworkAdapter] Activated connection for ${ssid}`);
                                        } catch (e) {
                                            debugLog(`[NetworkAdapter] Failed to activate connection: ${e}`);
                                        }
                                    }
                                );
                            }
                            return;
                        }
                    }
                    debugLog(`[NetworkAdapter] No saved connection found for SSID: ${ssid}`);

                } catch (e) {
                    debugLog('[NetworkAdapter] Error connecting to WiFi:', e);
                }
            }
        );
    }

    getWifiState(): boolean {
        const client = this._ensureClient();
        return client ? client.wireless_enabled : false;
    }

    onWifiStateChanged(callback: (isEnabled: boolean) => void): () => void {
        const client = this._ensureClient();
        if (!client) return () => {};

        const id = client.connect('notify::wireless-enabled', () => {
             const state = client.wireless_enabled;
             debugLog(`[NetworkAdapter] WiFi state changed: ${state}`);
             callback(state);
        });

        // Also monitor active connection changes for connectivity triggers? 
        // The original logic had separate onWifiStateChanged (powered) vs Network Changed.
        
        return () => {
             if (this._client) {
                 try { this._client.disconnect(id); } catch(e){}
             }
        };
    }

    onWifiPowerStateChanged(callback: (isEnabled: boolean) => void): () => void {
        // Alias for onWifiStateChanged for powered state
        return this.onWifiStateChanged(callback);
    }

    getCurrentWifiSSID(): string | null {
        const client = this._ensureClient();
        if (!client) return null;

        const activeConn = client.get_primary_connection();
        if (activeConn) {
             // connection -> get_id() returns the connection name, usually matches SSID but not always.
             // Better: conn -> get_setting_wireless() -> get_ssid()
             // Or activeConn -> get_specific_object_path() (AccessPoint) -> get_ssid()
             const conn = activeConn.get_connection();
             if (conn) {
                 const s_wireless = conn.get_setting_wireless();
                 if (s_wireless) {
                     const ssid = s_wireless.get_ssid();
                     if (ssid) return NM.utils_ssid_to_utf8(ssid);
                 }
             }
        }
        return null; // or "Disconnected"
    }

    getSavedWifiNetworks(): string[] {
        const client = this._ensureClient();
        if (!client) return [];
        const networks: string[] = [];
        const connections = client.get_connections();
        for (const conn of connections) {
             const s_wireless = conn.get_setting_wireless();
             if (s_wireless) {
                 const ssid = s_wireless.get_ssid();
                 if (ssid) {
                     networks.push(NM.utils_ssid_to_utf8(ssid));
                 }
             }
        }
        return networks;
    }

    setAirplaneMode(enabled: boolean): void {
        const client = this._ensureClient();
        if (client) {
            debugLog(`[NetworkAdapter] Setting Airplane Mode to: ${enabled} (Radios: ${!enabled})`);
            
            // WiFi
            client.wireless_enabled = !enabled;
            
            // Mobile Broadband (WWAN)
            if (client.wwan_enabled !== undefined) {
                 client.wwan_enabled = !enabled;
            }
        }
    }
}
