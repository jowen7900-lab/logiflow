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
      // If user has no role, redirect to role selection
      if (!user.app_role) {
        navigate(createPageUrl('RoleSelection'));
        return;
      }

      // If user has role but approval_status is draft, redirect to onboarding
      if (user.approval_status === 'draft') {
        const onboardingPage = `Onboarding${user.app_role.charAt(0).toUpperCase() + user.app_role.slice(1)}`;
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