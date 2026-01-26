import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Truck,
  User,
  Phone,
  MapPin,
  Package,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.User.filter({ app_role: 'driver' }),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.Job.list('-scheduled_date', 500),
  });

  const getDriverStats = (driverEmail) => {
    const driverJobs = jobs.filter(j => j.driver_id === driverEmail);
    const activeJobs = driverJobs.filter(j => !['completed', 'cancelled', 'failed'].includes(j.ops_status));
    const completedJobs = driverJobs.filter(j => j.ops_status === 'completed');
    const currentJob = activeJobs.find(j => ['in_transit', 'en_route_delivery', 'delivering'].includes(j.ops_status));
    
    return { activeJobs, completedJobs, currentJob, totalJobs: driverJobs.length };
  };

  const filteredDrivers = drivers.filter(d => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return d.full_name?.toLowerCase().includes(search) ||
           d.email?.toLowerCase().includes(search) ||
           d.vehicle_reg?.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Driver Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))
        ) : filteredDrivers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No drivers found</p>
          </div>
        ) : (
          filteredDrivers.map(driver => {
            const stats = getDriverStats(driver.email);
            const isBusy = !!stats.currentJob;
            
            return (
              <Card key={driver.id} className={isBusy ? 'border-amber-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBusy ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                        <User className={`w-5 h-5 ${isBusy ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{driver.full_name}</p>
                        <p className="text-sm text-slate-500">{driver.email}</p>
                      </div>
                    </div>
                    <Badge variant={isBusy ? 'secondary' : 'outline'} className={isBusy ? 'bg-amber-100 text-amber-700' : 'text-emerald-600'}>
                      {isBusy ? 'Busy' : 'Available'}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    {driver.vehicle_reg && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Truck className="w-4 h-4 text-slate-400" />
                        {driver.vehicle_reg}
                        {driver.vehicle_type && (
                          <span className="text-slate-400">({driver.vehicle_type})</span>
                        )}
                      </div>
                    )}
                    {driver.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {driver.phone}
                      </div>
                    )}
                  </div>

                  {stats.currentJob && (
                    <div className="p-2 bg-amber-50 rounded-lg mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-800 font-medium">
                          {stats.currentJob.job_number}
                        </span>
                        <span className="text-amber-600">
                          {stats.currentJob.delivery_postcode}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-semibold text-slate-900">{stats.activeJobs.length}</p>
                      <p className="text-xs text-slate-500">Active</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-semibold text-emerald-600">{stats.completedJobs.length}</p>
                      <p className="text-xs text-slate-500">Done</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-semibold text-slate-900">{stats.totalJobs}</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}