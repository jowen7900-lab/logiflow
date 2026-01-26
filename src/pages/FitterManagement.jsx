import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Wrench,
  User,
  Phone,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function FitterManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: fitters = [], isLoading } = useQuery({
    queryKey: ['fitters'],
    queryFn: () => base44.entities.User.filter({ app_role: 'fitter' }),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.Job.filter({ requires_fitter: true }),
  });

  const getFitterStats = (fitterEmail) => {
    const fitterJobs = jobs.filter(j => j.fitter_id === fitterEmail);
    const activeJobs = fitterJobs.filter(j => !['completed', 'cancelled', 'failed'].includes(j.ops_status));
    const completedJobs = fitterJobs.filter(j => j.ops_status === 'completed');
    
    return { activeJobs, completedJobs, totalJobs: fitterJobs.length };
  };

  const filteredFitters = fitters.filter(f => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return f.full_name?.toLowerCase().includes(search) ||
           f.email?.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search fitters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Fitter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))
        ) : filteredFitters.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No fitters found</p>
          </div>
        ) : (
          filteredFitters.map(fitter => {
            const stats = getFitterStats(fitter.email);
            const isBusy = stats.activeJobs.length > 0;
            
            return (
              <Card key={fitter.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBusy ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                        <Wrench className={`w-5 h-5 ${isBusy ? 'text-purple-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{fitter.full_name}</p>
                        <p className="text-sm text-slate-500">{fitter.email}</p>
                      </div>
                    </div>
                    <Badge variant={isBusy ? 'secondary' : 'outline'} className={isBusy ? 'bg-purple-100 text-purple-700' : 'text-emerald-600'}>
                      {stats.activeJobs.length} active
                    </Badge>
                  </div>

                  {fitter.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {fitter.phone}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-semibold text-purple-600">{stats.activeJobs.length}</p>
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