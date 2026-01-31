import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import ChangeFlag from '@/components/ui/ChangeFlag';
import JobTimeline from '@/components/jobs/JobTimeline';
import JobChat from '@/components/chat/JobChat';
import LiveJobTracking from '@/components/jobs/LiveJobTracking';
import RecipientIntelligence from '@/components/recipients/RecipientIntelligence';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  Package,
  Truck,
  User,
  Phone,
  FileText,
  Image,
  MessageSquare,
  Edit2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  Download,
  Check,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [changeDialog, setChangeDialog] = useState(null);
  const [changeData, setChangeData] = useState({});
  const [assignFitterDialog, setAssignFitterDialog] = useState(false);
  const [selectedFitter, setSelectedFitter] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0];
    },
    enabled: !!jobId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['jobHistory', jobId],
    queryFn: () => base44.entities.JobStatusHistory.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['jobMessages', jobId],
    queryFn: () => base44.entities.JobMessage.filter({ job_id: jobId }, 'created_date'),
    enabled: !!jobId,
  });

  // Strict role checks (locked roles only)
  const isAdmin = user?.app_role === 'admin';
  const isCustomer = user?.app_role === 'customer';
  const isDriver = user?.app_role === 'driver';
  const isFitter = user?.app_role === 'fitter';

  // Fetch available fitters for customer assignment
  const { data: fitters = [] } = useQuery({
    queryKey: ['approvedFitters'],
    queryFn: () => base44.entities.User.filter({ app_role: 'fitter', approval_status: 'approved' }),
    enabled: isCustomer && user?.customer_id === job?.customer_id,
  });

  // Fetch driver details if current user is fitter
  const { data: driverDetails } = useQuery({
    queryKey: ['driverDetails', job?.driver_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: job?.driver_id });
      return users[0];
    },
    enabled: !!job?.driver_id && isFitter,
  });

  // Fetch fitter details if current user is driver
  const { data: fitterDetails } = useQuery({
    queryKey: ['fitterDetails', job?.fitter_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: job?.fitter_id });
      return users[0];
    },
    enabled: !!job?.fitter_id && isDriver,
  });

  // Verify access rights
  const hasAccess = isAdmin || 
    isCustomer ||
    (isDriver && job?.driver_id === user?.email) ||
    (isFitter && job?.fitter_id === user?.email);

  const createTaskMutation = useMutation({
    mutationFn: async ({ taskType, title, description, originalValue, requestedValue }) => {
      await base44.entities.OpsTask.create({
        task_number: `TSK-${Date.now().toString(36).toUpperCase()}`,
        job_id: job.id,
        job_number: job.job_number,
        task_type: taskType,
        status: 'pending',
        priority: 'medium',
        title,
        description,
        original_value: originalValue,
        requested_value: requestedValue,
        requested_by: user?.email,
        requested_by_name: user?.full_name,
        customer_id: job.customer_id,
        customer_name: job.customer_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job', jobId]);
      setChangeDialog(null);
      setChangeData({});
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message) => {
      await base44.entities.JobMessage.create({
        job_id: job.id,
        job_number: job.job_number,
        sender_id: user?.email,
        sender_name: user?.full_name,
        sender_role: user?.app_role === 'ops' ? 'admin' : user?.app_role,
        message,
        message_type: 'text',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobMessages', jobId]);
    },
  });

  const assignFitterMutation = useMutation({
    mutationFn: async ({ fitterId }) => {
      // Guard: Only customers owning the job can assign fitters
      if (!isCustomer || user?.customer_id !== job?.customer_id) {
        throw new Error('Unauthorized: Only customers can assign fitters to their own jobs');
      }

      const fitter = fitters.find(f => f.id === fitterId);
      await base44.entities.Job.update(job.id, {
        fitter_id: fitter?.email,
        fitter_name: fitter?.full_name,
      });

      await base44.entities.JobStatusHistory.create({
        job_id: job.id,
        job_number: job.job_number,
        new_ops_status: job.ops_status,
        changed_by: user?.email,
        changed_by_name: user?.full_name,
        changed_by_role: 'customer',
        notes: `Assigned fitter: ${fitter?.full_name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['job', jobId]);
      setAssignFitterDialog(false);
      setSelectedFitter('');
    },
  });

  const handleRequestChange = (type) => {
    setChangeDialog(type);
    setChangeData({});
  };

  const handleSubmitChange = () => {
    if (changeDialog === 'date') {
      createTaskMutation.mutate({
        taskType: 'date_change',
        title: 'Date Change Request',
        description: changeData.reason || 'Customer requested date change',
        originalValue: job.scheduled_date ? format(new Date(job.scheduled_date), 'PPP') : 'Not set',
        requestedValue: changeData.newDate ? format(new Date(changeData.newDate), 'PPP') : '',
      });
    } else if (changeDialog === 'address') {
      createTaskMutation.mutate({
        taskType: 'address_change',
        title: 'Address Change Request',
        description: changeData.reason || 'Customer requested address change',
        originalValue: job.delivery_address,
        requestedValue: changeData.newAddress,
      });
    } else if (changeDialog === 'cancel') {
      createTaskMutation.mutate({
        taskType: 'cancellation',
        title: 'Cancellation Request',
        description: changeData.reason || 'Customer requested cancellation',
        originalValue: job.job_number,
        requestedValue: 'Cancel',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!job || !hasAccess) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">You don't have permission to view this job</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{job.job_number}</h1>
                <StatusBadge status={job.customer_status} type="customer" />
                {isAdmin && <StatusBadge status={job.ops_status} type="ops" />}
                {job.priority !== 'standard' && (
                  <StatusBadge status={job.priority} type="priority" />
                )}
                {job.has_pending_change && <ChangeFlag type="change" />}
                {job.has_rule_breach && !job.has_pending_change && <ChangeFlag type="rule_breach" />}
              </div>
              {!isDriver && <p className="text-slate-500 mt-1">{job.customer_name}</p>}
            </div>
          </div>
        </div>
        
        {/* Only customers can request changes, not drivers or fitters */}
        {isCustomer && !['delivered', 'cancelled'].includes(job.customer_status) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleRequestChange('date')}>
              <CalendarIcon className="w-4 h-4 mr-2" />
              Change Date
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleRequestChange('address')}>
              <MapPin className="w-4 h-4 mr-2" />
              Change Address
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 hover:text-red-700"
              onClick={() => handleRequestChange('cancel')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Exception Banner */}
      {job.has_exception && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <span className="font-medium">Exception: </span>
            {job.exception_reason || 'This job has an active exception that requires attention'}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Delivery Address */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <MapPin className="w-4 h-4" />
                    Delivery Address
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">{job.delivery_address}</p>
                    <p className="text-slate-600">{job.delivery_postcode}</p>
                    {job.delivery_contact && (
                      <p className="text-sm text-slate-500 mt-2">
                        <User className="w-3.5 h-3.5 inline mr-1" />
                        {job.delivery_contact}
                      </p>
                    )}
                    {job.delivery_phone && (
                      <p className="text-sm text-slate-500">
                        <Phone className="w-3.5 h-3.5 inline mr-1" />
                        <a href={`tel:${job.delivery_phone}`} className="text-indigo-600 hover:text-indigo-700">
                          {job.delivery_phone}
                        </a>
                      </p>
                    )}
                    {!isDriver && (
                      <RecipientIntelligence
                        recipientName={job.delivery_contact}
                        recipientPostcode={job.delivery_postcode}
                        userRole={user?.app_role}
                        currentJobId={job.id}
                      />
                    )}
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <CalendarIcon className="w-4 h-4" />
                    Schedule
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900">
                      {job.scheduled_date && format(new Date(job.scheduled_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-slate-600 uppercase">{job.scheduled_time_slot}</p>
                    {job.ops_status === 'on_route_to_collection' && (job.collection_eta ?? job.eta) && (
                      <p className="text-indigo-600 font-medium mt-2">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                        Collection ETA: {new Date(job.collection_eta ?? job.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {job.ops_status === 'on_route_to_delivery' && (job.delivery_eta ?? job.eta) && (
                      <p className="text-indigo-600 font-medium mt-2">
                        <Clock className="w-3.5 h-3.5 inline mr-1" />
                        Delivery ETA: {new Date(job.delivery_eta ?? job.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Driver */}
                {job.driver_name && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <Truck className="w-4 h-4" />
                      Driver
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-900">{job.driver_name}</p>
                      {job.vehicle_reg && (
                        <p className="text-slate-600">{job.vehicle_reg}</p>
                      )}
                      {isFitter && driverDetails && (
                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                          {driverDetails.phone && (
                            <a href={`tel:${driverDetails.phone}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
                              <Phone className="w-3.5 h-3.5" />
                              {driverDetails.phone}
                            </a>
                          )}
                          {driverDetails.email && (
                            <a href={`mailto:${driverDetails.email}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
                              {driverDetails.email}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fitter */}
                {(job.fitter_name || (isCustomer && user?.customer_id === job?.customer_id)) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                      <User className="w-4 h-4" />
                      Fitter
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      {job.fitter_name ? (
                        <>
                          <p className="font-medium text-slate-900">{job.fitter_name}</p>
                          {isDriver && fitterDetails && (
                            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                              {fitterDetails.phone && (
                                <a href={`tel:${fitterDetails.phone}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
                                  <Phone className="w-3.5 h-3.5" />
                                  {fitterDetails.phone}
                                </a>
                              )}
                              {fitterDetails.email && (
                                <a href={`mailto:${fitterDetails.email}`} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
                                  {fitterDetails.email}
                                </a>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">No fitter assigned</p>
                      )}
                      
                      {/* Customer-only fitter assignment */}
                      {isCustomer && user?.customer_id === job?.customer_id && !['closed', 'cancelled'].includes(job.customer_status) && (
                        <div className="mt-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setAssignFitterDialog(true)}
                            className="w-full"
                          >
                            {job.fitter_name ? 'Change Fitter' : 'Assign Fitter'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Package className="w-4 h-4" />
                    Items
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    {job.items && job.items.length > 0 ? (
                      <ul className="space-y-1">
                        {job.items.map((item, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{item.quantity}x</span> {item.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 text-sm">No items specified</p>
                    )}
                  </div>
                </div>
              </div>

              {job.special_instructions && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <FileText className="w-4 h-4" />
                    Special Instructions
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-amber-900 text-sm">{job.special_instructions}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* POD Section */}
          {job.customer_status === 'delivered' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500" />
                  Proof of Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Signed by</p>
                    <p className="font-medium text-slate-900">{job.pod_name || 'N/A'}</p>
                    {job.pod_timestamp && (
                      <p className="text-sm text-slate-500">
                        {format(new Date(job.pod_timestamp), 'PPP HH:mm')}
                      </p>
                    )}
                  </div>
                  
                  {job.pod_images && job.pod_images.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Photos</p>
                      <div className="flex gap-2">
                        {job.pod_images.map((img, i) => (
                          <a
                            key={i}
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <img src={img} alt={`POD ${i + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <JobChat
                messages={messages}
                currentUserId={user?.email}
                currentUserRole={user?.app_role}
                onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
                isLoading={sendMessageMutation.isPending}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Tracking - Customer View */}
          {isCustomer && !['closed', 'cancelled'].includes(job.customer_status) && (
            <LiveJobTracking job={job} />
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <JobTimeline history={history.slice().reverse()} showDetails={isAdmin} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Dialogs */}
      <Dialog open={changeDialog === 'date'} onOpenChange={() => setChangeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Date Change</DialogTitle>
            <DialogDescription>
              Submit a request to change the delivery date. This will be reviewed by our operations team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Date</Label>
              <p className="text-sm text-slate-600 mt-1">
                {job?.scheduled_date && format(new Date(job.scheduled_date), 'PPP')}
              </p>
            </div>
            <div>
              <Label>New Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start mt-1.5">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {changeData.newDate ? format(changeData.newDate, 'PPP') : 'Select new date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    mode="single"
                    selected={changeData.newDate}
                    onSelect={(date) => setChangeData({ ...changeData, newDate: date })}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={changeData.reason || ''}
                onChange={(e) => setChangeData({ ...changeData, reason: e.target.value })}
                placeholder="Why do you need to change the date?"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialog(null)}>Cancel</Button>
            <Button 
              onClick={handleSubmitChange}
              disabled={!changeData.newDate || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeDialog === 'address'} onOpenChange={() => setChangeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Address Change</DialogTitle>
            <DialogDescription>
              Submit a request to change the delivery address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Address</Label>
              <p className="text-sm text-slate-600 mt-1">{job?.delivery_address}</p>
            </div>
            <div>
              <Label>New Address</Label>
              <Textarea
                value={changeData.newAddress || ''}
                onChange={(e) => setChangeData({ ...changeData, newAddress: e.target.value })}
                placeholder="Enter the new delivery address"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={changeData.reason || ''}
                onChange={(e) => setChangeData({ ...changeData, reason: e.target.value })}
                placeholder="Why do you need to change the address?"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialog(null)}>Cancel</Button>
            <Button 
              onClick={handleSubmitChange}
              disabled={!changeData.newAddress || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeDialog === 'cancel'} onOpenChange={() => setChangeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Cancellation</DialogTitle>
            <DialogDescription>
              Submit a request to cancel this job. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Cancellation requests are subject to review and may incur fees depending on the job status.
              </AlertDescription>
            </Alert>
            <div>
              <Label>Reason for cancellation *</Label>
              <Textarea
                value={changeData.reason || ''}
                onChange={(e) => setChangeData({ ...changeData, reason: e.target.value })}
                placeholder="Please explain why you need to cancel this job"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialog(null)}>Keep Job</Button>
            <Button 
              variant="destructive"
              onClick={handleSubmitChange}
              disabled={!changeData.reason || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Request Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Fitter Dialog - Customer Only */}
      <Dialog open={assignFitterDialog} onOpenChange={() => {
        setAssignFitterDialog(false);
        setSelectedFitter('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Fitter</DialogTitle>
            <DialogDescription>
              Select a fitter for job {job?.job_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>Select Fitter</Label>
            <Select value={selectedFitter} onValueChange={setSelectedFitter}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose a fitter" />
              </SelectTrigger>
              <SelectContent>
                {fitters.map(fitter => (
                  <SelectItem key={fitter.id} value={fitter.id}>
                    <div className="flex items-center gap-2">
                      <span>{fitter.full_name}</span>
                      {fitter.specialization && (
                        <span className="text-xs text-slate-400">({fitter.specialization})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {fitters.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                No fitters currently available.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAssignFitterDialog(false);
              setSelectedFitter('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                assignFitterMutation.mutate({ 
                  fitterId: selectedFitter 
                });
              }}
              disabled={!selectedFitter || assignFitterMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {assignFitterMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Assign Fitter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}