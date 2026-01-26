import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MetricCard from '@/components/ui/MetricCard';
import JobCard from '@/components/jobs/JobCard';
import OpsTaskCard from '@/components/tasks/OpsTaskCard';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
  Users,
  TrendingUp,
  Zap
} from 'lucide-react';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function OpsDashboard() {
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['opsTasks'],
    queryFn: () => base44.entities.OpsTask.filter({ status: 'pending' }, '-created_date'),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.User.filter({ app_role: 'driver' }),
  });

  // Metrics calculations
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const todayJobs = jobs.filter(j => {
    const schedDate = new Date(j.scheduled_date);
    return schedDate >= todayStart && schedDate <= todayEnd;
  });

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.ops_status));
  const exceptionsJobs = jobs.filter(j => j.has_exception && !['completed', 'cancelled'].includes(j.customer_status));
  const unallocatedJobs = jobs.filter(j => j.ops_status === 'awaiting_allocation');
  const inTransitJobs = jobs.filter(j => ['in_transit', 'en_route_delivery', 'en_route_collection'].includes(j.ops_status));
  const completedToday = todayJobs.filter(j => j.ops_status === 'completed');

  const availableDrivers = drivers.filter(d => d.available !== false);
  const busyDrivers = drivers.filter(d => jobs.some(j => j.driver_id === d.email && ['in_transit', 'en_route_delivery', 'delivering'].includes(j.ops_status)));

  const criticalTasks = tasks.filter(t => t.priority === 'critical' || t.priority === 'high');

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {criticalTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-900">{criticalTasks.length} Critical Task{criticalTasks.length !== 1 ? 's' : ''}</p>
                  <p className="text-sm text-red-700">Require immediate attention</p>
                </div>
              </div>
              <Link to={createPageUrl('OpsTaskQueue')}>
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  View Tasks
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Today's Jobs"
          value={jobsLoading ? '-' : todayJobs.length}
          icon={Package}
          subtitle={`${completedToday.length} completed`}
        />
        <MetricCard
          title="Active Jobs"
          value={jobsLoading ? '-' : activeJobs.length}
          icon={Truck}
          subtitle={`${inTransitJobs.length} in transit`}
        />
        <MetricCard
          title="Unallocated"
          value={jobsLoading ? '-' : unallocatedJobs.length}
          icon={Clock}
          className={unallocatedJobs.length > 5 ? 'border-amber-200 bg-amber-50/30' : ''}
        />
        <MetricCard
          title="Exceptions"
          value={jobsLoading ? '-' : exceptionsJobs.length}
          icon={AlertTriangle}
          className={exceptionsJobs.length > 0 ? 'border-amber-200 bg-amber-50/30' : ''}
        />
        <MetricCard
          title="Pending Tasks"
          value={tasksLoading ? '-' : tasks.length}
          icon={ClipboardList}
          className={tasks.length > 10 ? 'border-orange-200 bg-orange-50/30' : ''}
        />
        <MetricCard
          title="Available Drivers"
          value={`${availableDrivers.length - busyDrivers.length}/${drivers.length}`}
          icon={Users}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs Overview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Jobs Overview</CardTitle>
              <Link to={createPageUrl('OpsJobs')}>
                <Button variant="ghost" size="sm" className="text-indigo-600 gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="unallocated">
                <TabsList className="mb-4">
                  <TabsTrigger value="unallocated">
                    Unallocated ({unallocatedJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="in_transit">
                    In Transit ({inTransitJobs.length})
                  </TabsTrigger>
                  <TabsTrigger value="exceptions">
                    Exceptions ({exceptionsJobs.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="unallocated" className="space-y-3 mt-0">
                  {jobsLoading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
                  ) : unallocatedJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                      All jobs allocated
                    </div>
                  ) : (
                    unallocatedJobs.slice(0, 5).map(job => (
                      <JobCard key={job.id} job={job} showOpsStatus />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="in_transit" className="space-y-3 mt-0">
                  {jobsLoading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
                  ) : inTransitJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No jobs currently in transit
                    </div>
                  ) : (
                    inTransitJobs.slice(0, 5).map(job => (
                      <JobCard key={job.id} job={job} showOpsStatus />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="exceptions" className="space-y-3 mt-0">
                  {jobsLoading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
                  ) : exceptionsJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                      No active exceptions
                    </div>
                  ) : (
                    exceptionsJobs.slice(0, 5).map(job => (
                      <JobCard key={job.id} job={job} showOpsStatus />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Task Queue */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-500" />
                Task Queue
              </CardTitle>
              <Link to={createPageUrl('OpsTaskQueue')}>
                <Button variant="ghost" size="sm" className="text-indigo-600 gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasksLoading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  No pending tasks
                </div>
              ) : (
                tasks.slice(0, 4).map(task => (
                  <OpsTaskCard key={task.id} task={task} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Driver Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                Driver Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drivers.slice(0, 5).map(driver => {
                  const driverJobs = jobs.filter(j => j.driver_id === driver.email && !['completed', 'cancelled'].includes(j.ops_status));
                  const isBusy = driverJobs.length > 0;
                  
                  return (
                    <div key={driver.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isBusy ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{driver.full_name}</p>
                          <p className="text-xs text-slate-500">{driver.vehicle_reg || 'No vehicle'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{driverJobs.length} jobs</p>
                        <p className="text-xs text-slate-500">{isBusy ? 'Busy' : 'Available'}</p>
                      </div>
                    </div>
                  );
                })}
                
                {drivers.length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    No drivers configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}