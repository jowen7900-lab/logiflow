import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusFlow = [
  { key: 'requested', label: 'Requested' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'closed', label: 'Closed' },
];

export default function LiveJobTracking({ job }) {
  const currentIndex = statusFlow.findIndex(s => s.key === job.customer_status);
  const lastUpdate = job.updated_date ? new Date(job.updated_date) : new Date();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Status Progression */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {statusFlow.map((status, index) => {
                const isComplete = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isActive = isComplete || isCurrent;

                return (
                  <React.Fragment key={status.key}>
                    <div className="flex flex-col items-center relative z-10">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                        isComplete && 'bg-emerald-500 text-white',
                        isCurrent && 'bg-indigo-600 text-white ring-4 ring-indigo-100',
                        !isActive && 'bg-slate-200 text-slate-400'
                      )}>
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </div>
                      <span className={cn(
                        'text-xs mt-2 text-center font-medium',
                        isActive ? 'text-slate-900' : 'text-slate-400'
                      )}>
                        {status.label}
                      </span>
                    </div>
                    {index < statusFlow.length - 1 && (
                      <div className={cn(
                        'flex-1 h-0.5 transition-all mx-2',
                        index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'
                      )} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Current Status Details */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-50/50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-indigo-900">Current Status</h3>
              <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                Live
              </span>
            </div>
            <p className="text-sm text-indigo-700 capitalize">
              {job.customer_status.replace('_', ' ')}
            </p>
            {job.eta && (
              <p className="text-lg font-bold text-indigo-900 mt-2">
                ETA: {format(new Date(job.eta), 'HH:mm')}
              </p>
            )}
          </div>

          {/* Last Update */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Last updated: {format(lastUpdate, 'PPP HH:mm')}
            </p>
          </div>

          {/* Next Action */}
          {job.customer_status === 'in_progress' && job.eta && (
            <div className="text-center bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <p className="text-sm font-medium text-emerald-900">
                Driver is on the way
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Estimated arrival in {Math.round((new Date(job.eta) - new Date()) / 60000)} minutes
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}