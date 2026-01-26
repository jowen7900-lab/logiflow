import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, Menu, X, Check, AlertTriangle, Info, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const notificationIcons = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertTriangle,
  action_required: AlertTriangle,
};

const notificationColors = {
  info: 'text-blue-500 bg-blue-50',
  success: 'text-emerald-500 bg-emerald-50',
  warning: 'text-amber-500 bg-amber-50',
  error: 'text-red-500 bg-red-50',
  action_required: 'text-orange-500 bg-orange-50',
};

export default function Header({ title, subtitle, notifications = [], onMarkRead, onToggleMobile }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onToggleMobile}
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center">
          {searchOpen ? (
            <div className="relative">
              <Input
                placeholder="Search jobs..."
                className="w-64 pl-10 pr-10"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-5 h-5 text-slate-500" />
            </Button>
          )}
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-500" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Notifications</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-8 text-center text-slate-500 text-sm">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => {
                  const Icon = notificationIcons[notification.type] || Info;
                  const colorClass = notificationColors[notification.type] || notificationColors.info;
                  
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`px-3 py-3 cursor-pointer ${!notification.read ? 'bg-slate-50' : ''}`}
                      onClick={() => onMarkRead && onMarkRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {format(new Date(notification.created_date), 'MMM d, HH:mm')}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
            {notifications.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-indigo-600">
                  View all notifications
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}