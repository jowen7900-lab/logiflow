import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';

const pageTitles = {
  CustomerDashboard: { title: 'Dashboard', subtitle: 'Overview of your logistics activity' },
  CustomerJobs: { title: 'My Jobs', subtitle: 'View and manage your jobs' },
  CreateJob: { title: 'Create Job', subtitle: 'Book a new delivery or collection' },
  JobDetail: { title: 'Job Details', subtitle: 'Full job information and timeline' },
  OpsDashboard: { title: 'Operations Dashboard', subtitle: 'Real-time operational overview' },
  OpsJobs: { title: 'All Jobs', subtitle: 'Manage all customer jobs' },
  OpsTaskQueue: { title: 'Task Queue', subtitle: 'Pending operational tasks' },
  DriverJobs: { title: 'My Jobs', subtitle: 'Jobs assigned to you' },
  DriverJobDetail: { title: 'Job Details', subtitle: 'Job information and actions' },
  FitterJobs: { title: 'My Jobs', subtitle: 'Jobs requiring fitting' },
  Messages: { title: 'Messages', subtitle: 'Job communications' },
  CustomerUsers: { title: 'Team Management', subtitle: 'Manage your team members' },
  DriverManagement: { title: 'Drivers', subtitle: 'Manage driver assignments' },
  FitterManagement: { title: 'Fitters', subtitle: 'Manage fitter assignments' },
  CustomerManagement: { title: 'Customers', subtitle: 'Manage customer accounts' },
  UserManagement: { title: 'Users', subtitle: 'Manage all platform users' },
  BookingRules: { title: 'Booking Rules', subtitle: 'Configure booking restrictions' },
};

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Set default app_role if not set (for demo purposes)
  useEffect(() => {
    if (user && !user.app_role) {
      base44.auth.updateMe({ 
        app_role: 'ops',
        customer_id: '69775f6d2800a54e250880ba',
        customer_name: 'Meridian Furniture Group'
      });
    }
  }, [user]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 20),
    enabled: !!user?.id,
  });

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['pendingTasks'],
    queryFn: () => base44.entities.OpsTask.filter({ status: 'pending' }),
    enabled: user?.app_role === 'ops' || user?.app_role === 'admin',
  });

  const handleMarkRead = async (notificationId) => {
    await base44.entities.Notification.update(notificationId, { read: true });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const pageInfo = pageTitles[currentPageName] || { title: currentPageName, subtitle: '' };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          user={user} 
          currentPage={currentPageName} 
          pendingTasks={pendingTasks.length}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64">
            <Sidebar 
              user={user} 
              currentPage={currentPageName}
              pendingTasks={pendingTasks.length}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        <Header 
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}