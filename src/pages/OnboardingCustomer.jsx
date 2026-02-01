import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OnboardingCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    full_name: '',
    phone: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // If user already has full_name + phone, redirect based on approval status
  React.useEffect(() => {
    if (user?.full_name && user?.phone) {
      if (user.approval_status === 'approved') {
        navigate(createPageUrl('CustomerDashboard'));
      } else if (user.approval_status === 'pending_review') {
        navigate(createPageUrl('PendingApproval'));
      }
    }
  }, [user, navigate]);

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe({
        ...data,
        approval_status: 'pending_review'
      });
    },
    onSuccess: async () => {
      toast.success('Profile submitted for approval!');
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate(createPageUrl('PendingApproval'));
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>Please provide your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1.5 bg-slate-50"
              />
            </div>
            
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="Enter your full name"
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="Enter your phone number"
                className="mt-1.5"
              />
            </div>
            
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}