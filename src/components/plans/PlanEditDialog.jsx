import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PlanEditDialog({ open, onOpenChange, mode, job, planId, latestVersionId }) {
  const [formData, setFormData] = useState(job || {});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const updateJobMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanLine.update(job.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['planJobs', latestVersionId]);
      onOpenChange(false);
    },
  });

  const uploadBulkMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const versions = await base44.entities.PlanVersion.filter({ plan_id: planId }, '-version_number', 1);
      
      const newVersionNumber = (versions[0]?.version_number || 0) + 1;
      const version = await base44.entities.PlanVersion.create({
        plan_id: planId,
        version_number: newVersionNumber,
        uploaded_by_user_id: (await base44.auth.me()).id,
        source_file_name: file.name,
        raw_file_url: file_url,
        parse_status: 'pending',
      });

      const parseResult = await base44.functions.invoke('parsePlanFile', {
        planVersionId: version.id,
        fileUrl: file_url,
        fileName: file.name,
      });

      if (parseResult.data.status === 'failed') {
        throw new Error('File parsing failed');
      }

      if (versions.length > 0) {
        const diffResult = await base44.functions.invoke('computePlanDiff', {
          planId: planId,
          fromVersionId: versions[0].id,
          toVersionId: version.id,
        });
        
        await base44.entities.Plan.update(planId, { status: 'pending_review' });
        
        return { diffId: diffResult.data.diffId };
      }

      return { versionId: version.id };
    },
    onSuccess: (result) => {
      if (result.diffId) {
        navigate(createPageUrl(`PlanDiffReview?diffId=${result.diffId}`));
      } else {
        queryClient.invalidateQueries(['planJobs', latestVersionId]);
        onOpenChange(false);
      }
    },
  });

  const handleSaveJob = () => {
    updateJobMutation.mutate(formData);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBulkMutation.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Plan</DialogTitle>
        </DialogHeader>

        {mode === 'individual' && job && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient/Collection Name</label>
              <Input
                value={formData.delivery_recipient_name || formData.collection_name || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  delivery_recipient_name: e.target.value,
                  collection_name: e.target.value
                })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={formData.delivery_address1 || formData.collection_address1 || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  delivery_address1: e.target.value,
                  collection_address1: e.target.value
                })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Postcode</label>
              <Input
                value={formData.delivery_postcode || formData.collection_postcode || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  delivery_postcode: e.target.value,
                  collection_postcode: e.target.value
                })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date & Time</label>
              <Input
                type="datetime-local"
                value={formData.delivery_date_time || formData.collection_date_time || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  delivery_date_time: e.target.value,
                  collection_date_time: e.target.value
                })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Goods Description</label>
              <Input
                value={formData.goods_description || ''}
                onChange={(e) => setFormData({ ...formData, goods_description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-20"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSaveJob} disabled={updateJobMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === 'bulk' && (
          <div className="space-y-4 py-4">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <p className="text-sm text-slate-600">
                  Upload a new CSV or XLSX file to replace the plan. The system will identify additions, changes, and cancellations.
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  disabled={uploadBulkMutation.isPending}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadBulkMutation.isPending && (
                  <p className="text-sm text-blue-600">Processing file...</p>
                )}
              </TabsContent>

              <TabsContent value="info">
                <div className="text-sm text-slate-600 space-y-2">
                  <p><strong>Required columns:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>delivery_recipient_name or collection_name</li>
                    <li>delivery_address1 or collection_address1</li>
                    <li>delivery_postcode or collection_postcode</li>
                    <li>delivery_date_time or collection_date_time</li>
                    <li>goods_description</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}