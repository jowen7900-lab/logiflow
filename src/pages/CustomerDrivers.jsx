import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, Truck, User, Phone, Mail, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function CustomerDrivers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({
        app_role: 'driver',
        approval_status: 'approved',
      });
      return users;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['customerJobs', user?.customer_id],
    queryFn: () =>
      base44.entities.Job.filter({ customer_id: user?.customer_id }, '-created_date', 200),
    enabled: !!user?.customer_id,
  });

  const getDriverStats = (driverEmail) => {
    const driverJobs = jobs.filter((j) => j.driver_id === driverEmail);
    const activeJobs = driverJobs.filter(
      (j) => !['completed', 'cancelled', 'failed', 'delivered', 'closed'].includes(j.ops_status)
    );
    const completedJobs = driverJobs.filter((j) => ['delivered', 'closed'].includes(j.ops_status));

    return {
      activeJobs,
      completedJobs,
      totalJobs: driverJobs.length,
    };
  };

  const filteredDrivers = drivers.filter((d) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      d.full_name?.toLowerCase().includes(search) || 
      d.email?.toLowerCase().includes(search) ||
      d.vehicle_reg?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search drivers by name or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No drivers found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Your Jobs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => {
                  const stats = getDriverStats(driver.email);
                  return (
                    <TableRow key={driver.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="font-medium">{driver.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {driver.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {driver.phone}
                            </div>
                          ) : driver.email ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {driver.email}
                            </div>
                          ) : (
                            '—'
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {driver.vehicle_reg ? (
                            <div>
                              <p className="font-medium">{driver.vehicle_reg}</p>
                              {driver.vehicle_type && (
                                <p className="text-xs text-slate-500">{driver.vehicle_type}</p>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            driver.status === 'active' ? 'text-emerald-600' : 'text-slate-600'
                          }
                        >
                          {driver.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{stats.totalJobs}</p>
                          <p className="text-xs text-slate-500">
                            {stats.activeJobs.length} active
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDriver(driver)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Driver Details Dialog */}
      {selectedDriver && (
        <Dialog open={!!selectedDriver} onOpenChange={() => setSelectedDriver(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <p>{selectedDriver.full_name}</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedDriver.status || 'active'}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Contact Information</h4>
                <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                  {selectedDriver.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedDriver.phone}</span>
                    </div>
                  )}
                  {selectedDriver.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedDriver.email}</span>
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
                        {selectedDriver.vehicle_type && (
                          <p className="text-sm text-slate-500">{selectedDriver.vehicle_type}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Jobs */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Your Jobs</h4>
                <div className="space-y-2">
                  {getDriverStats(selectedDriver.email).totalJobs === 0 ? (
                    <p className="text-sm text-slate-500">No jobs assigned</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {getDriverStats(selectedDriver.email).activeJobs.length}
                        </p>
                        <p className="text-sm text-blue-700">Active</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">
                          {getDriverStats(selectedDriver.email).completedJobs.length}
                        </p>
                        <p className="text-sm text-emerald-700">Completed</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">
                          {getDriverStats(selectedDriver.email).totalJobs}
                        </p>
                        <p className="text-sm text-slate-700">Total</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}