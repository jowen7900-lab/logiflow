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
import { Search, Wrench, User, Phone, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerFitters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFitter, setSelectedFitter] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: fitters = [], isLoading } = useQuery({
    queryKey: ['fitters'],
    queryFn: () => base44.entities.Fitter.filter({ status: 'active' }, '-created_date', 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['customerJobs', user?.customer_id],
    queryFn: () =>
      base44.entities.Job.filter({ customer_id: user?.customer_id }, '-created_date', 200),
    enabled: !!user?.customer_id,
  });

  const getFitterStats = (fitterId) => {
    const fitterJobs = jobs.filter((j) => j.fitter_id === fitterId);
    const activeJobs = fitterJobs.filter(
      (j) => !['completed', 'cancelled', 'failed', 'delivered', 'closed'].includes(j.ops_status)
    );
    const completedJobs = fitterJobs.filter((j) =>
      ['delivered', 'closed'].includes(j.ops_status)
    );

    return {
      activeJobs,
      completedJobs,
      totalJobs: fitterJobs.length,
    };
  };

  const filteredFitters = fitters.filter((f) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      f.name?.toLowerCase().includes(search) || 
      f.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search fitters by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Fitters Table */}
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
          ) : filteredFitters.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No fitters found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Your Jobs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFitters.map((fitter) => {
                  const stats = getFitterStats(fitter.id);
                  return (
                    <TableRow key={fitter.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="font-medium">{fitter.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {fitter.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {fitter.phone}
                            </div>
                          ) : fitter.email ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {fitter.email}
                            </div>
                          ) : (
                            '—'
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{fitter.specialization || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            fitter.status === 'active' ? 'text-emerald-600' : 'text-slate-600'
                          }
                        >
                          {fitter.status || 'active'}
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
                          onClick={() => setSelectedFitter(fitter)}
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

      {/* Fitter Details Dialog */}
      {selectedFitter && (
        <Dialog open={!!selectedFitter} onOpenChange={() => setSelectedFitter(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <p>{selectedFitter.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {selectedFitter.status || 'active'}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Contact Information</h4>
                <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                  {selectedFitter.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedFitter.phone}</span>
                    </div>
                  )}
                  {selectedFitter.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{selectedFitter.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Specialization */}
              {selectedFitter.specialization && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 mb-3">Specialization</h4>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <Badge variant="outline" className="capitalize">
                      {selectedFitter.specialization}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Jobs */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-3">Your Jobs</h4>
                <div className="space-y-2">
                  {getFitterStats(selectedFitter.id).totalJobs === 0 ? (
                    <p className="text-sm text-slate-500">No jobs assigned</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {getFitterStats(selectedFitter.id).activeJobs.length}
                        </p>
                        <p className="text-sm text-purple-700">Active</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">
                          {getFitterStats(selectedFitter.id).completedJobs.length}
                        </p>
                        <p className="text-sm text-emerald-700">Completed</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">
                          {getFitterStats(selectedFitter.id).totalJobs}
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