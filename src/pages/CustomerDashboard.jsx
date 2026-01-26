import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MetricCard from '@/components/ui/MetricCard';
import JobCard from '@/components/jobs/JobCard';
import RecentActivity from '@/components/jobs/RecentActivity';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format, isToday, isTomorrow, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Strict role-based data access
  const isCustomer = user?.app_role === 'customer' || user?.app_role === 'customer_admin';
  
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['customerJobs', user?.customer_id],
    queryFn: () => base44.entities.Job.filter({ customer_id: user?.customer_id }, '-created_date', 100),
    enabled: !!user?.customer_id && isCustomer,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['recentHistory', user?.customer_id],
    queryFn: async () => {
      const allHistory = await base44.entities.JobStatusHistory.filter({}, '-created_date', 20);
      const customerJobs = jobs.map(j => j.id);
      return allHistory.filter(h => customerJobs.includes(h.job_id));
    },
    enabled: !!user?.customer_id && isCustomer && jobs.length > 0,
  });

  // Calculate metrics
  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.customer_status));
  const todayJobs = jobs.filter(j => j.scheduled_date && isToday(new Date(j.scheduled_date)));
  const exceptionsJobs = jobs.filter(j => j.has_exception && j.customer_status !== 'completed');
  const inProgressJobs = jobs.filter(j => j.customer_status === 'in_progress');
  
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const completedThisMonth = jobs.filter(j => {
    const date = new Date(j.actual_completion || j.updated_date);
    return j.customer_status === 'completed' && date >= monthStart && date <= monthEnd;
  });

  const onTimeDeliveries = completedThisMonth.filter(j => {
    if (!j.scheduled_date || !j.actual_completion) return false;
    return new Date(j.actual_completion) <= new Date(j.scheduled_date + 'T23:59:59');
  });

  const onTimeRate = completedThisMonth.length > 0 
    ? Math.round((onTimeDeliveries.length / completedThisMonth.length) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Alert Banner - Exceptions */}
      {exceptionsJobs.length > 0 && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900">{exceptionsJobs.length} Job{exceptionsJobs.length !== 1 ? 's' : ''} Require{exceptionsJobs.length === 1 ? 's' : ''} Attention</p>
                  <p className="text-sm text-amber-700">Review exceptions and pending changes</p>
                </div>
              </div>
              <Link to={createPageUrl('CustomerJobs')}>
                <Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  View Jobs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.full_name?.split(' ')[0]}</h2>
          <p className="text-slate-500 mt-1">Here's what's happening with your logistics today</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('CreateJob')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Jobs"
          value={isLoading ? '-' : activeJobs.length}
          icon={Package}
          subtitle={`${inProgressJobs.length} in progress`}
        />
        <MetricCard
          title="Today's Deliveries"
          value={isLoading ? '-' : todayJobs.length}
          icon={Calendar}
          subtitle={format(new Date(), 'EEEE, MMM d')}
        />
        <MetricCard
          title="Exceptions"
          value={isLoading ? '-' : exceptionsJobs.length}
          icon={AlertTriangle}
          className={exceptionsJobs.length > 0 ? 'border-amber-200 bg-amber-50/30' : ''}
        />
        <MetricCard
          title="On-Time Rate"
          value={isLoading ? '-' : `${onTimeRate}%`}
          icon={TrendingUp}
          trend={`${completedThisMonth.length} completed this month`}
          trendDirection={onTimeRate >= 95 ? 'up' : onTimeRate >= 85 ? 'neutral' : 'down'}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Jobs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Live Jobs</CardTitle>
              <Link to={createPageUrl('CustomerJobs')}>
                <Button variant="ghost" size="sm" className="text-indigo-600 gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="in_progress">
                <TabsList className="mb-4">
                  <TabsTrigger value="in_progress">
                    In Progress ({inProgressJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="today">
                    Today ({todayJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="exceptions">
                    Exceptions ({exceptionsJobs.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="in_progress" className="space-y-3 mt-0">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))
                  ) : inProgressJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No jobs in progress
                    </div>
                  ) : (
                    inProgressJobs.slice(0, 5).map(job => (
                      <JobCard key={job.id} job={job} />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="today" className="space-y-3 mt-0">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))
                  ) : todayJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No jobs scheduled for today
                    </div>
                  ) : (
                    todayJobs.slice(0, 5).map(job => (
                      <JobCard key={job.id} job={job} />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="exceptions" className="space-y-3 mt-0">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))
                  ) : exceptionsJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                      No active exceptions
                    </div>
                  ) : (
                    exceptionsJobs.slice(0, 5).map(job => (
                      <JobCard key={job.id} job={job} />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - ETAs & Recent Activity */}
        <div className="space-y-6">
          {/* Upcoming ETAs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Upcoming ETAs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : inProgressJobs.filter(j => j.eta).length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    No ETAs available
                  </div>
                ) : (
                  inProgressJobs
                    .filter(j => j.eta)
                    .sort((a, b) => new Date(a.eta) - new Date(b.eta))
                    .slice(0, 4)
                    .map(job => (
                      <Link 
                        key={job.id}
                        to={createPageUrl(`JobDetail?id=${job.id}`)}
                        className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{job.job_number}</p>
                            <p className="text-xs text-slate-500 truncate">{job.delivery_postcode}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-indigo-600">
                              {format(new Date(job.eta), 'HH:mm')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {isToday(new Date(job.eta)) ? 'Today' : format(new Date(job.eta), 'MMM d')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-emerald-700">Completed</span>
                  </div>
                  <span className="font-semibold text-emerald-700">{completedThisMonth.length}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm text-indigo-700">Active</span>
                  </div>
                  <span className="font-semibold text-indigo-700">{activeJobs.length}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-slate-600" />
                    <span className="text-sm text-slate-700">On-Time Rate</span>
                  </div>
                  <span className="font-semibold text-slate-700">{onTimeRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <RecentActivity 
            activities={history.slice(0, 5).map(h => ({
              type: 'status_change',
              title: `Status updated to ${h.new_customer_status}`,
              job_number: h.job_number,
              timestamp: h.created_date
            }))}
          />
        </div>
      </div>
    </div>
  );
}