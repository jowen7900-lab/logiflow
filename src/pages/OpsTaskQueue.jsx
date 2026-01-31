import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import OpsTaskCard from '@/components/tasks/OpsTaskCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Download
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { exportToCSV, prepareTasksForExport } from '@/components/utils/exportUtils';

export default function OpsTaskQueue() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionDialog, setActionDialog] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Ops-only access enforcement
  const isOps = user?.app_role === 'ops' || user?.app_role === 'app_admin' || user?.app_role === 'admin';
  
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['allOpsTasks'],
    queryFn: () => base44.entities.OpsTask.list('-created_date', 200),
    enabled: !!user && isOps,
  });

  const pendingTasks = allTasks.filter(t => t.status === 'pending');
  const acknowledgedTasks = allTasks.filter(t => t.status === 'acknowledged' || t.status === 'in_progress');
  const resolvedTasks = allTasks.filter(t => t.status === 'resolved' || t.status === 'rejected');

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }) => {
      await base44.entities.OpsTask.update(taskId, {
        ...updates,
        resolved_at: updates.status === 'resolved' || updates.status === 'rejected' ? new Date().toISOString() : undefined,
        resolved_by: updates.status === 'resolved' || updates.status === 'rejected' ? user?.email : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allOpsTasks']);
      queryClient.invalidateQueries(['pendingTasks']);
      setActionDialog(null);
      setSelectedTask(null);
      setActionNotes('');
    },
  });
  
  // Deny access for non-ops users
  if (user && !isOps) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">Only operations users can access task queue</p>
      </div>
    );
  }

  const handleAction = (action, task) => {
    setSelectedTask(task);
    setActionDialog(action);
  };

  const submitAction = () => {
    if (!selectedTask) return;

    let updates = {};
    switch (actionDialog) {
      case 'acknowledge':
        updates = { 
          status: 'acknowledged', 
          assigned_to: user?.email,
          assigned_to_name: user?.full_name,
        };
        break;
      case 'accept':
        updates = { 
          status: 'resolved', 
          resolution_notes: actionNotes || 'Request approved and processed',
        };
        break;
      case 'modify':
        updates = { 
          status: 'resolved', 
          resolution_notes: actionNotes,
        };
        break;
      case 'reject':
        updates = { 
          status: 'rejected', 
          resolution_notes: actionNotes,
        };
        break;
      case 'escalate':
        updates = { 
          status: 'escalated',
          priority: 'critical',
          resolution_notes: actionNotes,
        };
        break;
    }

    updateTaskMutation.mutate({ taskId: selectedTask.id, updates });
  };

  const filterTasks = (tasks) => {
    return tasks.filter(task => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!task.title?.toLowerCase().includes(search) &&
            !task.job_number?.toLowerCase().includes(search) &&
            !task.customer_name?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (typeFilter !== 'all' && task.task_type !== typeFilter) return false;
      return true;
    });
  };

  const TaskList = ({ tasks, showActions = false }) => {
    const filtered = filterTasks(tasks);
    
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      );
    }
    
    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
          No tasks in this queue
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {filtered.map(task => (
          <OpsTaskCard 
            key={task.id} 
            task={task} 
            onAction={showActions ? handleAction : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap flex-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="date_change">Date Change</SelectItem>
            <SelectItem value="address_change">Address Change</SelectItem>
            <SelectItem value="cancellation">Cancellation</SelectItem>
            <SelectItem value="special_request">Special Request</SelectItem>
            <SelectItem value="exception">Exception</SelectItem>
            <SelectItem value="rule_breach">Rule Breach</SelectItem>
            <SelectItem value="escalation">Escalation</SelectItem>
          </SelectContent>
        </Select>
        </div>
        
        <Button
          variant="outline"
          onClick={() => exportToCSV(prepareTasksForExport(filterTasks(allTasks)), 'tasks_export')}
          disabled={allTasks.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Task Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            In Progress ({acknowledgedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Resolved ({resolvedTasks.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          <TaskList tasks={pendingTasks} showActions />
        </TabsContent>
        
        <TabsContent value="in_progress" className="mt-6">
          <TaskList tasks={acknowledgedTasks} showActions />
        </TabsContent>
        
        <TabsContent value="resolved" className="mt-6">
          <TaskList tasks={resolvedTasks} />
        </TabsContent>
      </Tabs>

      {/* Action Dialogs */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'acknowledge' && 'Acknowledge Task'}
              {actionDialog === 'accept' && 'Accept Request'}
              {actionDialog === 'modify' && 'Modify & Approve'}
              {actionDialog === 'reject' && 'Reject Request'}
              {actionDialog === 'escalate' && 'Escalate Task'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'acknowledge' && 'Take ownership of this task for resolution.'}
              {actionDialog === 'accept' && 'Approve and process this request as submitted.'}
              {actionDialog === 'modify' && 'Approve with modifications. Explain the changes.'}
              {actionDialog === 'reject' && 'Reject this request. Please provide a reason.'}
              {actionDialog === 'escalate' && 'Escalate to management for urgent attention.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <div className="py-4">
              <div className="p-3 bg-slate-50 rounded-lg mb-4">
                <p className="font-medium">{selectedTask.title}</p>
                <p className="text-sm text-slate-500 mt-1">{selectedTask.description}</p>
                {selectedTask.original_value && selectedTask.requested_value && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="text-slate-500">{selectedTask.original_value}</span>
                    <span>→</span>
                    <span className="font-medium">{selectedTask.requested_value}</span>
                  </div>
                )}
              </div>
              
              {actionDialog !== 'acknowledge' && (
                <div>
                  <Label>Notes {actionDialog === 'reject' ? '*' : '(optional)'}</Label>
                  <Textarea
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder={
                      actionDialog === 'accept' ? 'Any additional notes...' :
                      actionDialog === 'modify' ? 'Describe the modifications made...' :
                      actionDialog === 'reject' ? 'Reason for rejection...' :
                      'Reason for escalation...'
                    }
                    className="mt-1.5"
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitAction}
              disabled={updateTaskMutation.isPending || (actionDialog === 'reject' && !actionNotes)}
              className={
                actionDialog === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                actionDialog === 'escalate' ? 'bg-amber-600 hover:bg-amber-700' :
                'bg-indigo-600 hover:bg-indigo-700'
              }
            >
              {updateTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionDialog === 'acknowledge' && 'Acknowledge'}
              {actionDialog === 'accept' && 'Accept'}
              {actionDialog === 'modify' && 'Approve with Modifications'}
              {actionDialog === 'reject' && 'Reject'}
              {actionDialog === 'escalate' && 'Escalate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}