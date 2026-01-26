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
import { Wrench, Loader2 } from 'lucide-react';

export default function OnboardingFitter() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    requested_customer_id: '',
    fitterCompany: '',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        ...formData,
        approval_status: 'pending_review',
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
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <CardTitle>Fitter Onboarding</CardTitle>
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
              <Label>Email *</Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Customer Organization *</Label>
              <Select
                required
                value={formData.requested_customer_id}
                onValueChange={(value) => setFormData({ ...formData, requested_customer_id: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select your customer organization" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Company (Optional)</Label>
              <Input
                value={formData.fitterCompany}
                onChange={(e) => setFormData({ ...formData, fitterCompany: e.target.value })}
                placeholder="Your company name"
                className="mt-1.5"
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit for Customer Approval
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}