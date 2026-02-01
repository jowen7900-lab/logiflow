import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Loader2, CheckCircle2 } from 'lucide-react';

export default function OnboardingDriver() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    vehicleSize: '',
    homePostcode: '',
    driverId: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Pre-fill form for rejected drivers
  React.useEffect(() => {
    if (user && user.app_role === 'driver' && user.approval_status === 'rejected') {
      setFormData({
        fullName: user.full_name || '',
        phone: user.phone || '',
        vehicleSize: user.vehicle_type || '',
        homePostcode: user.homePostcode || '',
        driverId: user.driverId || '',
      });
    }
  }, [user]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        full_name: formData.fullName,
        phone: formData.phone,
        vehicle_type: formData.vehicleSize,
        homePostcode: formData.homePostcode,
        driverId: formData.driverId,
        approval_status: 'pending_review',
        rejection_reason: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
      });
    },
    onSuccess: () => {
      navigate(createPageUrl('PendingApproval'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Driver Onboarding</CardTitle>
              <CardDescription>Complete your profile to get started</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Smith"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="07XXX XXXXXX"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1.5 bg-slate-50"
              />
            </div>

            <div>
              <Label>Vehicle Size *</Label>
              <Select
                required
                value={formData.vehicleSize}
                onValueChange={(value) => setFormData({ ...formData, vehicleSize: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select vehicle size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Small Van">Small Van</SelectItem>
                  <SelectItem value="SWB">SWB (Short Wheelbase)</SelectItem>
                  <SelectItem value="LWB">LWB (Long Wheelbase)</SelectItem>
                  <SelectItem value="XLWB">XLWB (Extra Long Wheelbase)</SelectItem>
                  <SelectItem value="Luton">Luton</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Home Postcode (Optional)</Label>
                <Input
                  value={formData.homePostcode}
                  onChange={(e) => setFormData({ ...formData, homePostcode: e.target.value })}
                  placeholder="SW1A 1AA"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Driver ID (Optional)</Label>
                <Input
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  placeholder="DRV-001"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {user?.approval_status === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}