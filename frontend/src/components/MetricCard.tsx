import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
}) => {
  const getBadgeStyle = (variant: string) => {
    switch (variant) {
      case 'success':
        return {
          pill: 'bg-[#122b1c] text-[#46a758] border-[#1d472c]',
          dot: 'bg-[#46a758]',
        };
      case 'warning':
        return {
          pill: 'bg-[#2e210e] text-[#f5a623] border-[#4d3615]',
          dot: 'bg-[#f5a623]',
        };
      case 'danger':
        return {
          pill: 'bg-[#2b1214] text-[#e5484d] border-[#4a1c20]',
          dot: 'bg-[#e5484d]',
        };
      case 'info':
        return {
          pill: 'bg-[#101b33] text-[#3e63dd] border-[#1c305a]',
          dot: 'bg-[#3e63dd]',
        };
      default:
        return {
          pill: 'bg-[#16181e] text-zinc-400 border-[#252830]',
          dot: 'bg-zinc-500',
        };
    }
  };

  const badgeStyle = badge ? getBadgeStyle(badge.variant) : null;

  return (
    <div className="bg-[#111317]/90 border border-[#1e2127] hover:border-[#2b303a] rounded-2xl p-5 transition-all duration-200 relative overflow-hidden group shadow-sm">
      {/* Top subtle highlight shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        <div className="w-8 h-8 rounded-xl bg-[#16181f] border border-[#232731] flex items-center justify-center text-zinc-300">
          {icon}
        </div>
      </div>

      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <span className="text-3xl font-semibold tracking-tight text-white">{value}</span>
        {badge && badgeStyle && (
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${badgeStyle.pill}`}
          >
            <span className={`size-1.5 rounded-full ${badgeStyle.dot}`} />
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1.5 text-xs text-zinc-400 font-normal leading-relaxed">{subtitle}</p>}
    </div>
  );
};
