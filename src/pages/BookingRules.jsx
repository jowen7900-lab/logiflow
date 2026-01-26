import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { 
  Plus, 
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  Settings,
  Trash2,
  Loader2
} from 'lucide-react';

const ruleTypeIcons = {
  lead_time: Clock,
  capacity: Calendar,
  postcode: MapPin,
  time_slot: Clock,
  custom: Settings,
};

const ruleTypeLabels = {
  lead_time: 'Lead Time',
  capacity: 'Capacity',
  postcode: 'Postcode',
  time_slot: 'Time Slot',
  custom: 'Custom',
};

const actionColors = {
  block: 'bg-red-100 text-red-700',
  soft_block: 'bg-amber-100 text-amber-700',
  warn: 'bg-blue-100 text-blue-700',
};

export default function BookingRules() {
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    rule_type: 'lead_time',
    action: 'soft_block',
    message: '',
    create_task_on_breach: true,
    active: true,
    priority: 1,
    condition: {},
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['bookingRules'],
    queryFn: () => base44.entities.BookingRule.list('priority'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const createRuleMutation = useMutation({
    mutationFn: (rule) => base44.entities.BookingRule.create(rule),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookingRules']);
      setCreateDialog(false);
      setNewRule({
        name: '',
        rule_type: 'lead_time',
        action: 'soft_block',
        message: '',
        create_task_on_breach: true,
        active: true,
        priority: 1,
        condition: {},
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.BookingRule.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries(['bookingRules']),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.BookingRule.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['bookingRules']),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500">
            Configure rules to control customer booking behavior
          </p>
        </div>
        <Button 
          onClick={() => setCreateDialog(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </CardContent>
          </Card>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No booking rules configured</p>
              <p className="text-sm mt-1">Add rules to control how customers can book jobs</p>
            </CardContent>
          </Card>
        ) : (
          rules.map(rule => {
            const Icon = ruleTypeIcons[rule.rule_type] || Settings;
            
            return (
              <Card key={rule.id} className={!rule.active ? 'opacity-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100`}>
                        <Icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge className={actionColors[rule.action]}>
                            {rule.action === 'soft_block' ? 'Soft Block' : rule.action}
                          </Badge>
                          <Badge variant="outline">
                            {ruleTypeLabels[rule.rule_type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{rule.message}</p>
                        {rule.create_task_on_breach && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            Creates ops task on breach
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={(checked) => 
                          toggleRuleMutation.mutate({ id: rule.id, active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Booking Rule</DialogTitle>
            <DialogDescription>
              Add a new rule to control customer booking behavior
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Rule Name</Label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="e.g., 48 Hour Lead Time"
                className="mt-1.5"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rule Type</Label>
                <Select 
                  value={newRule.rule_type} 
                  onValueChange={(value) => setNewRule({ ...newRule, rule_type: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_time">Lead Time</SelectItem>
                    <SelectItem value="capacity">Capacity</SelectItem>
                    <SelectItem value="postcode">Postcode</SelectItem>
                    <SelectItem value="time_slot">Time Slot</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Action on Breach</Label>
                <Select 
                  value={newRule.action} 
                  onValueChange={(value) => setNewRule({ ...newRule, action: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block (Hard)</SelectItem>
                    <SelectItem value="soft_block">Soft Block (Allow + Task)</SelectItem>
                    <SelectItem value="warn">Warn Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Message to Customer</Label>
              <Textarea
                value={newRule.message}
                onChange={(e) => setNewRule({ ...newRule, message: e.target.value })}
                placeholder="Message shown when rule is breached"
                className="mt-1.5"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label>Create Ops Task on Breach</Label>
                <p className="text-xs text-slate-500">Automatically create a task for operations to review</p>
              </div>
              <Switch
                checked={newRule.create_task_on_breach}
                onCheckedChange={(checked) => setNewRule({ ...newRule, create_task_on_breach: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createRuleMutation.mutate(newRule)}
              disabled={!newRule.name || createRuleMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createRuleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}