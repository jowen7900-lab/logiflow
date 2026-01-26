import React from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  MapPin, 
  AlertTriangle,
  FileText,
  MessageSquare,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getStatusIcon = (status) => {
  const iconMap = {
    awaiting_allocation: Clock,
    allocated: Package,
    driver_assigned: User,
    en_route_collection: Truck,
    collected: Package,
    in_transit: Truck,
    en_route_delivery: Truck,
    arrived: MapPin,
    delivering: Package,
    pod_pending: FileText,
    completed: CheckCircle2,
    failed: AlertTriangle,
    on_hold: Clock,
    cancelled: AlertTriangle,
  };
  return iconMap[status] || Clock;
};

const getStatusColor = (status) => {
  if (['completed'].includes(status)) return 'bg-emerald-500';
  if (['failed', 'cancelled'].includes(status)) return 'bg-red-500';
  if (['on_hold'].includes(status)) return 'bg-amber-500';
  return 'bg-indigo-500';
};

export default function JobTimeline({ history, showDetails = true }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No status history available
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
      
      <div className="space-y-4">
        {history.map((entry, index) => {
          const Icon = getStatusIcon(entry.new_ops_status);
          const isLast = index === history.length - 1;
          
          return (
            <div key={entry.id} className="relative pl-10">
              <div className={cn(
                'absolute left-2 w-5 h-5 rounded-full flex items-center justify-center',
                getStatusColor(entry.new_ops_status)
              )}>
                <Icon className="w-3 h-3 text-white" />
              </div>
              
              <div className={cn(
                'bg-white rounded-lg border border-slate-200 p-3',
                isLast && 'ring-2 ring-indigo-100 border-indigo-200'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {entry.new_ops_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    {showDetails && entry.notes && (
                      <p className="text-sm text-slate-500 mt-1">{entry.notes}</p>
                    )}
                    {showDetails && entry.changed_by_name && (
                      <p className="text-xs text-slate-400 mt-1">
                        by {entry.changed_by_name} ({entry.changed_by_role})
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {format(new Date(entry.created_date), 'MMM d, HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}