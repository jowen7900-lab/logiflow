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
  Search, 
  Filter, 
  Calendar,
  AlertTriangle,
  ExternalLink,
  User,
  Truck,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// Guard: Enforce that ALL admin ops_status changes require a reason
// Throws error if reason is missing, blocking the mutation
// Example blocked: admin tries to update ops_status without providing reason
const requireAdminReason = (reason) => {
  if (!reason || !reason.trim()) {
    throw new Error('Admin override requires a reason. Please provide a valid reason for this status change.');
  }
  return reason.trim();
};

export default function OpsJobs() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [assignDialog, setAssignDialog] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assignReason, setAssignReason] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Admin-only access for operations management
  const hasAccess = user?.app_role === 'admin';
  
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
    enabled: !!user && hasAccess,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.User.filter({ app_role: 'driver' }),
  });

  const assignDriverMutation = useMutation({
    mutationFn: async ({ jobId, driverId }) => {
      // GUARD: Enforce admin reason requirement for ops_status changes
      const validatedReason = requireAdminReason(assignReason);

      const driver = drivers.find(d => d.id === driverId);
      await base44.entities.Job.update(jobId, {
        driver_id: driver?.email,
        driver_name: driver?.full_name,
        vehicle_reg: driver?.vehicle_reg,
        ops_status: 'allocated',
        customer_status: 'confirmed',
      });

      await base44.entities.JobStatusHistory.create({
        job_id: jobId,
        job_number: assignDialog?.job_number,
        new_customer_status: 'confirmed',
        new_ops_status: 'allocated',
        changed_by: user?.email,
        changed_by_name: user?.full_name,
        changed_by_role: 'admin',
        notes: `Assigned driver: ${driver?.full_name}. Reason: ${validatedReason}`,
      });
    },
    onError: (error) => {
      alert(error.message || 'Failed to assign driver');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allJobs']);
      setAssignDialog(null);
      setSelectedDriver('');
      setAssignReason('');
    },
  });
  
  // Deny access for unauthorized users
  if (user && !hasAccess) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">You don't have permission to access this page</p>
      </div>
    );
  }

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!job.job_number?.toLowerCase().includes(search) &&
          !job.customer_name?.toLowerCase().includes(search) &&
          !job.delivery_postcode?.toLowerCase().includes(search) &&
          !job.driver_name?.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && job.ops_status !== statusFilter) return false;
    if (customerFilter !== 'all' && job.customer_id !== customerFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
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
            <SelectValue placeholder="Ops Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="allocated">Allocated</SelectItem>
            <SelectItem value="on_route_to_collection">On Route to Collection</SelectItem>
            <SelectItem value="collected">Collected</SelectItem>
            <SelectItem value="on_route_to_delivery">On Route to Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ops Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Driver</TableHead>
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
                          {job.priority !== 'standard' && (
                            <StatusBadge status={job.priority} type="priority" size="sm" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{job.customer_name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{job.job_type}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.ops_status} type="ops" size="sm" />
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
                        {job.driver_name ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <span className="text-sm">{job.driver_name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDriver('');
                                setAssignDialog(job);
                              }}
                              disabled={['delivered', 'cancelled', 'failed'].includes(job.ops_status)}
                              className="h-7 px-2 text-xs"
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssignDialog(job);
                            }}
                            disabled={['delivered', 'cancelled', 'failed'].includes(job.ops_status)}
                          >
                            <Truck className="w-3.5 h-3.5 mr-1" />
                            Assign
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link to={createPageUrl(`JobDetail?id=${job.id}`)}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Driver Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => {
        setAssignDialog(null);
        setSelectedDriver('');
        setAssignReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              Select a driver for job {assignDialog?.job_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>Select Driver</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <div className="flex items-center gap-2">
                      <span>{driver.full_name}</span>
                      {driver.vehicle_reg && (
                        <span className="text-xs text-slate-400">({driver.vehicle_reg})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {drivers.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No drivers available. Add drivers in Driver Management.
              </p>
            )}

            <div className="mt-4">
              <Label>Reason (required)</Label>
              <Textarea
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="Why are you assigning this driver?"
                className="mt-1.5"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAssignDialog(null);
              setSelectedDriver('');
              setAssignReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                assignDriverMutation.mutate({ 
                  jobId: assignDialog?.id, 
                  driverId: selectedDriver 
                });
              }}
              disabled={!selectedDriver || !assignReason.trim() || assignDriverMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {assignDriverMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Assign Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}