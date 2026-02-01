import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function JobImportAuditHistory({ jobImportId, open }) {
  const { data: auditEvents = [], isLoading } = useQuery({
    queryKey: ['importAudit', jobImportId],
    queryFn: () => base44.entities.JobImportAudit.filter(
      { job_import_id: jobImportId },
      '-created_date',
      100
    ),
    enabled: !!jobImportId && open,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  if (auditEvents.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center">
        No audit events found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {auditEvents.map((event) => (
        <Card key={event.id} className="bg-slate-50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-900">
                  {event.event_type === 'created' && '✓ Initial Import'}
                  {event.event_type === 'replaced' && '↻ Replaced'}
                  {event.event_type === 'deleted_jobs' && '✕ Deleted'}
                  {event.event_type === 'created_jobs' && '✓ Created'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  by <span className="font-medium">{event.actor_email}</span>
                </p>
                {event.upload_filename && (
                  <p className="text-xs text-slate-600 mt-1">
                    File: <span className="font-mono">{event.upload_filename}</span>
                  </p>
                )}
                {event.jobs_created_count > 0 && (
                  <p className="text-xs text-slate-600">
                    Created: <span className="font-medium text-green-600">{event.jobs_created_count}</span>
                  </p>
                )}
                {event.jobs_deleted_count > 0 && (
                  <p className="text-xs text-slate-600">
                    Deleted: <span className="font-medium text-red-600">{event.jobs_deleted_count}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">
                  {format(new Date(event.created_date), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-slate-400">
                  {format(new Date(event.created_date), 'HH:mm')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}