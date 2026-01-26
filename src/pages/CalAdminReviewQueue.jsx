import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function CalAdminReviewQueue() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [action, setAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pendingUsers = [], isLoading } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      const users = await base44.asServiceRole.entities.User.filter({
        approval_status: 'pending_review',
      });
      return users.filter(u => ['driver', 'customer'].includes(u.app_role));
    },
    enabled: currentUser?.app_role === 'ops' && currentUser?.approval_status === 'approved',
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ userId, approved, reason }) => {
      await base44.asServiceRole.entities.User.update(userId, {
        approval_status: approved ? 'approved' : 'rejected',
        reviewed_by_user_id: currentUser.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingUsers']);
      setSelectedUser(null);
      setAction(null);
      setRejectionReason('');
    },
  });

  const handleAction = (user, actionType) => {
    setSelectedUser(user);
    setAction(actionType);
    setRejectionReason('');
  };

  const handleConfirm = () => {
    if (action === 'reject' && !rejectionReason) return;
    reviewMutation.mutate({
      userId: selectedUser.id,
      approved: action === 'approve',
      reason: action === 'reject' ? rejectionReason : null,
    });
  };

  if (currentUser?.app_role !== 'ops' || currentUser?.approval_status !== 'approved') {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">Only approved Ops users can access this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Review Queue</h1>
        <p className="text-slate-600">Review pending driver and customer applications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Applications ({pendingUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No pending applications</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.app_role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{format(new Date(user.created_date), 'PP')}</TableCell>
                    <TableCell>
                      {user.app_role === 'driver' && user.vehicleSize && (
                        <span className="text-sm text-slate-600">{user.vehicleSize}</span>
                      )}
                      {user.app_role === 'customer' && user.jobTitle && (
                        <span className="text-sm text-slate-600">{user.jobTitle}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(user, 'approve')}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(user, 'reject')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!action} onOpenChange={() => { setAction(null); setSelectedUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Application' : 'Reject Application'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.fullName} - {selectedUser?.app_role}
            </DialogDescription>
          </DialogHeader>
          
          {action === 'reject' && (
            <div className="py-4">
              <label className="text-sm font-medium mb-2 block">Rejection Reason *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={reviewMutation.isPending || (action === 'reject' && !rejectionReason)}
              className={action === 'approve' ? 'bg-emerald-600' : 'bg-red-600'}
            >
              {reviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}