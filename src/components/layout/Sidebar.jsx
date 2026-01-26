import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Plus,
  ClipboardList,
  Truck,
  Wrench,
  Users,
  Settings,
  Bell,
  MessageSquare,
  ChevronRight,
  LogOut,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const roleNavigation = {
  customer: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'CustomerDashboard' },
    { name: 'My Jobs', icon: Package, page: 'CustomerJobs' },
    { name: 'Create Job', icon: Plus, page: 'CreateJob' },
    { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  ],
  customer_admin: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'CustomerDashboard' },
    { name: 'My Jobs', icon: Package, page: 'CustomerJobs' },
    { name: 'Create Job', icon: Plus, page: 'CreateJob' },
    { name: 'Messages', icon: MessageSquare, page: 'Messages' },
    { name: 'Team', icon: Users, page: 'CustomerUsers' },
    { name: 'Fitter Review', icon: ClipboardList, page: 'CustomerReviewQueue' },
  ],
  driver: [
    { name: 'My Jobs', icon: Package, page: 'DriverJobs' },
    { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  ],
  fitter: [
    { name: 'My Jobs', icon: Wrench, page: 'FitterJobs' },
    { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  ],
  cal_admin: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'OpsDashboard' },
    { name: 'All Jobs', icon: Package, page: 'OpsJobs' },
    { name: 'Task Queue', icon: ClipboardList, page: 'OpsTaskQueue', badge: true },
    { name: 'Review Queue', icon: Users, page: 'CalAdminReviewQueue' },
    { name: 'Drivers', icon: Truck, page: 'DriverManagement' },
    { name: 'Fitters', icon: Wrench, page: 'FitterManagement' },
    { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  ],
  app_admin: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'OpsDashboard' },
    { name: 'All Jobs', icon: Package, page: 'OpsJobs' },
    { name: 'Task Queue', icon: ClipboardList, page: 'OpsTaskQueue', badge: true },
    { name: 'Cal Admin Review', icon: Users, page: 'AppAdminReviewQueue' },
    { name: 'User Review', icon: Users, page: 'CalAdminReviewQueue' },
    { name: 'Drivers', icon: Truck, page: 'DriverManagement' },
    { name: 'Fitters', icon: Wrench, page: 'FitterManagement' },
    { name: 'Users', icon: Users, page: 'UserManagement' },
    { name: 'Booking Rules', icon: Settings, page: 'BookingRules' },
  ],
};

export default function Sidebar({ user, currentPage, pendingTasks = 0 }) {
  const appRole = user?.app_role || 'customer';
  const navigation = roleNavigation[appRole] || roleNavigation.customer;
  
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">LogiFlow</h1>
            <p className="text-xs text-slate-400 capitalize">{appRole.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.name}</span>
              {item.badge && pendingTasks > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                  {pendingTasks}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
          <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          className="w-full mt-3 text-slate-400 hover:text-white hover:bg-slate-800 justify-start"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}