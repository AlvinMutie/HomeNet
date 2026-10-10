export interface Device {
  id: string;
  mac_address: string | null;
  ip_address: string;
  custom_name: string | null;
  hostname: string | null;
  manufacturer: string;
  is_trusted: number; // 0: untrusted, 1: trusted, 2: needs review / unassigned
  is_active: number;  // 0: offline/previously seen, 1: responding now
  latency_ms: number | null;
  is_randomized_mac: number;
  interface: string | null;
  notes: string | null;
  first_seen: string;
  last_seen: string;
}

export interface RouterStatus {
  model: string;
  firmware: string;
  gateway_ip: string;
  gateway_port: number;
  protocol: string;
  reachable: boolean;
  ping_latency_ms: number | null;
  web_interface: {
    accessible: boolean;
    status_code?: number;
    response_time_ms?: number;
    server_header?: string;
    portal_detected?: boolean;
    tls_enabled?: boolean;
    error?: string;
  };
  adapter_mode: string;
  authenticated: boolean;
  internet_online: boolean;
  internet_verified_target: string | null;
  internet_latency_ms: number | null;
  internet_checked_at: string | null;
}

export interface DashboardStats {
  total_devices: number;
  responding_devices: number;
  offline_devices: number;
  trusted_devices: number;
  untrusted_devices: number;
  review_devices: number;
  manufacturers: Array<{ name: string; count: number }>;
  last_scan: {
    id?: number;
    scan_time: string;
    devices_found: number;
    duration_seconds: number;
    subnet: string;
    interface?: string;
    method?: string;
  } | null;
  router_status: RouterStatus;
  internet_status: {
    internet_online: boolean;
    verified_target?: string | null;
    latency_ms?: number | null;
    checked_at?: string;
  };
}

export interface ScanResponse {
  subnet: string;
  interface: string;
  duration_seconds: number;
  devices_found: number;
  devices: Device[];
}

export interface RouterDiagnostics {
  router: RouterStatus;
  internet: {
    internet_online: boolean;
    verified_target?: string;
    latency_ms?: number;
    checked_at?: string;
  };
  gateway_arp?: {
    mac: string;
    device: string;
    flags: string;
  } | null;
  local_network: {
    interface: string;
    configured_subnet: string;
    details: Record<string, any>;
  };
  integration_guide: {
    target_hardware: string;
    customization: string;
    web_portal_url: string;
    architecture_notes: string[];
    blocking_feasibility: string;
  };
}
