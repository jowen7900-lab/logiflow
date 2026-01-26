import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import PlanEditDialog from './PlanEditDialog';

export default function PlanJobsView({ planId, latestVersion }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(null); // null, 'individual', 'bulk'
  const [selectedJob, setSelectedJob] = useState(null);
  const queryClient = useQueryClient();

  const versionId = latestVersion?.id;
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['planJobs', versionId],
    queryFn: () => {
      if (!versionId) return [];
      return base44.entities.PlanLine.filter({ plan_version_id: versionId }, 'external_row_id', 100);
    },
    enabled: !!versionId,
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId) => base44.entities.PlanLine.delete(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries(['planJobs', latestVersion?.id]);
    },
  });

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setEditMode('individual');
    setEditDialogOpen(true);
  };

  const handleOpenBulkUpload = () => {
    setSelectedJob(null);
    setEditMode('bulk');
    setEditDialogOpen(true);
  };

  if (!latestVersion) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Jobs ({jobs.length})</h3>
        <Button onClick={handleOpenBulkUpload} variant="outline" className="gap-2">
          <Upload className="w-4 h-4" /> Edit Plan
        </Button>
      </div>

      <div className="grid gap-3">
        {jobs.map((job) => (
          <Card key={job.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{job.delivery_recipient_name || job.collection_name || 'N/A'}</p>
                  <p className="text-sm text-slate-600">{job.delivery_address1 || job.collection_address1}</p>
                  <p className="text-sm text-slate-500">
                    {job.delivery_postcode || job.collection_postcode} • {job.goods_description}
                  </p>
                  <p className="text-xs text-slate-400">
                    {job.delivery_date_time ? new Date(job.delivery_date_time).toLocaleDateString() : new Date(job.collection_date_time).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditJob(job)}
                    className="h-8 w-8"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteJobMutation.mutate(job.id)}
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlanEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode={editMode}
        job={selectedJob}
        planId={planId}
        latestVersionId={latestVersion.id}
      />
    </div>
  );
}