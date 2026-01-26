import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  FileText,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { format, addDays, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import RecipientIntelligence from '@/components/recipients/RecipientIntelligence';

const steps = [
  { id: 'type', title: 'Job Type', icon: Package },
  { id: 'collection', title: 'Collection', icon: MapPin },
  { id: 'delivery', title: 'Delivery', icon: MapPin },
  { id: 'schedule', title: 'Schedule', icon: CalendarIcon },
  { id: 'items', title: 'Items', icon: FileText },
  { id: 'review', title: 'Review', icon: Check },
];

export default function CreateJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [ruleWarnings, setRuleWarnings] = useState([]);
  const [formData, setFormData] = useState({
    job_type: '',
    priority: 'standard',
    collection_address: '',
    collection_postcode: '',
    collection_contact: '',
    collection_phone: '',
    delivery_address: '',
    delivery_postcode: '',
    delivery_contact: '',
    delivery_phone: '',
    scheduled_date: null,
    scheduled_time_slot: '',
    scheduled_time: '',
    special_instructions: '',
    requires_fitter: false,
    items: [{ description: '', quantity: 1, weight_kg: 0, dimensions: '' }],
  });

  // Only customers can create jobs
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  
  const isCustomer = user?.app_role === 'customer' || user?.app_role === 'customer_admin';
  
  if (user && !isCustomer) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">Only customer users can create jobs</p>
      </div>
    );
  }

  const { data: customer } = useQuery({
    queryKey: ['customer', user?.customer_id],
    queryFn: () => base44.entities.Customer.filter({ id: user?.customer_id }),
    enabled: !!user?.customer_id,
    select: (data) => data[0],
  });

  const { data: bookingRules = [] } = useQuery({
    queryKey: ['bookingRules', user?.customer_id],
    queryFn: async () => {
      const [customerRules, globalRules] = await Promise.all([
        base44.entities.BookingRule.filter({ customer_id: user?.customer_id, active: true }),
        base44.entities.BookingRule.filter({ customer_id: null, active: true }),
      ]);
      return [...customerRules, ...globalRules];
    },
    enabled: !!user?.customer_id,
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData) => {
      const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;
      
      const job = await base44.entities.Job.create({
        ...jobData,
        job_number: jobNumber,
        customer_id: user?.customer_id,
        customer_name: customer?.name || user?.customer_name,
        customer_status: 'requested',
        ops_status: 'requested',
        has_rule_breach: ruleWarnings.length > 0,
        has_exception: ruleWarnings.length > 0,
        exception_reason: ruleWarnings.length > 0 ? ruleWarnings.map(w => w.message).join('; ') : null,
      });

      // Create task if rule breach
      if (ruleWarnings.length > 0) {
        for (const warning of ruleWarnings) {
          await base44.entities.OpsTask.create({
            task_number: `TSK-${Date.now().toString(36).toUpperCase()}`,
            job_id: job.id,
            job_number: jobNumber,
            task_type: 'rule_breach',
            status: 'open',
            priority: 'high',
            severity: 'high',
            title: `Rule Breach: ${warning.rule}`,
            description: warning.message,
            rule_breached: warning.rule,
            requested_by: user?.email,
            requested_by_name: user?.full_name,
            customer_id: user?.customer_id,
            customer_name: customer?.name,
          });
        }
      }

      // Create initial status history
      await base44.entities.JobStatusHistory.create({
        job_id: job.id,
        job_number: jobNumber,
        new_customer_status: 'requested',
        new_ops_status: 'requested',
        changed_by: user?.email,
        changed_by_name: user?.full_name,
        changed_by_role: 'customer',
        notes: 'Job created',
      });

      return job;
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries(['customerJobs']);
      navigate(createPageUrl(`JobDetail?id=${job.id}`));
    },
  });

  // Validate booking rules
  const validateRules = () => {
    const warnings = [];
    const rules = customer?.booking_rules || {};
    
    // Lead time check
    if (rules.min_lead_time_hours && formData.scheduled_date) {
      const minDate = addDays(new Date(), Math.ceil(rules.min_lead_time_hours / 24));
      if (new Date(formData.scheduled_date) < minDate) {
        warnings.push({
          rule: 'Lead Time',
          message: `Minimum ${rules.min_lead_time_hours} hours lead time required`,
        });
      }
    }

    // Blocked postcodes
    if (rules.blocked_postcodes?.length > 0) {
      const prefix = formData.delivery_postcode?.split(' ')[0]?.toUpperCase();
      if (rules.blocked_postcodes.includes(prefix)) {
        warnings.push({
          rule: 'Blocked Postcode',
          message: `Delivery to ${prefix} area requires special approval`,
        });
      }
    }

    setRuleWarnings(warnings);
    return warnings;
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addItem = () => {
    updateFormData({
      items: [...formData.items, { description: '', quantity: 1, weight_kg: 0, dimensions: '' }]
    });
  };

  const removeItem = (index) => {
    updateFormData({
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, updates) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], ...updates };
    updateFormData({ items: newItems });
  };

  const canProceed = () => {
    switch (steps[currentStep].id) {
      case 'type':
        return !!formData.job_type;
      case 'collection':
        return formData.job_type !== 'delivery' || 
          (formData.collection_address && formData.collection_postcode);
      case 'delivery':
        return formData.delivery_address && formData.delivery_postcode;
      case 'schedule':
        return formData.scheduled_date && formData.scheduled_time_slot;
      case 'items':
        return formData.items.some(item => item.description);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep === steps.length - 2) {
      validateRules();
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    createJobMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  isComplete && 'bg-emerald-500 text-white',
                  isActive && 'bg-indigo-600 text-white ring-4 ring-indigo-100',
                  !isActive && !isComplete && 'bg-slate-100 text-slate-400'
                )}>
                  {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  'text-xs mt-2 font-medium',
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                )}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2',
                  index < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>
            {currentStep === 0 && 'Select the type of job you want to create'}
            {currentStep === 1 && 'Enter collection address details'}
            {currentStep === 2 && 'Enter delivery address details'}
            {currentStep === 3 && 'Choose your preferred date and time'}
            {currentStep === 4 && 'Add the items to be delivered'}
            {currentStep === 5 && 'Review and confirm your job'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Job Type */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['delivery', 'collection', 'install', 'removal', 'exchange'].map((type) => (
                  <button
                    key={type}
                    onClick={() => updateFormData({ job_type: type })}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      formData.job_type === type
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Package className={cn(
                      'w-8 h-8 mb-2',
                      formData.job_type === type ? 'text-indigo-600' : 'text-slate-400'
                    )} />
                    <p className="font-medium capitalize">{type}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {type === 'delivery' && 'Standard delivery service'}
                      {type === 'collection' && 'Pickup from location'}
                      {type === 'install' && 'Delivery with installation'}
                      {type === 'removal' && 'Remove existing items'}
                      {type === 'exchange' && 'Swap for new items'}
                    </p>
                  </button>
                ))}
              </div>
              
              <div className="pt-4">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => updateFormData({ priority: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="express">Express (Same Day)</SelectItem>
                    <SelectItem value="critical">Critical (Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Collection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {formData.job_type === 'delivery' ? (
                <Alert>
                  <AlertDescription>
                    Collection details are not required for standard deliveries. Skip to delivery details.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={formData.collection_address}
                        onChange={(e) => updateFormData({ collection_address: e.target.value })}
                        placeholder="Enter full address"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Postcode</Label>
                      <Input
                        value={formData.collection_postcode}
                        onChange={(e) => updateFormData({ collection_postcode: e.target.value })}
                        placeholder="e.g. SW1A 1AA"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Contact Name</Label>
                      <Input
                        value={formData.collection_contact}
                        onChange={(e) => updateFormData({ collection_contact: e.target.value })}
                        placeholder="Contact person"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={formData.collection_phone}
                        onChange={(e) => updateFormData({ collection_phone: e.target.value })}
                        placeholder="Contact number"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Delivery */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Address *</Label>
                  <Input
                    value={formData.delivery_address}
                    onChange={(e) => updateFormData({ delivery_address: e.target.value })}
                    placeholder="Enter full delivery address"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Postcode *</Label>
                  <Input
                    value={formData.delivery_postcode}
                    onChange={(e) => updateFormData({ delivery_postcode: e.target.value })}
                    placeholder="e.g. SW1A 1AA"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.delivery_contact}
                    onChange={(e) => updateFormData({ delivery_contact: e.target.value })}
                    placeholder="Recipient name"
                    className="mt-1.5"
                  />
                  <RecipientIntelligence
                    recipientName={formData.delivery_contact}
                    recipientPostcode={formData.delivery_postcode}
                    userRole={user?.app_role}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.delivery_phone}
                    onChange={(e) => updateFormData({ delivery_phone: e.target.value })}
                    placeholder="Recipient phone"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label>Delivery Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal mt-1.5',
                        !formData.scheduled_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduled_date ? format(formData.scheduled_date, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.scheduled_date}
                      onSelect={(date) => updateFormData({ scheduled_date: date })}
                      disabled={(date) => date < new Date() || isWeekend(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>Time Slot *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1.5">
                  {[
                    { value: 'am', label: 'AM', time: '08:00 - 12:00' },
                    { value: 'pm', label: 'PM', time: '12:00 - 18:00' },
                    { value: 'all_day', label: 'All Day', time: '08:00 - 18:00' },
                    { value: 'timed', label: 'Timed', time: 'Specific time' },
                  ].map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => updateFormData({ scheduled_time_slot: slot.value })}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        formData.scheduled_time_slot === slot.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <p className="font-medium">{slot.label}</p>
                      <p className="text-xs text-slate-500">{slot.time}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {formData.scheduled_time_slot === 'timed' && (
                <div>
                  <Label>Specific Time</Label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => updateFormData({ scheduled_time: e.target.value })}
                    className="mt-1.5 w-40"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Items */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Item {index + 1}</span>
                    {formData.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                        placeholder="Item description"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.weight_kg}
                        onChange={(e) => updateItem(index, { weight_kg: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" onClick={addItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>
              
              <div>
                <Label>Special Instructions</Label>
                <Textarea
                  value={formData.special_instructions}
                  onChange={(e) => updateFormData({ special_instructions: e.target.value })}
                  placeholder="Any special handling or delivery instructions..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {ruleWarnings.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <p className="font-medium mb-2">This booking requires approval</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {ruleWarnings.map((warning, i) => (
                        <li key={i}>{warning.message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Job Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Type:</span>
                      <span className="font-medium capitalize">{formData.job_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Priority:</span>
                      <span className="font-medium capitalize">{formData.priority}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date:</span>
                      <span className="font-medium">
                        {formData.scheduled_date && format(formData.scheduled_date, 'PPP')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Time:</span>
                      <span className="font-medium uppercase">
                        {formData.scheduled_time_slot}
                        {formData.scheduled_time && ` (${formData.scheduled_time})`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Delivery Address</h3>
                  <div className="text-sm">
                    <p>{formData.delivery_address}</p>
                    <p>{formData.delivery_postcode}</p>
                    {formData.delivery_contact && <p className="mt-2">Contact: {formData.delivery_contact}</p>}
                    {formData.delivery_phone && <p>Phone: {formData.delivery_phone}</p>}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Items ({formData.items.filter(i => i.description).length})</h3>
                <div className="space-y-2">
                  {formData.items.filter(i => i.description).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                      <span>{item.description}</span>
                      <span className="text-slate-500">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {formData.special_instructions && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Special Instructions</h3>
                  <p className="text-sm text-slate-600">{formData.special_instructions}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        {currentStep === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={createJobMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {createJobMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Job
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}