import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const urlParams = new URLSearchParams(window.location.search);
const diffId = urlParams.get('diffId');

export default function PlanDiffReviewPage() {
  const [confirmApprove, setConfirmApprove] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: diff, isLoading: diffLoading } = useQuery({
    queryKey: ['planDiff', diffId],
    queryFn: () => base44.entities.PlanDiff.read(diffId),
    enabled: !!diffId,
  });

  const { data: diffItems = [] } = useQuery({
    queryKey: ['diffItems', diffId],
    queryFn: () => base44.entities.PlanDiffItem.filter({ plan_diff_id: diffId }, 'job_key', 500),
    enabled: !!diffId,
  });

  const { data: plan } = useQuery({
    queryKey: ['plan', diff?.plan_id],
    queryFn: () => base44.entities.Plan.read(diff.plan_id),
    enabled: !!diff?.plan_id,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.PlanDiff.update(diffId, { status: 'customer_approved' });
      const applyResult = await base44.functions.invoke('applyPlanDiff', { planDiffId: diffId });
      return applyResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['planDiff']);
      queryClient.invalidateQueries(['jobs']);
      navigate(createPageUrl(`PlanDetail?id=${diff.plan_id}`));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.PlanDiff.update(diffId, { status: 'customer_rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['planDiff']);
      navigate(createPageUrl(`PlanDetail?id=${diff.plan_id}`));
    },
  });

  if (diffLoading || !diff || !plan) return <div>Loading...</div>;

  const summary = JSON.parse(diff.summary || '{}');
  const additions = diffItems.filter(d => d.diff_type === 'added');
  const changes = diffItems.filter(d => d.diff_type === 'changed');
  const cancellations = diffItems.filter(d => d.diff_type === 'cancelled');

  const impactColor = (impact) => {
    switch (impact) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50';
      case 'LOW': return 'text-blue-600 bg-blue-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{plan.name} - Review Changes</h2>
        <p className="text-slate-600">
          Version comparison: review additions, changes, and cancellations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{summary.addedCount || 0}</p>
              <p className="text-sm text-green-700">Additions</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-3xl font-bold text-amber-600">{summary.changedCount || 0}</p>
              <p className="text-sm text-amber-700">Changes</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{summary.cancelledCount || 0}</p>
              <p className="text-sm text-red-700">Cancellations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="additions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="additions">Additions ({additions.length})</TabsTrigger>
          <TabsTrigger value="changes">Changes ({changes.length})</TabsTrigger>
          <TabsTrigger value="cancellations">Cancellations ({cancellations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="additions" className="space-y-4">
          {additions.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-slate-500">No additions</CardContent></Card>
          ) : (
            additions.map((item) => <DiffItemCard key={item.id} item={item} />)
          )}
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          {changes.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-slate-500">No changes</CardContent></Card>
          ) : (
            changes.map((item) => <DiffItemCard key={item.id} item={item} />)
          )}
        </TabsContent>

        <TabsContent value="cancellations" className="space-y-4">
          {cancellations.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-slate-500">No cancellations</CardContent></Card>
          ) : (
            cancellations.map((item) => <DiffItemCard key={item.id} item={item} />)
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-between gap-4 pt-4 border-t">
        <Button variant="outline" onClick={() => rejectMutation.mutate()} disabled={approveMutation.isPending}>
          <XCircle className="w-4 h-4 mr-2" /> Reject
        </Button>
        <Button onClick={() => setConfirmApprove(true)} disabled={approveMutation.isPending} className="gap-2">
          <CheckCircle className="w-4 h-4" /> Approve All Changes
        </Button>
      </div>

      <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            This will apply all changes to your live jobs, including creating new jobs, updating existing ones, and cancelling removed items.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApprove(false)}>
              Cancel
            </Button>
            <Button onClick={() => { approveMutation.mutate(); setConfirmApprove(false); }}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffItemCard({ item }) {
  const before = item.before_snapshot ? JSON.parse(item.before_snapshot) : null;
  const after = item.after_snapshot ? JSON.parse(item.after_snapshot) : null;
  const data = after || before;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="font-semibold">{data?.recipientName || 'Unknown'}</p>
            <p className="text-sm text-slate-500">{data?.postcode || ''}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              item.diff_type === 'added'
                ? 'bg-green-100 text-green-700'
                : item.diff_type === 'changed'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {item.diff_type}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${item.impact_level === 'HIGH' ? 'bg-red-100 text-red-700' : item.impact_level === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {item.impact_level}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">{item.change_summary}</p>
        
        {item.diff_type === 'changed' && before && after && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-3 rounded">
                <p className="font-semibold text-red-900 mb-2">Before</p>
                <div className="space-y-1 text-red-800">
                  <p><strong>DateTime:</strong> {before.dateTime}</p>
                  <p><strong>Address:</strong> {before.address}</p>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="font-semibold text-green-900 mb-2">After</p>
                <div className="space-y-1 text-green-800">
                  <p><strong>DateTime:</strong> {after.dateTime}</p>
                  <p><strong>Address:</strong> {after.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}