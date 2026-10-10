import React from 'react';
import type { Device, DashboardStats } from '../types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

interface NetworkChartsProps {
  stats: DashboardStats;
  devices: Device[];
}

export const NetworkCharts: React.FC<NetworkChartsProps> = ({ stats, devices }) => {
  // 1. Trust data
  const trustData = [
    { name: 'Trusted', value: stats.trusted_devices, color: '#10b981' },
    { name: 'Needs Review', value: stats.review_devices, color: '#f59e0b' },
    { name: 'Untrusted', value: stats.untrusted_devices, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  // 3. Latency distribution data
  const latencyBuckets = [
    { range: '< 5ms', count: 0 },
    { range: '5-20ms', count: 0 },
    { range: '20-100ms', count: 0 },
    { range: '> 100ms', count: 0 },
  ];

  devices.forEach((d) => {
    if (d.is_active && d.latency_ms !== null) {
      if (d.latency_ms < 5) latencyBuckets[0].count++;
      else if (d.latency_ms <= 20) latencyBuckets[1].count++;
      else if (d.latency_ms <= 100) latencyBuckets[2].count++;
      else latencyBuckets[3].count++;
    }
  });

  // 4. Manufacturer breakdown
  const mfgData = stats.manufacturers.slice(0, 5).map((m) => ({
    name: m.name.length > 14 ? m.name.substring(0, 14) + '...' : m.name,
    count: m.count,
  }));

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg shadow-xl text-xs">
          <p className="font-semibold text-white">{payload[0].name || payload[0].payload.name || payload[0].payload.range}</p>
          <p className="text-sky-400 font-mono mt-0.5">
            Count: {payload[0].value} device{payload[0].value === 1 ? '' : 's'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Trust Distribution Donut */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Trust Classification</h3>
          <span className="text-xs text-slate-400">{stats.total_devices} total</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={trustData.length ? trustData : [{ name: 'No Devices', value: 1, color: '#334155' }]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {trustData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={customTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center space-x-4 mt-2 text-xs">
          {trustData.map((d) => (
            <div key={d.name} className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-slate-400">{d.name} ({d.value})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Latency Breakdown Bar Chart */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Ping Latency Profile</h3>
          <span className="text-xs text-slate-400">Responding devices</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-slate-500 text-center mt-2">
          Faster round-trip times indicate strong Wi-Fi signal or Ethernet
        </p>
      </div>

      {/* Top Manufacturers Bar Chart */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Device Vendors (IEEE OUI)</h3>
          <span className="text-xs text-slate-400">Identified</span>
        </div>
        <div className="h-48">
          {mfgData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mfgData} layout="vertical" margin={{ top: 5, right: 15, left: 20, bottom: 0 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              No manufacturer data yet
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500 text-center mt-2">
          Private/randomized MACs are counted under Unknown for privacy
        </p>
      </div>
    </div>
  );
};
