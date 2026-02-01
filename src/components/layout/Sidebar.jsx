import React, { useState } from 'react';
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
  ChevronDown,
  LogOut,
  Building2,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const roleNavigation = {
  admin: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'OpsDashboard' },
    { name: 'All Jobs', icon: Package, page: 'OpsJobs' },
    { name: 'Task Queue', icon: ClipboardList, page: 'OpsTaskQueue', badge: true },
    { 
      name: 'Users', 
      icon: Users, 
      children: [
        { name: 'Drivers', icon: Truck, page: 'DriverManagement' },
        { name: 'Fitters', icon: Wrench, page: 'FitterManagement' },
        { name: 'Customers', icon: Building2, page: 'CustomerManagement' },
        { name: 'User Approvals', icon: UserCheck, page: 'UserManagement' },
      ]
    },
  ],
  customer: [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'CustomerDashboard' },
    { name: 'My Jobs', icon: Package, page: 'CustomerJobs' },
    { name: 'Create Job', icon: Plus, page: 'CreateJob' },
    { name: 'Drivers', icon: Truck, page: 'CustomerDrivers' },
    { name: 'Fitters', icon: Wrench, page: 'CustomerFitters' },
    { name: 'Address List', icon: Building2, page: 'AddressList' },
  ],
  driver: [
    { name: 'My Jobs', icon: Package, page: 'DriverJobs' },
    { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  ],
  fitter: [
    { name: 'My Jobs', icon: Wrench, page: 'FitterJobs' },
    { name: 'Messages', icon: MessageSquare, page: 'Messages' },
  ],
};

export default function Sidebar({ user, currentPage, pendingTasks = 0 }) {
  // Map app_admin to admin navigation
  const appRole = user?.app_role === 'app_admin' ? 'admin' : user?.app_role;
  const navigation = roleNavigation[appRole] || [];
  const [openDropdowns, setOpenDropdowns] = useState({});
  
  const handleLogout = () => {
    base44.auth.logout();
  };

  const toggleDropdown = (itemName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69775c233dcecf962ffaee75/71653c067_logo.png" 
            alt="BHID Demo" 
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-lg font-bold text-white">BHID Demo</h1>
            <p className="text-xs text-slate-400 capitalize">{appRole.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          if (item.children) {
            const isOpen = openDropdowns[item.name];
            const isAnyChildActive = item.children.some(child => child.page === currentPage);
            
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleDropdown(item.name)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full',
                    isAnyChildActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isActive = currentPage === child.page;
                      return (
                        <Link
                          key={child.page}
                          to={createPageUrl(child.page)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          )}
                        >
                          <child.icon className="w-4 h-4" />
                          <span className="flex-1">{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
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