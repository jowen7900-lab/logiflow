import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MapPin, 
  Calendar,
  Clock,
  Phone,
  Navigation,
  Package,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Loader2,
  Play,
  PoundSterling,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusTransitions = {
  allocated: ['on_route_to_collection'],
  on_route_to_collection: ['collected'],
  collected: ['on_route_to_delivery'],
  on_route_to_delivery: ['delivered', 'failed'],
};

const statusLabels = {
  on_route_to_collection: 'Start Collection',
  collected: 'Mark Collected',
  on_route_to_delivery: 'Start Delivery',
  delivered: 'Complete Delivery',
  failed: 'Mark Failed',
};

export default function DriverJobs() {
  const queryClient = useQueryClient();
  const [podDialog, setPodDialog] = useState(null);
  const [podData, setPodData] = useState({ name: '', notes: '' });
  const [failDialog, setFailDialog] = useState(null);
  const [failReason, setFailReason] = useState('');
  const [etaDialog, setEtaDialog] = useState(null);
  const [collectionEta, setCollectionEta] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Driver-only access - can only see assigned jobs
  const isDriver = user?.app_role === 'driver';
  
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['driverJobs', user?.email],
    queryFn: () => base44.entities.Job.filter({ driver_id: user?.email }, '-scheduled_date'),
    enabled: !!user?.email && isDriver,
  });

  const activeJobs = jobs.filter(j => !['delivered', 'cancelled', 'failed'].includes(j.ops_status));
  const completedJobs = jobs.filter(j => ['delivered', 'failed'].includes(j.ops_status));
  const todayJobs = activeJobs.filter(j => {
    const today = new Date();
    const jobDate = new Date(j.scheduled_date);
    return jobDate.toDateString() === today.toDateString();
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ jobId, jobNumber, newStatus, customerStatus, notes, eta }) => {
      const updates = { ops_status: newStatus };
      if (customerStatus) updates.customer_status = customerStatus;
      if (eta) updates.eta = eta;
      if (newStatus === 'collected') updates.actual_arrival = new Date().toISOString();
      if (newStatus === 'delivered') updates.actual_completion = new Date().toISOString();

      await base44.entities.Job.update(jobId, updates);
      await base44.entities.JobStatusHistory.create({
        job_id: jobId,
        job_number: jobNumber,
        new_ops_status: newStatus,
        new_customer_status: customerStatus,
        changed_by: user?.email,
        changed_by_name: user?.full_name,
        changed_by_role: 'driver',
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driverJobs']);
      setEtaDialog(null);
      setCollectionEta('');
    },
  });

  const completePodMutation = useMutation({
    mutationFn: async ({ job }) => {
      await base44.entities.Job.update(job.id, {
        ops_status: 'delivered',
        customer_status: 'delivered',
        pod_name: podData.name,
        pod_timestamp: new Date().toISOString(),
        actual_completion: new Date().toISOString(),
      });

      await base44.entities.JobStatusHistory.create({
        job_id: job.id,
        job_number: job.job_number,
        new_ops_status: 'delivered',
        new_customer_status: 'delivered',
        changed_by: user?.email,
        changed_by_name: user?.full_name,
        changed_by_role: 'driver',
        notes: `POD signed by ${podData.name}. ${podData.notes}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driverJobs']);
      setPodDialog(null);
      setPodData({ name: '', notes: '' });
    },
  });

  const markFailedMutation = useMutation({
    mutationFn: async ({ job }) => {
      await base44.entities.Job.update(job.id, {
        ops_status: 'failed',
        has_exception: true,
        exception_reason: failReason,
      });

      await base44.entities.JobStatusHistory.create({
        job_id: job.id,
        job_number: job.job_number,
        new_ops_status: 'failed',
        changed_by: user?.email,
        changed_by_name: user?.full_name,
        changed_by_role: 'driver',
        notes: failReason,
      });

      await base44.entities.OpsTask.create({
        task_number: `TSK-${Date.now().toString(36).toUpperCase()}`,
        job_id: job.id,
        job_number: job.job_number,
        task_type: 'driver_issue',
        status: 'pending',
        priority: 'high',
        title: `Failed Delivery: ${job.job_number}`,
        description: failReason,
        requested_by: user?.email,
        requested_by_name: user?.full_name,
        customer_id: job.customer_id,
        customer_name: job.customer_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driverJobs']);
      setFailDialog(null);
      setFailReason('');
    },
  });

  const handleStatusUpdate = (job, newStatus) => {
    if (newStatus === 'on_route_to_collection') {
      setEtaDialog(job);
      return;
    }
    if (newStatus === 'delivered') {
      setPodDialog(job);
      return;
    }
    if (newStatus === 'failed') {
      setFailDialog(job);
      return;
    }

    let customerStatus = job.customer_status;
    if (['on_route_to_collection', 'on_route_to_delivery'].includes(newStatus)) {
      customerStatus = 'in_progress';
    }

    updateStatusMutation.mutate({
      jobId: job.id,
      jobNumber: job.job_number,
      newStatus,
      customerStatus,
      notes: `Status updated to ${newStatus}`,
    });
  };

  const handleStartCollection = () => {
    if (!collectionEta) {
      return;
    }
    updateStatusMutation.mutate({
      jobId: etaDialog.id,
      jobNumber: etaDialog.job_number,
      newStatus: 'on_route_to_collection',
      customerStatus: 'in_progress',
      notes: `Started collection route with ETA ${collectionEta}`,
      eta: collectionEta,
    });
  };

  const JobCard = ({ job }) => {
    const nextStatuses = statusTransitions[job.ops_status] || [];
    
    return (
      <Card className={cn(
        'overflow-hidden',
        job.priority === 'critical' && 'border-l-4 border-l-red-500',
        job.priority === 'express' && 'border-l-4 border-l-amber-500',
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Link 
                  to={createPageUrl(`JobDetail?id=${job.id}`)}
                  className="font-semibold text-slate-900 hover:text-indigo-600"
                >
                  {job.job_number}
                </Link>
                <StatusBadge status={job.ops_status} type="ops" size="sm" />
              </div>
              <p className="text-sm text-slate-500">{job.customer_name}</p>
            </div>
            {job.job_value && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg">
                <PoundSterling className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-700">{job.job_value.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{job.delivery_address}</p>
                <p className="text-xs text-slate-500">{job.delivery_postcode}</p>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.delivery_address + ' ' + job.delivery_postcode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors"
              >
                <Navigation className="w-4 h-4 text-indigo-600" />
              </a>
            </div>

            {job.delivery_phone && (
              <a 
                href={`tel:${job.delivery_phone}`}
                className="flex items-center gap-2 text-sm text-indigo-600"
              >
                <Phone className="w-4 h-4" />
                {job.delivery_phone}
              </a>
            )}

            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {job.scheduled_date && format(new Date(job.scheduled_date), 'MMM d')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {job.scheduled_time_slot?.toUpperCase()}
              </div>
            </div>
          </div>

          {job.special_instructions && (
            <div className="p-2 bg-amber-50 rounded-lg mb-4">
              <p className="text-xs text-amber-800">{job.special_instructions}</p>
            </div>
          )}

          {nextStatuses.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {nextStatuses.map(status => (
                <Button
                  key={status}
                  size="sm"
                  onClick={() => handleStatusUpdate(job, status)}
                  disabled={updateStatusMutation.isPending}
                  className={cn(
                    status === 'failed' ? 'bg-red-600 hover:bg-red-700' :
                    status === 'delivered' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    'bg-indigo-600 hover:bg-indigo-700'
                  )}
                >
                  {status === 'failed' && <AlertTriangle className="w-4 h-4 mr-1" />}
                  {status === 'delivered' && <Camera className="w-4 h-4 mr-1" />}
                  {['on_route_to_collection', 'on_route_to_delivery'].includes(status) && (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  {statusLabels[status]}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600">{todayJobs.length}</p>
            <p className="text-sm text-slate-500">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-900">{activeJobs.length}</p>
            <p className="text-sm text-slate-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{completedJobs.length}</p>
            <p className="text-sm text-slate-500">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No active jobs assigned</p>
              </CardContent>
            </Card>
          ) : (
            activeJobs.map(job => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-4">
          {completedJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No completed jobs yet</p>
              </CardContent>
            </Card>
          ) : (
            completedJobs.map(job => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
      </Tabs>

      {/* POD Dialog */}
      <Dialog open={!!podDialog} onOpenChange={() => setPodDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Capture Proof of Delivery</DialogTitle>
            <DialogDescription>
              Complete the delivery for {podDialog?.job_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Signed By *</Label>
              <Input
                value={podData.name}
                onChange={(e) => setPodData({ ...podData, name: e.target.value })}
                placeholder="Recipient name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={podData.notes}
                onChange={(e) => setPodData({ ...podData, notes: e.target.value })}
                placeholder="Any delivery notes..."
                className="mt-1.5"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPodDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => completePodMutation.mutate({ job: podDialog })}
              disabled={!podData.name || completePodMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {completePodMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ETA Dialog */}
      <Dialog open={!!etaDialog} onOpenChange={() => setEtaDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collection ETA Required</DialogTitle>
            <DialogDescription>
              Provide estimated arrival time for {etaDialog?.job_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>Collection ETA *</Label>
            <Input
              type="datetime-local"
              value={collectionEta}
              onChange={(e) => setCollectionEta(e.target.value)}
              className="mt-1.5"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtaDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartCollection}
              disabled={!collectionEta || updateStatusMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Play className="w-4 h-4 mr-2" />
              Start Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fail Dialog */}
      <Dialog open={!!failDialog} onOpenChange={() => setFailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Failed</DialogTitle>
            <DialogDescription>
              Report delivery failure for {failDialog?.job_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>Reason for failure *</Label>
            <Textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Explain why delivery could not be completed..."
              className="mt-1.5"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => markFailedMutation.mutate({ job: failDialog })}
              disabled={!failReason || markFailedMutation.isPending}
            >
              {markFailedMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mark as Failed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}