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
      
      // Define allowed pages that don't need approval
      const allowedPagesWhilePending = [
        'RoleSelection', 
        'OnboardingDriver', 
        'OnboardingFitter', 
        'OnboardingCustomer', 
        'PendingApproval'
      ];
      const isOnAllowedPage = allowedPagesWhilePending.some(page => currentPath.includes(page));
      
      // If user is approved, redirect away from onboarding/role selection pages to their home
      if (user.approval_status === 'approved') {
        // If fitter is approved but missing profile details, send to onboarding
        if (user.app_role === 'fitter' && (!user.full_name || !user.phone)) {
          if (!currentPath.includes('OnboardingFitter')) {
            navigate(createPageUrl('OnboardingFitter'));
            return;
          }
        }
        
        if (isOnAllowedPage) {
          const homePage = {
            'admin': 'OpsDashboard',
            'customer': 'CustomerDashboard',
            'driver': 'DriverJobs',
            'fitter': 'FitterJobs',
          }[user.app_role];
          
          if (homePage) {
            navigate(createPageUrl(homePage));
            return;
          }
        }
      }
      
      // If user has no role and no requested role, redirect to role selection
      if (!user.app_role && !user.requested_app_role) {
        if (!currentPath.includes('RoleSelection')) {
          navigate(createPageUrl('RoleSelection'));
          return;
        }
      }

      // If user is rejected, redirect to role selection to try again
      if (user.approval_status === 'rejected') {
        if (!currentPath.includes('RoleSelection')) {
          navigate(createPageUrl('RoleSelection'));
          return;
        }
      }

      // If user is not approved, allow onboarding flow pages, redirect others to PendingApproval
      if (user.approval_status !== 'approved') {
        if (!isOnAllowedPage) {
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