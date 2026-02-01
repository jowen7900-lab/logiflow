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
        // If fitter is approved but missing profile details, send to onboarding
        if (user.app_role === 'fitter' && (!user.full_name || !user.phone)) {
          if (!currentPath.includes('OnboardingFitter')) {
            navigate(createPageUrl('OnboardingFitter'));
            return;
          }
        }
        
        const onboardingPages = ['RoleSelection', 'OnboardingDriver', 'OnboardingCustomer', 'OnboardingAdmin', 'PendingApproval'];
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
      
      // If user has no role and no requested role, redirect to role selection
      if (!user.app_role && !user.requested_app_role) {
        navigate(createPageUrl('RoleSelection'));
        return;
      }

      // If user is rejected, redirect to role selection to try again
      if (user.approval_status === 'rejected') {
        navigate(createPageUrl('RoleSelection'));
        return;
      }

      // If user is not approved, redirect to pending approval page
      // BUT allow onboarding pages even if pending_review (they need to complete the form)
      if (user.approval_status !== 'approved') {
        const onboardingPages = ['OnboardingDriver', 'OnboardingFitter', 'OnboardingCustomer'];
        const isOnOnboardingPage = onboardingPages.some(page => currentPath.includes(page));
        
        if (!isOnOnboardingPage) {
          navigate(createPageUrl('PendingApproval'));
          return;
        }
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