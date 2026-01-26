import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { 
  Calendar, 
  MapPin, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Clock,
  User,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const taskTypeConfig = {
  date_change: { icon: Calendar, label: 'Date Change', color: 'text-blue-600 bg-blue-50' },
  address_change: { icon: MapPin, label: 'Address Change', color: 'text-purple-600 bg-purple-50' },
  cancellation: { icon: XCircle, label: 'Cancellation', color: 'text-red-600 bg-red-50' },
  special_request: { icon: Clock, label: 'Special Request', color: 'text-amber-600 bg-amber-50' },
  exception: { icon: AlertTriangle, label: 'Exception', color: 'text-orange-600 bg-orange-50' },
  rule_breach: { icon: AlertTriangle, label: 'Rule Breach', color: 'text-rose-600 bg-rose-50' },
  escalation: { icon: ArrowRight, label: 'Escalation', color: 'text-red-600 bg-red-50' },
  driver_issue: { icon: User, label: 'Driver Issue', color: 'text-slate-600 bg-slate-50' },
  customer_complaint: { icon: AlertTriangle, label: 'Customer Complaint', color: 'text-rose-600 bg-rose-50' },
};

const priorityColors = {
  low: 'border-l-slate-300',
  medium: 'border-l-blue-400',
  high: 'border-l-amber-400',
  critical: 'border-l-red-500',
};

export default function OpsTaskCard({ task, onAction }) {
  const config = taskTypeConfig[task.task_type] || taskTypeConfig.special_request;
  const Icon = config.icon;

  return (
    <Card className={`overflow-hidden border-l-4 ${priorityColors[task.priority]}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </span>
              <StatusBadge status={task.status} type="task" size="sm" />
              {task.priority === 'critical' && (
                <span className="text-xs font-medium text-red-600">CRITICAL</span>
              )}
            </div>
            
            <h4 className="font-medium text-slate-900">{task.title}</h4>
            <p className="text-sm text-slate-500 mt-1">{task.description}</p>
            
            {(task.original_value || task.requested_value) && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-slate-50 rounded-lg text-sm">
                {task.original_value && (
                  <span className="text-slate-500">{task.original_value}</span>
                )}
                {task.original_value && task.requested_value && (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
                {task.requested_value && (
                  <span className="font-medium text-slate-900">{task.requested_value}</span>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              {task.job_number && (
                <Link 
                  to={createPageUrl(`JobDetail?id=${task.job_id}`)}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                >
                  {task.job_number}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
              {task.customer_name && (
                <span>{task.customer_name}</span>
              )}
              <span>{format(new Date(task.created_date), 'MMM d, HH:mm')}</span>
            </div>
          </div>
        </div>
        
        {task.status === 'pending' && onAction && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction('acknowledge', task)}
            >
              Acknowledge
            </Button>
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onAction('accept', task)}
            >
              Accept
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAction('modify', task)}
            >
              Modify
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => onAction('reject', task)}
            >
              Reject
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className="text-amber-600"
              onClick={() => onAction('escalate', task)}
            >
              Escalate
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}