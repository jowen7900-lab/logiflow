import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Calendar,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Trash2,
  Loader2,
  Download,
  Upload
} from 'lucide-react';
import JobImportDialog from '@/components/jobs/import/JobImportDialog';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { exportToCSV, prepareJobsForExport } from '@/components/utils/exportUtils';

export default function CustomerJobs() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [importFilter, setImportFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: jobImports = [] } = useQuery({
    queryKey: ['jobImports', user?.customer_id],
    queryFn: () => base44.entities.JobImport.filter({ customer_id: user?.customer_id }, '-created_date', 100),
    enabled: !!user?.customer_id,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['customerJobs', user?.id],
    queryFn: () => base44.entities.Job.list('-created_date', 200),
    enabled: !!user?.id,
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId) => {
      await base44.entities.Job.delete(jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customerJobs', user?.id]);
      setDeleteDialog(null);
    },
  });

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!job.job_number?.toLowerCase().includes(search) &&
          !job.delivery_address?.toLowerCase().includes(search) &&
          !job.delivery_postcode?.toLowerCase().includes(search)) {
        return false;
      }
    }
    
    // Status
    if (statusFilter !== 'all' && job.customer_status !== statusFilter) {
      return false;
    }

    // Import batch
    if (importFilter !== 'all' && job.job_import_id !== importFilter) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search jobs, customers, drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={importFilter} onValueChange={setImportFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Import Batch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobImports.map(imp => (
                <SelectItem key={imp.id} value={imp.id}>
                  {imp.name} ({imp.jobs_created_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCSV(prepareJobsForExport(filteredJobs), 'my_jobs_export')}
            disabled={filteredJobs.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Jobs
          </Button>
          
          <Link to={createPageUrl('CreateJob')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="w-4 h-4" />
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500">
        Showing {filteredJobs.length} of {jobs.length} jobs
      </p>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map(job => (
                    <TableRow key={job.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link 
                            to={createPageUrl(`JobDetail?id=${job.id}`)}
                            className="font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            {job.job_number}
                          </Link>
                          {job.has_exception && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{job.job_type}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.customer_status} type="customer" size="sm" />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="truncate max-w-[150px]">{job.delivery_postcode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {job.scheduled_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {format(new Date(job.scheduled_date), 'MMM d')}
                              {job.scheduled_time_slot && (
                                <span className="text-slate-400 uppercase text-xs">
                                  {job.scheduled_time_slot}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{job.driver_name || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {job.eta && (
                          <span className="text-sm text-indigo-600 font-medium">
                            {format(new Date(job.eta), 'HH:mm')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Link to={createPageUrl(`JobDetail?id=${job.id}`)}>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDeleteDialog(job)}
                            disabled={['closed', 'cancelled', 'delivered'].includes(job.customer_status)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete job {deleteDialog?.job_number}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteJobMutation.mutate(deleteDialog?.id)}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <JobImportDialog 
        open={importDialogOpen} 
        onOpenChange={setImportDialogOpen}
        user={user}
      />
    </div>
  );
}