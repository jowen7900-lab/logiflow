import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function AppAdminReviewQueue() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState(null);
  const [action, setAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pendingCalAdmins = [], isLoading } = useQuery({
    queryKey: ['pendingCalAdmins'],
    queryFn: async () => {
      const users = await base44.asServiceRole.entities.User.filter({
        approval_status: 'pending_review',
        app_role: 'ops',
      });
      return users;
    },
    enabled: currentUser?.app_role === 'app_admin' && currentUser?.approval_status === 'approved',
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
      queryClient.invalidateQueries(['pendingCalAdmins']);
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

  if (currentUser?.app_role !== 'app_admin' || currentUser?.approval_status !== 'approved') {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">Only App Admins can access this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cal Admin Review Queue</h1>
        <p className="text-slate-600">Review pending operations admin applications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Ops Admins ({pendingCalAdmins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            </div>
          ) : pendingCalAdmins.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No pending applications</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCalAdmins.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.jobTitle}</TableCell>
                    <TableCell>{format(new Date(user.created_date), 'PP')}</TableCell>
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
              {action === 'approve' ? 'Approve Ops Admin' : 'Reject Ops Admin'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.fullName}
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