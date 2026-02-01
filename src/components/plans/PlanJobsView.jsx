import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, Upload, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PlanEditDialog from './PlanEditDialog';

const formatDisplayDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString();
  } catch {
    return '—';
  }
};

const formatDisplayTime = (timeSlot, time) => {
  if (timeSlot === 'timed' && time) return time;
  if (timeSlot) return timeSlot.replace(/_/g, ' ');
  return '—';
};

export default function PlanJobsView({ planId, latestVersion }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedJobs, setExpandedJobs] = useState({});
  const queryClient = useQueryClient();

  const versionId = latestVersion?.id;
  const { data: planLines = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['planLines', versionId],
    queryFn: () => {
      if (!versionId) return [];
      return base44.entities.PlanLine.filter({ plan_version_id: versionId }, 'external_row_id', 100);
    },
    enabled: !!versionId,
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobKey) => {
      const linesToDelete = await base44.entities.PlanLine.filter({ 
        plan_version_id: versionId, 
        job_key: jobKey 
      });
      await Promise.all(linesToDelete.map(line => base44.entities.PlanLine.delete(line.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planLines', versionId] });
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

  const toggleExpand = (jobKey) => {
    setExpandedJobs(prev => ({ ...prev, [jobKey]: !prev[jobKey] }));
  };

  if (!latestVersion) {
    return null;
  }

  // Group plan lines by job_key
  const groupedJobs = planLines.reduce((acc, line) => {
    if (!acc[line.job_key]) {
      acc[line.job_key] = {
        job_key: line.job_key,
        job_type: line.job_type,
        collection_address: line.collection_address,
        collection_postcode: line.collection_postcode,
        collection_date: line.collection_date,
        collection_time_slot: line.collection_time_slot,
        collection_time: line.collection_time,
        delivery_address: line.delivery_address,
        delivery_postcode: line.delivery_postcode,
        delivery_date: line.delivery_date,
        delivery_time_slot: line.delivery_time_slot,
        delivery_time: line.delivery_time,
        requires_fitter: line.requires_fitter,
        fitter_name: line.fitter_name,
        items: [],
      };
    }
    acc[line.job_key].items.push(line);
    return acc;
  }, {});

  const jobsArray = Object.values(groupedJobs);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Jobs ({jobsArray.length})</h3>
        <Button onClick={handleOpenBulkUpload} variant="outline" className="gap-2">
          <Upload className="w-4 h-4" /> Edit Plan
        </Button>
      </div>

      {jobsLoading ? (
        <div>Loading jobs...</div>
      ) : jobsArray.length === 0 ? (
        <Card>
          <CardContent className="pt-6 flex gap-3 text-slate-500">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>No job lines found for this version.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Job Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Fitter</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobsArray.map((jobGroup) => (
                <React.Fragment key={jobGroup.job_key}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(jobGroup.job_key)}
                        className="h-6 w-6"
                      >
                        {expandedJobs[jobGroup.job_key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{jobGroup.job_key}</TableCell>
                    <TableCell>{(jobGroup.job_type || '—').replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      {jobGroup.collection_postcode && jobGroup.collection_address ? `${jobGroup.collection_postcode}, ${jobGroup.collection_address}` : '—'}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {formatDisplayDate(jobGroup.collection_date)} {formatDisplayTime(jobGroup.collection_time_slot, jobGroup.collection_time)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {jobGroup.delivery_postcode && jobGroup.delivery_address ? `${jobGroup.delivery_postcode}, ${jobGroup.delivery_address}` : '—'}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {formatDisplayDate(jobGroup.delivery_date)} {formatDisplayTime(jobGroup.delivery_time_slot, jobGroup.delivery_time)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {jobGroup.requires_fitter ? (jobGroup.fitter_name || 'Required') : 'No'}
                    </TableCell>
                    <TableCell>{jobGroup.items.length}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditJob(jobGroup.items[0])}
                          className="h-8 w-8"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteJobMutation.mutate(jobGroup.job_key)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedJobs[jobGroup.job_key] && jobGroup.items.map((item, index) => (
                    <TableRow key={item.id} className="bg-slate-50">
                      <TableCell className="text-right pr-2 text-xs text-slate-500">Item {index + 1}</TableCell>
                      <TableCell colSpan={2}>
                        <span className="font-medium">{item.item_description || 'N/A'}</span>
                      </TableCell>
                      <TableCell>Qty: {item.item_quantity}</TableCell>
                      <TableCell>Weight: {item.item_weight_kg}kg</TableCell>
                      <TableCell>Dims: {item.item_dimensions || 'N/A'}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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