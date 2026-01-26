import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Clock,
  Star,
  AlertTriangle,
  Mail,
  Home
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function DriverManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.User.filter({ app_role: 'driver' }),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.Job.list('-scheduled_date', 500),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ['driverComplaints'],
    queryFn: () => base44.entities.DriverComplaint.list('-created_date', 200),
  });

  const getDriverStats = (driverId, driverEmail) => {
    const driverJobs = jobs.filter(j => j.driver_id === driverEmail);
    const activeJobs = driverJobs.filter(j => !['completed', 'cancelled', 'failed'].includes(j.ops_status));
    const completedJobs = driverJobs.filter(j => j.ops_status === 'completed');
    const currentJob = activeJobs.find(j => ['in_transit', 'en_route_delivery', 'delivering', 'arrived', 'en_route_collection', 'collected'].includes(j.ops_status));
    const driverComplaints = complaints.filter(c => c.driver_id === driverId && c.status !== 'dismissed');
    
    return { 
      activeJobs, 
      completedJobs, 
      currentJob, 
      totalJobs: driverJobs.length,
      complaints: driverComplaints.length,
      allComplaints: complaints.filter(c => c.driver_id === driverId)
    };
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
            const stats = getDriverStats(driver.id, driver.email);
            const isBusy = !!stats.currentJob;
            const rating = driver.driver_rating || 0;
            const hasComplaints = stats.complaints > 0;
            
            return (
              <Card 
                key={driver.id} 
                className={`cursor-pointer hover:shadow-lg transition-shadow ${isBusy ? 'border-amber-200' : ''} ${hasComplaints ? 'border-red-200' : ''}`}
                onClick={() => setSelectedDriver(driver)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBusy ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                        <User className={`w-5 h-5 ${isBusy ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{driver.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium text-slate-700">{rating.toFixed(1)}</span>
                          </div>
                          {hasComplaints && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                              {stats.complaints} complaint{stats.complaints > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant={isBusy ? 'secondary' : 'outline'} className={isBusy ? 'bg-amber-100 text-amber-700' : 'text-emerald-600'}>
                      {isBusy ? 'Busy' : 'Available'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    {driver.vehicle_reg && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{driver.vehicle_reg}</span>
                        {driver.vehicleSize && (
                          <span className="text-slate-400">({driver.vehicleSize})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {stats.currentJob && (
                    <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-amber-900 font-medium">
                          Currently: {stats.currentJob.job_number}
                        </span>
                      </div>
                      <p className="text-xs text-amber-700 mt-0.5 ml-5">
                        {stats.currentJob.delivery_postcode}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-semibold text-slate-900">{stats.activeJobs.length}</p>
                      <p className="text-xs text-slate-500">Active</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <p className="text-lg font-semibold text-emerald-600">{stats.completedJobs.length}</p>
                      <p className="text-xs text-emerald-600">Completed</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-semibold text-slate-900">{stats.totalJobs}</p>
                      <p className="text-xs text-slate-500">Total</p>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-3 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDriver(driver);
                    }}
                  >
                    View Full Details
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Driver Details Dialog */}
      {selectedDriver && (
        <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p>{selectedDriver.full_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium">{(selectedDriver.driver_rating || 0).toFixed(1)} / 5.0</span>
                    </div>
                    <Badge variant="outline" className="text-emerald-600">
                      {selectedDriver.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Contact Information</h4>
                <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{selectedDriver.email}</span>
                  </div>
                  {selectedDriver.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedDriver.phone}</span>
                    </div>
                  )}
                  {selectedDriver.homePostcode && (
                    <div className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedDriver.homePostcode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Details */}
              {selectedDriver.vehicle_reg && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-3">Vehicle Details</h4>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Truck className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-900">{selectedDriver.vehicle_reg}</p>
                        {selectedDriver.vehicleSize && (
                          <p className="text-sm text-slate-500">{selectedDriver.vehicleSize}</p>
                        )}
                      </div>
                    </div>
                    {selectedDriver.insuranceExpiry && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500">Insurance Expires</p>
                        <p className="text-sm font-medium text-slate-700">
                          {format(new Date(selectedDriver.insuranceExpiry), 'PPP')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Stats */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Performance</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-600">
                      {getDriverStats(selectedDriver.id, selectedDriver.email).completedJobs.length}
                    </p>
                    <p className="text-sm text-emerald-700">Completed Jobs</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {getDriverStats(selectedDriver.id, selectedDriver.email).activeJobs.length}
                    </p>
                    <p className="text-sm text-blue-700">Active Jobs</p>
                  </div>
                </div>
              </div>

              {/* Current Assignment */}
              {getDriverStats(selectedDriver.id, selectedDriver.email).currentJob && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-3">Current Assignment</h4>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-900">
                        {getDriverStats(selectedDriver.id, selectedDriver.email).currentJob.job_number}
                      </span>
                    </div>
                    <p className="text-sm text-amber-800">
                      {getDriverStats(selectedDriver.id, selectedDriver.email).currentJob.delivery_address}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {getDriverStats(selectedDriver.id, selectedDriver.email).currentJob.delivery_postcode}
                    </p>
                  </div>
                </div>
              )}

              {/* Complaints */}
              {getDriverStats(selectedDriver.id, selectedDriver.email).allComplaints.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Complaints ({getDriverStats(selectedDriver.id, selectedDriver.email).allComplaints.length})
                  </h4>
                  <div className="space-y-2">
                    {getDriverStats(selectedDriver.id, selectedDriver.email).allComplaints.slice(0, 5).map((complaint) => (
                      <div key={complaint.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={complaint.status === 'resolved' ? 'outline' : 'destructive'} className="text-xs">
                                {complaint.status}
                              </Badge>
                              <span className="text-xs text-slate-500 capitalize">{complaint.complaint_type.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-sm text-slate-700">{complaint.description}</p>
                            {complaint.job_number && (
                              <p className="text-xs text-slate-500 mt-1">Job: {complaint.job_number}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}