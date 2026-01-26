import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendDirection = 'up', 
  icon: Icon,
  className,
  onClick 
}) {
  return (
    <div 
      className={cn(
        'bg-white rounded-xl border border-slate-200/60 p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:border-slate-300 hover:shadow-sm',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
          {trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
          {trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
          {trendDirection === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
          <span className={cn(
            'text-xs font-medium',
            trendDirection === 'up' && 'text-emerald-600',
            trendDirection === 'down' && 'text-red-600',
            trendDirection === 'neutral' && 'text-slate-500'
          )}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}