import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function OnboardingFitter() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Redirect approved fitters to dashboard
  React.useEffect(() => {
    if (user?.app_role === 'fitter' && user?.approval_status === 'approved') {
      navigate(createPageUrl('FitterJobs'));
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <CardTitle className="text-xl">Invite Required</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Fitters can only access the system via an admin invite. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}