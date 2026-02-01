import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Wrench, Building2, ClipboardList, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const roles = [
  {
    value: 'customer',
    label: 'Customer',
    icon: Building2,
    description: 'Book and manage deliveries',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    value: 'fitter',
    label: 'Fitter',
    icon: Wrench,
    description: 'Install and fit equipment',
    color: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    value: 'driver',
    label: 'Driver',
    icon: Truck,
    description: 'Deliver and collect items',
    color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [applyingRole, setApplyingRole] = useState(false);

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // On mount, check and apply pending invitation role
  useEffect(() => {
    const applyPendingRole = async () => {
      if (user && !user.app_role && !applyingRole) {
        setApplyingRole(true);
        try {
          const response = await base44.functions.invoke('applyPendingRole', {});
          if (response.data.success) {
            // Refetch user to get updated role
            await refetchUser();
          }
        } catch (error) {
          console.error('Failed to apply pending role:', error);
        } finally {
          setApplyingRole(false);
        }
      }
    };

    applyPendingRole();
  }, [user?.id]);

  // Redirect approved users to their home page
  useEffect(() => {
    if (user?.app_role && user?.approval_status === 'approved') {
      const homePage = {
        'admin': 'OpsDashboard',
        'customer': 'CustomerDashboard',
        'driver': 'DriverJobs',
        'fitter': 'FitterJobs',
      }[user.app_role];
      
      if (homePage) {
        navigate(createPageUrl(homePage));
      }
    }
  }, [user, navigate]);

  // Check for invalid role
  if (user?.app_role && user?.approval_status === 'approved' && 
      !['admin', 'customer', 'driver', 'fitter'].includes(user.app_role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Invalid Role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-slate-600">
              Your account has an invalid role assigned. Please contact support for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectRoleMutation = useMutation({
    mutationFn: async (role) => {
      await base44.auth.updateMe({ 
        requested_app_role: role
      });
    },
    onSuccess: (data, role) => {
      // Route to appropriate onboarding form based on role
      const onboardingPage = {
        'driver': 'OnboardingDriver',
        'fitter': 'OnboardingFitter',
        'customer': 'OnboardingCustomer',
      }[role];
      
      if (onboardingPage) {
        navigate(createPageUrl(onboardingPage));
      } else {
        navigate(createPageUrl('PendingApproval'));
      }
    },
  });

  if (applyingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome to LogiFlow</h1>
          <p className="text-slate-600 mt-2">Choose your role to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.value;

            return (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={cn(
                  'text-left p-6 rounded-xl border-2 transition-all',
                  role.color,
                  isSelected && 'ring-4 ring-offset-2 ring-indigo-500'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl bg-white flex items-center justify-center', role.iconColor)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-slate-900">{role.label}</h3>
                    <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => selectRoleMutation.mutate(selectedRole)}
            disabled={!selectedRole || selectRoleMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 px-8"
          >
            {selectRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}