import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function JobPreviewTable({ jobs, expandedJob, onToggleExpand }) {
  return (
    <Card className="overflow-hidden">
      <Table className="text-sm">
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Job Key</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Collection</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Fitter</TableHead>
            <TableHead className="text-right">Items</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const isExpanded = expandedJob === job.job_key;
            return (
              <React.Fragment key={job.job_key}>
                <TableRow className="hover:bg-slate-50">
                  <TableCell>
                    <button
                      onClick={() => onToggleExpand(isExpanded ? null : job.job_key)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium text-indigo-600">{job.job_key}</TableCell>
                  <TableCell className="capitalize">{job.job_type}</TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p className="truncate max-w-[120px]">{job.collection_postcode}</p>
                      {job.collection_date && !isNaN(new Date(job.collection_date).getTime()) && (
                        <p className="text-slate-500">
                          {format(new Date(job.collection_date), 'MMM d')} {job.collection_time_slot}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <p className="truncate max-w-[120px]">{job.delivery_postcode}</p>
                      {job.delivery_date && !isNaN(new Date(job.delivery_date).getTime()) && (
                        <p className="text-slate-500">
                          {format(new Date(job.delivery_date), 'MMM d')} {job.delivery_time_slot}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {job.requires_fitter ? (
                      <div className="text-xs">
                        <p className="font-medium">{job.fitter_name || '-'}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {job.items?.length || 0}
                  </TableCell>
                </TableRow>

                {isExpanded && job.items && (
                  <TableRow className="bg-slate-50">
                    <TableCell colSpan={7} className="p-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700 uppercase">Items</p>
                        <div className="space-y-1">
                          {job.items.map((item, idx) => (
                            <div key={idx} className="text-xs bg-white p-2 rounded border border-slate-200">
                              <p className="font-medium">{item.description}</p>
                              <p className="text-slate-600">
                                Qty: {item.quantity} | Weight: {item.weight_kg}kg
                                {item.dimensions && ` | ${item.dimensions}`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}