import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function PendingApproval() {
  const navigate = useNavigate();
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Redirect approved users to their home page
  React.useEffect(() => {
    if (user?.approval_status === 'approved') {
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

  const getStatusInfo = () => {
    if (user?.approval_status === 'approved') {
      return {
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        title: 'Account Approved!',
        message: 'Your account has been approved. You can now access the platform.',
      };
    }
    if (user?.approval_status === 'rejected') {
      return {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: 'Account Rejected',
        message: user?.rejection_reason || 'Your account application was rejected. Please contact support for more information.',
      };
    }
    return {
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      title: 'Pending Approval',
      message: 'Your account is currently under review. You will be notified once it has been approved.',
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  const getApproverInfo = () => {
    return 'Admin';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${statusInfo.bgColor} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${statusInfo.color}`} />
            </div>
            <div>
              <CardTitle>{statusInfo.title}</CardTitle>
              <CardDescription>Application Status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className={`${statusInfo.borderColor} ${statusInfo.bgColor}`}>
            <Icon className={`w-4 h-4 ${statusInfo.color}`} />
            <AlertDescription className={statusInfo.color}>
              {statusInfo.message}
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Role:</span>
              <span className="font-medium text-slate-900 capitalize">
                {user?.app_role?.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-medium text-slate-900 capitalize">
                {user?.approval_status?.replace('_', ' ')}
              </span>
            </div>
            {user?.approval_status === 'pending_review' && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reviewed by:</span>
                <span className="font-medium text-slate-900">{getApproverInfo()}</span>
              </div>
            )}
            {user?.reviewed_at && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reviewed:</span>
                <span className="font-medium text-slate-900">
                  {new Date(user.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {user?.app_role === 'driver' && user?.approval_status === 'rejected' && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => navigate(createPageUrl('OnboardingDriver'))}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Edit details & resubmit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}