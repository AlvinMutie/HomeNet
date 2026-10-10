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
  iconBgColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  badge,
}) => {
  const getBadgeClasses = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'danger':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'info':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${iconBgColor}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {badge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getBadgeClasses(
              badge.variant
            )}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
