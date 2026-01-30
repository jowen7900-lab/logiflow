import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function ApprovalGuard({ children }) {
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  React.useEffect(() => {
    if (user && !isLoading) {
      const currentPath = window.location.pathname;
      
      // If user is approved, redirect away from onboarding/role selection pages to their home
      if (user.approval_status === 'approved') {
        const onboardingPages = ['RoleSelection', 'OnboardingDriver', 'OnboardingFitter', 'OnboardingCustomer', 'OnboardingAdmin', 'PendingApproval'];
        const isOnOnboardingPage = onboardingPages.some(page => currentPath.includes(page));
        
        if (isOnOnboardingPage) {
          const homePage = {
            'admin': 'OpsDashboard',
            'customer': 'CustomerDashboard',
            'driver': 'DriverJobs',
            'fitter': 'FitterJobs',
          }[user.app_role];
          
          if (homePage) {
            navigate(createPageUrl(homePage));
            return;
          } else {
            // Invalid role - redirect to pending approval
            navigate(createPageUrl('PendingApproval'));
            return;
          }
        }
      }
      
      // If user has no role, redirect to role selection
      if (!user.app_role) {
        navigate(createPageUrl('RoleSelection'));
        return;
      }

      // If user has role but approval_status is draft, redirect to onboarding
      if (user.approval_status === 'draft') {
        // Validate role is one of the allowed roles
        if (!['admin', 'customer', 'driver', 'fitter'].includes(user.app_role)) {
          navigate(createPageUrl('PendingApproval'));
          return;
        }
        
        const roleCapitalized = user.app_role.charAt(0).toUpperCase() + user.app_role.slice(1);
        const onboardingPage = `Onboarding${roleCapitalized}`;
        navigate(createPageUrl(onboardingPage));
        return;
      }

      // If user is not approved, redirect to pending approval page
      if (user.approval_status !== 'approved') {
        navigate(createPageUrl('PendingApproval'));
        return;
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Only show children if user is approved
  if (user?.approval_status === 'approved') {
    return <>{children}</>;
  }

  return null;
}