import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Calendar,
  Clock,
  Phone,
  User,
  Truck,
  MessageSquare,
  Wrench,
  Package,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function FitterJobs() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['fitterJobs', user?.id],
    queryFn: () => base44.entities.Job.filter({ fitter_id: user?.id }, '-scheduled_date'),
    enabled: !!user?.id,
  });

  const myActiveJobs = jobs.filter(j => !['completed', 'cancelled', 'failed'].includes(j.ops_status));
  const myCompletedJobs = jobs.filter(j => ['completed'].includes(j.ops_status));

  const getDateLabel = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEE, MMM d');
  };

  const JobCard = ({ job, showAssign = false }) => (
    <Card className={cn(
      'overflow-hidden',
      job.priority === 'critical' && 'border-l-4 border-l-red-500',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Link 
                to={createPageUrl(`JobDetail?id=${job.id}`)}
                className="font-semibold text-slate-900 hover:text-indigo-600"
              >
                {job.job_number}
              </Link>
              <StatusBadge status={job.ops_status} type="ops" size="sm" />
            </div>
            <p className="text-sm text-slate-500">{job.customer_name}</p>
          </div>
          <span className={cn(
            'px-2 py-1 rounded-md text-xs font-medium',
            job.job_type === 'install' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
          )}>
            {job.job_type}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm">{job.delivery_address}</p>
              <p className="text-xs text-slate-500">{job.delivery_postcode}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-slate-600">
              <Calendar className="w-4 h-4" />
              <span className={cn(
                isToday(new Date(job.scheduled_date)) && 'text-indigo-600 font-medium'
              )}>
                {getDateLabel(job.scheduled_date)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-600">
              <Clock className="w-4 h-4" />
              {job.scheduled_time_slot?.toUpperCase()}
            </div>
          </div>

          {job.driver_name && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Truck className="w-4 h-4" />
              <span>Driver: {job.driver_name}</span>
            </div>
          )}

          {job.delivery_contact && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4" />
              <span>{job.delivery_contact}</span>
              {job.delivery_phone && (
                <a href={`tel:${job.delivery_phone}`} className="text-indigo-600">
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>

        {job.special_instructions && (
          <div className="p-2 bg-amber-50 rounded-lg mb-4">
            <p className="text-xs text-amber-800">{job.special_instructions}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Link to={createPageUrl(`JobDetail?id=${job.id}`)} className="flex-1">
            <Button variant="outline" className="w-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              View & Chat
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{myActiveJobs.length}</p>
            <p className="text-sm text-slate-500">My Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{myCompletedJobs.length}</p>
            <p className="text-sm text-slate-500">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs */}
      <Tabs defaultValue="my_jobs">
        <TabsList>
          <TabsTrigger value="my_jobs">
            <Wrench className="w-4 h-4 mr-2" />
            My Jobs ({myActiveJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Completed ({myCompletedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my_jobs" className="mt-4 space-y-4">
          {myActiveJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No jobs assigned to you</p>
              </CardContent>
            </Card>
          ) : (
            myActiveJobs.map(job => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-4">
          {myCompletedJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No completed jobs yet</p>
              </CardContent>
            </Card>
          ) : (
            myCompletedJobs.map(job => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}