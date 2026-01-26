import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { 
  MapPin, 
  Clock, 
  Package, 
  AlertTriangle, 
  ChevronRight,
  Truck,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function JobCard({ job, showOpsStatus = false, compact = false }) {
  const hasException = job.has_exception;
  
  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${hasException ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link 
                to={createPageUrl(`JobDetail?id=${job.id}`)}
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
              >
                {job.job_number}
              </Link>
              <StatusBadge status={job.customer_status} type="customer" size="sm" />
              {showOpsStatus && (
                <StatusBadge status={job.ops_status} type="ops" size="sm" />
              )}
              {job.priority !== 'standard' && (
                <StatusBadge status={job.priority} type="priority" size="sm" />
              )}
              {hasException && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  Exception
                </span>
              )}
            </div>
            
            {!compact && (
              <>
                <p className="text-sm text-slate-500 mt-1">{job.customer_name}</p>
                
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600 truncate">{job.delivery_address}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        {job.scheduled_date && format(new Date(job.scheduled_date), 'MMM d')}
                        {job.scheduled_time_slot && ` · ${job.scheduled_time_slot.toUpperCase()}`}
                      </span>
                    </div>
                    
                    {job.eta && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          ETA: {format(new Date(job.eta), 'HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {job.driver_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{job.driver_name}</span>
                      {job.vehicle_reg && (
                        <span className="text-xs text-slate-400">({job.vehicle_reg})</span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <Link to={createPageUrl(`JobDetail?id=${job.id}`)}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        
        {compact && (
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>{job.delivery_postcode}</span>
            <span>·</span>
            <span>{job.scheduled_date && format(new Date(job.scheduled_date), 'MMM d')}</span>
            {job.eta && (
              <>
                <span>·</span>
                <span className="text-indigo-600 font-medium">ETA: {format(new Date(job.eta), 'HH:mm')}</span>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}