import React from 'react';
import { cn } from '@/lib/utils';

const customerStatusConfig = {
  requested: { label: 'Requested', class: 'bg-slate-50 text-slate-600 border-slate-200' },
  confirmed: { label: 'Confirmed', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  delivered: { label: 'Delivered', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  closed: { label: 'Closed', class: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', class: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const opsStatusConfig = {
  allocated: { label: 'Allocated', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  on_route_to_collection: { label: 'On Route to Collection', class: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  collected: { label: 'Collected', class: 'bg-purple-50 text-purple-700 border-purple-200' },
  on_route_to_delivery: { label: 'On Route to Delivery', class: 'bg-violet-50 text-violet-700 border-violet-200' },
  delivered: { label: 'Delivered', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Failed', class: 'bg-red-50 text-red-700 border-red-200' },
};

const priorityConfig = {
  standard: { label: 'Standard', class: 'bg-slate-50 text-slate-600 border-slate-200' },
  express: { label: 'Express', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  critical: { label: 'Critical', class: 'bg-red-50 text-red-700 border-red-200' },
};

const taskStatusConfig = {
  open: { label: 'Open', class: 'bg-amber-50 text-amber-700 border-amber-200' },
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