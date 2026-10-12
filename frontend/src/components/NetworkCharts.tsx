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
    { name: 'Trusted', value: stats.trusted_devices, color: '#30a46c' },
    { name: 'Needs Review', value: stats.review_devices, color: '#f5a623' },
    { name: 'Untrusted', value: stats.untrusted_devices, color: '#e5484d' },
  ].filter((d) => d.value > 0);

  // 2. Latency distribution data
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

  // 3. Manufacturer breakdown
  const mfgData = stats.manufacturers.slice(0, 5).map((m) => ({
    name: m.name.length > 14 ? m.name.substring(0, 14) + '...' : m.name,
    count: m.count,
  }));

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111317] border border-[#262a34] px-3.5 py-2 rounded-xl shadow-2xl text-xs backdrop-blur-md">
          <p className="font-semibold text-white tracking-tight">{payload[0].name || payload[0].payload.name || payload[0].payload.range}</p>
          <p className="text-zinc-400 font-mono mt-0.5">
            Count: <span className="text-white font-semibold">{payload[0].value}</span> device{payload[0].value === 1 ? '' : 's'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Device Trust Distribution */}
      <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Trust Classification
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            {stats.total_devices} total
          </span>
        </div>

        {trustData.length > 0 ? (
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trustData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {trustData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#111317" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-zinc-400">
            No devices classified yet
          </div>
        )}

        <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
          {trustData.map((item) => (
            <div key={item.name} className="flex items-center space-x-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-zinc-400 text-[11px]">{item.name}</span>
              <span className="font-mono text-zinc-300 text-[11px] font-medium">({item.value})</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Latency Distribution */}
      <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Ping Latency Spread
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            Active devices
          </span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyBuckets} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="range" stroke="#687076" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#687076" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip content={customTooltip} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
              <Bar dataKey="count" fill="#4668f2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-zinc-400 text-center mt-2">
          ICMP round-trip latency measured from local host
        </p>
      </div>

      {/* 3. Top Manufacturers */}
      <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Hardware Vendors
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            IEEE OUI Registry
          </span>
        </div>

        {mfgData.length > 0 ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mfgData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" stroke="#687076" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#687076" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={customTooltip} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                <Bar dataKey="count" fill="#30a46c" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-zinc-400">
            No vendor data available
          </div>
        )}

        <p className="text-[11px] text-zinc-400 text-center mt-2">
          Resolved via hardware MAC OUI prefixes
        </p>
      </div>
    </div>
  );
};
