import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, Clock, TrendingUp, Truck, Package, Award } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverPerformance() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isDriver = user?.app_role === 'driver';

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['driverJobs', user?.email],
    queryFn: () => base44.entities.Job.filter({ driver_id: user?.email }, '-actual_completion', 100),
    enabled: !!user?.email && isDriver,
  });

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const completedJobs = jobs.filter(j => j.ops_status === 'closed');
  const monthlyCompleted = completedJobs.filter(j => {
    if (!j.actual_completion) return false;
    const date = new Date(j.actual_completion);
    return date >= monthStart && date <= monthEnd;
  });

  const onTimeJobs = monthlyCompleted.filter(j => {
    if (!j.scheduled_date || !j.actual_completion) return false;
    const scheduled = new Date(j.scheduled_date + 'T18:00:00');
    const completed = new Date(j.actual_completion);
    return completed <= scheduled;
  });

  const onTimeRate = monthlyCompleted.length > 0 
    ? Math.round((onTimeJobs.length / monthlyCompleted.length) * 100)
    : 100;

  const avgPodTime = monthlyCompleted.reduce((acc, job) => {
    if (!job.actual_completion || !job.pod_timestamp) return acc;
    const diff = (new Date(job.pod_timestamp) - new Date(job.actual_completion)) / 60000;
    return acc + diff;
  }, 0) / (monthlyCompleted.length || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Performance</h2>
        <p className="text-slate-500 mt-1">Track your delivery statistics and achievements</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="This Month"
          value={isLoading ? '-' : monthlyCompleted.length}
          icon={Package}
          subtitle="Jobs completed"
        />
        <MetricCard
          title="On-Time Rate"
          value={isLoading ? '-' : `${onTimeRate}%`}
          icon={TrendingUp}
          trend={`${onTimeJobs.length} on time`}
          trendDirection={onTimeRate >= 95 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="POD Turnaround"
          value={isLoading ? '-' : `${Math.round(avgPodTime)}m`}
          icon={Clock}
          subtitle="Average time"
        />
        <MetricCard
          title="Total Completed"
          value={isLoading ? '-' : completedJobs.length}
          icon={Award}
          subtitle="All time"
        />
      </div>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>On Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No completed jobs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  completedJobs.slice(0, 20).map(job => {
                    const wasOnTime = job.scheduled_date && job.actual_completion &&
                      new Date(job.actual_completion) <= new Date(job.scheduled_date + 'T18:00:00');

                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.job_number}</TableCell>
                        <TableCell>{job.customer_name}</TableCell>
                        <TableCell>
                          {job.scheduled_date && format(new Date(job.scheduled_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {job.actual_completion && format(new Date(job.actual_completion), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.ops_status} type="ops" size="sm" />
                        </TableCell>
                        <TableCell>
                          {wasOnTime ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}