import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Plus,
  User,
  Mail,
  Shield,
  Truck,
  Wrench,
  Building2,
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

const roleIcons = {
  admin: Shield,
  customer: Building2,
  driver: Truck,
  fitter: Wrench,
};

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  customer: 'bg-blue-100 text-blue-700',
  driver: 'bg-emerald-100 text-emerald-700',
  fitter: 'bg-amber-100 text-amber-700',
};

const roleLabels = {
  admin: 'Admin',
  customer: 'Customer',
  driver: 'Driver',
  fitter: 'Fitter',
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({ 
    email: '', 
    app_role: 'customer',
    customer_id: '',
    vehicle_reg: '',
    vehicle_type: '',
  });
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectUser, setRejectUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data) => {
      // First invite the user
      await base44.users.inviteUser(data.email, 'user');
      
      // For customer and fitter roles: pre-approve at invite time
      if (data.app_role === 'customer' || data.app_role === 'fitter') {
        const users = await base44.entities.User.filter({ email: data.email });
        if (users.length > 0) {
          await base44.asServiceRole.entities.User.update(users[0].id, {
            app_role: data.app_role,
            approval_status: 'approved',
            customer_id: data.customer_id || null,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      setInviteDialog(false);
      setInviteData({ 
        email: '', 
        app_role: 'customer',
        customer_id: '',
        vehicle_reg: '',
        vehicle_type: '',
      });
    },
  });

  const approveDriverMutation = useMutation({
    mutationFn: async (userId) => {
      console.log('Approving user:', userId);
      const result = await base44.asServiceRole.entities.User.update(userId, {
        approval_status: 'approved',
        reviewed_by_user_id: currentUser?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      });
      console.log('Update result:', result);
      return result;
    },
    onSuccess: async (data, userId) => {
      console.log('Approval successful, refetching...');
      await queryClient.refetchQueries({ queryKey: ['allUsers'] });
      await queryClient.refetchQueries({ queryKey: ['drivers'] });
      toast.success('Driver approved successfully');
    },
    onError: (error) => {
      console.error('Approval error:', error);
      toast.error(`Failed to approve driver: ${error.message}`);
    },
  });

  const rejectDriverMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      await base44.asServiceRole.entities.User.update(userId, {
        approval_status: 'rejected',
        reviewed_by_user_id: currentUser?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      await queryClient.refetchQueries({ queryKey: ['allUsers'] });
      toast.success('Driver rejected');
      setRejectDialog(false);
      setRejectUser(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error(`Failed to reject driver: ${error.message}`);
    },
  });

  const filteredUsers = users.filter(u => {
    if (!searchTerm) {
      if (roleFilter !== 'all' && u.app_role !== roleFilter) return false;
      return true;
    }
    const search = searchTerm.toLowerCase();
    const matchesSearch = u.full_name?.toLowerCase().includes(search) ||
           u.email?.toLowerCase().includes(search);
    if (!matchesSearch) return false;
    if (roleFilter !== 'all' && u.app_role !== roleFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="fitter">Fitter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={() => setInviteDialog(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => {
                    const RoleIcon = roleIcons[user.app_role] || User;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || 'Pending'}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleColors[user.app_role] || 'bg-slate-100 text-slate-700'}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleLabels[user.app_role] || user.app_role || 'Not Set'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.customer_name || user.customer_id || '-'}
                        </TableCell>
                        <TableCell>
                          {user.app_role === 'driver' && (
                            <div className="text-sm text-slate-600">
                              {user.vehicle_reg && <span>{user.vehicle_reg}</span>}
                              {user.vehicle_type && <span className="text-slate-400"> ({user.vehicle_type})</span>}
                            </div>
                          )}
                          {user.phone && (
                            <div className="text-sm text-slate-500">{user.phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {user.approval_status === 'pending_review' && 'Pending'}
                            {user.approval_status === 'approved' && 'Approved'}
                            {user.approval_status === 'rejected' && 'Rejected'}
                            {!user.approval_status && '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {user.created_date && format(new Date(user.created_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.app_role === 'driver' && user.approval_status === 'pending_review' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      approveDriverMutation.mutate(user.id);
                                    }}
                                    disabled={approveDriverMutation.isPending}
                                  >
                                    {approveDriverMutation.isPending ? 'Approving...' : 'Approve Driver'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRejectUser(user);
                                      setRejectDialog(true);
                                    }}
                                  >
                                    Reject Driver
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join the platform
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="user@example.com"
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label>Role</Label>
              <Select 
                value={inviteData.app_role} 
                onValueChange={(value) => setInviteData({ ...inviteData, app_role: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="fitter">Fitter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {inviteData.app_role === 'customer' && (
              <div>
                <Label>Customer Organization</Label>
                <Select 
                  value={inviteData.customer_id} 
                  onValueChange={(value) => setInviteData({ ...inviteData, customer_id: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {inviteData.app_role === 'driver' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vehicle Registration</Label>
                  <Input
                    value={inviteData.vehicle_reg}
                    onChange={(e) => setInviteData({ ...inviteData, vehicle_reg: e.target.value })}
                    placeholder="e.g., AB12 CDE"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Vehicle Type</Label>
                  <Input
                    value={inviteData.vehicle_type}
                    onChange={(e) => setInviteData({ ...inviteData, vehicle_type: e.target.value })}
                    placeholder="e.g., Van, HGV"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteUserMutation.mutate(inviteData)}
              disabled={!inviteData.email || inviteUserMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {inviteUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Driver Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Driver Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectUser?.full_name || rejectUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejection..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectDialog(false);
              setRejectUser(null);
              setRejectionReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => rejectDriverMutation.mutate({ 
                userId: rejectUser?.id, 
                reason: rejectionReason 
              })}
              disabled={!rejectionReason.trim() || rejectDriverMutation.isPending}
              variant="destructive"
            >
              {rejectDriverMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}