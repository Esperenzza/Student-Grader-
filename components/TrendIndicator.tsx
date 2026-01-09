
import React from 'react';

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable' | null;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend }) => {
  if (!trend) return null;

  const icons = {
    up: { icon: 'fa-arrow-trend-up', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    down: { icon: 'fa-arrow-trend-down', color: 'text-rose-500', bg: 'bg-rose-50' },
    stable: { icon: 'fa-minus', color: 'text-slate-400', bg: 'bg-slate-50' }
  };

  const { icon, color, bg } = icons[trend];

  return (
    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${bg} ${color} transition-all animate-in fade-in zoom-in duration-300`}>
      <i className={`fa-solid ${icon} text-[10px]`}></i>
    </div>
  );
};
