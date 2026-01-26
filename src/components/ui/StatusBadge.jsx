import React from 'react';
import { cn } from '@/lib/utils';

const customerStatusConfig = {
  pending: { label: 'Pending', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmed', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  completed: { label: 'Completed', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', class: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const opsStatusConfig = {
  awaiting_allocation: { label: 'Awaiting Allocation', class: 'bg-slate-50 text-slate-600 border-slate-200' },
  allocated: { label: 'Allocated', class: 'bg-sky-50 text-sky-700 border-sky-200' },
  driver_assigned: { label: 'Driver Assigned', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_route_collection: { label: 'En Route (Collection)', class: 'bg-violet-50 text-violet-700 border-violet-200' },
  collected: { label: 'Collected', class: 'bg-purple-50 text-purple-700 border-purple-200' },
  in_transit: { label: 'In Transit', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  en_route_delivery: { label: 'En Route (Delivery)', class: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  arrived: { label: 'Arrived', class: 'bg-teal-50 text-teal-700 border-teal-200' },
  delivering: { label: 'Delivering', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pod_pending: { label: 'POD Pending', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', class: 'bg-green-50 text-green-700 border-green-200' },
  failed: { label: 'Failed', class: 'bg-red-50 text-red-700 border-red-200' },
  on_hold: { label: 'On Hold', class: 'bg-orange-50 text-orange-700 border-orange-200' },
  cancelled: { label: 'Cancelled', class: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const priorityConfig = {
  standard: { label: 'Standard', class: 'bg-slate-50 text-slate-600 border-slate-200' },
  express: { label: 'Express', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  critical: { label: 'Critical', class: 'bg-red-50 text-red-700 border-red-200' },
};

const taskStatusConfig = {
  pending: { label: 'Pending', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  acknowledged: { label: 'Acknowledged', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  resolved: { label: 'Resolved', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', class: 'bg-red-50 text-red-700 border-red-200' },
  escalated: { label: 'Escalated', class: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export default function StatusBadge({ status, type = 'customer', size = 'default' }) {
  let config;
  switch (type) {
    case 'ops':
      config = opsStatusConfig[status];
      break;
    case 'priority':
      config = priorityConfig[status];
      break;
    case 'task':
      config = taskStatusConfig[status];
      break;
    default:
      config = customerStatusConfig[status];
  }

  if (!config) {
    config = { label: status, class: 'bg-slate-50 text-slate-600 border-slate-200' };
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        config.class
      )}
    >
      {config.label}
    </span>
  );
}