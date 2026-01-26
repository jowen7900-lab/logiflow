import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Check, AlertTriangle, Edit2, User } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

export default function RecentActivity({ activities = [] }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'status_change':
        return Check;
      case 'edit':
        return Edit2;
      case 'exception':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'status_change':
        return 'text-emerald-600 bg-emerald-100';
      case 'edit':
        return 'text-indigo-600 bg-indigo-100';
      case 'exception':
        return 'text-amber-600 bg-amber-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const getDateLabel = (date) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={index} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    getActivityColor(activity.type)
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activity.job_number} · {getDateLabel(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}