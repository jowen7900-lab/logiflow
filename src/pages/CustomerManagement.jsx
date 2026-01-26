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
  Building2,
  Mail,
  Phone,
  MapPin,
  Package,
  ExternalLink,
  Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';

const tierColors = {
  standard: 'bg-slate-100 text-slate-700',
  premium: 'bg-amber-100 text-amber-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['allJobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
  });

  const getCustomerStats = (customerId) => {
    const customerJobs = jobs.filter(j => j.customer_id === customerId);
    const activeJobs = customerJobs.filter(j => !['completed', 'cancelled'].includes(j.customer_status));
    const completedJobs = customerJobs.filter(j => j.customer_status === 'completed');
    
    return { activeJobs: activeJobs.length, completedJobs: completedJobs.length, totalJobs: customerJobs.length };
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return c.name?.toLowerCase().includes(search) ||
           c.code?.toLowerCase().includes(search) ||
           c.contact_email?.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Active Jobs</TableHead>
                  <TableHead>Total Jobs</TableHead>
                  <TableHead>Account Manager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map(customer => {
                    const stats = getCustomerStats(customer.id);
                    
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-slate-500">{customer.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.contact_name && (
                              <p className="text-sm">{customer.contact_name}</p>
                            )}
                            {customer.contact_email && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Mail className="w-3 h-3" />
                                {customer.contact_email}
                              </div>
                            )}
                            {customer.contact_phone && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Phone className="w-3 h-3" />
                                {customer.contact_phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={tierColors[customer.tier] || tierColors.standard}>
                            {customer.tier === 'enterprise' && <Star className="w-3 h-3 mr-1" />}
                            {customer.tier || 'Standard'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-indigo-600">{stats.activeJobs}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">{stats.totalJobs}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {customer.account_manager || '-'}
                          </span>
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