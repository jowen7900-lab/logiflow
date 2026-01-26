import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import StatusBadge from '@/components/ui/StatusBadge';
import { 
  Package, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Building2 
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

export default function RecipientHistoryDrawer({ 
  open, 
  onOpenChange, 
  recipientName,
  recipientPostcode,
  history,
  userRole 
}) {
  const isOps = userRole === 'ops' || userRole === 'admin';
  
  if (!history) return null;
  
  const { deliveriesCount, lastDeliveryDate, recentJobs = [] } = history;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Recipient History</SheetTitle>
          <SheetDescription>
            {recipientName && <span className="font-medium text-slate-700">{recipientName}</span>}
            {recipientPostcode && <span className="text-slate-500 ml-2">• {recipientPostcode}</span>}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{deliveriesCount}</p>
                    <p className="text-sm text-slate-500">Total Deliveries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {lastDeliveryDate ? formatDistanceToNow(new Date(lastDeliveryDate), { addSuffix: true }) : 'N/A'}
                    </p>
                    <p className="text-sm text-slate-500">Last Delivery</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Jobs List */}
          {recentJobs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No previous deliveries found</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Recent Jobs ({recentJobs.length})</h3>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {recentJobs.map((job) => (
                    <Link
                      key={job.id}
                      to={createPageUrl(`JobDetail?id=${job.id}`)}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-slate-900">{job.jobRef}</span>
                                <StatusBadge status={job.status} type="customer" size="sm" />
                                {job.hasException && (
                                  <Badge variant="outline" className="text-red-600 border-red-200">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Exception
                                  </Badge>
                                )}
                                {job.podAvailable && (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    POD
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {job.date && format(new Date(job.date), 'PPP')}
                                </div>
                                
                                {isOps && job.customerName && (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{job.customerName}</span>
                                  </div>
                                )}
                                
                                {!isOps && job.customerName && (
                                  <div className="flex items-center gap-2 text-slate-400">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span className="italic">Another customer</span>
                                  </div>
                                )}
                                
                                {job.specialInstructions && (
                                  <div className="flex items-start gap-2 mt-2">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                    <span className="text-xs text-slate-500 line-clamp-2">
                                      {job.specialInstructions}
                                    </span>
                                  </div>
                                )}
                                
                                {job.hasException && job.exceptionReason && (
                                  <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded-md">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5" />
                                    <span className="text-xs text-red-700 line-clamp-2">
                                      {job.exceptionReason}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}