import type { Device, DashboardStats, RouterStatus, RouterDiagnostics, ScanResponse } from '../types';

const API_BASE = '/api';

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) {
    throw new Error(`Failed to load network stats: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchDevices(
  search?: string,
  filterStatus?: string,
  sortBy: string = 'ip',
  sortOrder: string = 'asc'
): Promise<Device[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (filterStatus && filterStatus !== 'all') params.append('filter_status', filterStatus);
  params.append('sort_by', sortBy);
  params.append('sort_order', sortOrder);

  const res = await fetch(`${API_BASE}/devices?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch devices: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerScan(subnet?: string, networkInterface?: string): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/devices/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subnet: subnet || null,
      interface: networkInterface || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Network scan failed');
  }
  return res.json();
}

export async function patchDevice(
  deviceId: string,
  data: { custom_name?: string | null; is_trusted?: number; notes?: string | null; device_type?: string }
): Promise<Device> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update device');
  }
  return res.json();
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete device record');
  }
}

export async function fetchRouterStatus(): Promise<RouterStatus> {
  const res = await fetch(`${API_BASE}/router/status`);
  if (!res.ok) {
    throw new Error(`Failed to retrieve router status: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRouterDiagnostics(): Promise<RouterDiagnostics> {
  const res = await fetch(`${API_BASE}/router/diagnostics`);
  if (!res.ok) {
    throw new Error(`Failed to retrieve diagnostics: ${res.statusText}`);
  }
  return res.json();
}

export async function attemptBlockDevice(deviceId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/block`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      status: res.status,
      detail: data.detail || 'Operation unavailable',
    };
  }
  return { success: true, data };
}
