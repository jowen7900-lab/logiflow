import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PlanJobsView from '@/components/plans/PlanJobsView';

const urlParams = new URLSearchParams(window.location.search);
const planId = urlParams.get('id');

export default function PlanDetailPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      const plans = await base44.entities.Plan.filter({ 
        id: planId,
        customer_id: user.customer_id 
      });
      if (plans.length === 0) throw new Error('Plan not found or access denied');
      return plans[0];
    },
    enabled: !!planId && !!user?.customer_id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['planVersions', planId],
    queryFn: () => base44.entities.PlanVersion.filter({ plan_id: planId }, '-version_number', 50),
    enabled: !!planId,
  });

  const { data: diffs = [] } = useQuery({
    queryKey: ['planDiffs', planId],
    queryFn: () => base44.entities.PlanDiff.filter({ plan_id: planId }, '-created_date', 50),
    enabled: !!planId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create new version
      const newVersionNumber = (versions[0]?.version_number || 0) + 1;
      const version = await base44.entities.PlanVersion.create({
        plan_id: planId,
        version_number: newVersionNumber,
        uploaded_by_user_id: (await base44.auth.me()).id,
        source_file_name: file.name,
        raw_file_url: file_url,
        parse_status: 'pending',
      });

      // Parse file
      const parseResult = await base44.functions.invoke('parsePlanFile', {
        planVersionId: version.id,
        fileUrl: file_url,
        fileName: file.name,
      });

      if (parseResult.data.status === 'failed') {
        return { success: false, errors: parseResult.data.errors, versionId: version.id };
      }

      // Compute diff if not first version
      if (versions.length > 0) {
        const diffResult = await base44.functions.invoke('computePlanDiff', {
          planId: planId,
          fromVersionId: versions[0].id,
          toVersionId: version.id,
        });
        
        // Update plan status
        await base44.entities.Plan.update(planId, { status: 'pending_review' });
        
        navigate(createPageUrl(`PlanDiffReview?diffId=${diffResult.data.diffId}`));
      }

      return { success: true, versionId: version.id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['planVersions', planId]);
      if (result.success && versions.length === 0) {
        // First version uploaded, stay on page
        setUploadOpen(false);
      }
    },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleDownloadTemplate = async () => {
    const response = await base44.functions.invoke('generatePlanTemplate', {});
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plan_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (planLoading) return <div>Loading...</div>;
  
  if (planError || !plan) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Unable to load plan</p>
            <p className="text-sm text-red-600 mt-1">{planError?.message || 'Plan not found or you do not have permission to view it.'}</p>
            <Button variant="outline" className="mt-3" onClick={() => navigate(createPageUrl('Plans'))}>
              Back to Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestVersion = versions[0];
  const latestDiff = diffs[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{plan.name}</h2>
          <p className="text-slate-500 mt-1">Status: {plan.status.replace(/_/g, ' ')}</p>
        </div>
        <Button onClick={() => setUploadOpen(!uploadOpen)} className="gap-2">
          <Upload className="w-4 h-4" /> Upload Version
        </Button>
      </div>

      {uploadOpen && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-600">
                Upload a CSV or XLSX file with job data. Required columns: delivery_recipient_name, delivery_address1, delivery_postcode, delivery_date_time
              </p>
              <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2 w-full sm:w-auto">
                <Download className="w-4 h-4" /> Download Template
              </Button>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                disabled={uploadMutation.isPending}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadMutation.isPending && <p className="text-sm text-blue-600">Uploading and parsing...</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {versions.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-amber-800">No versions uploaded yet. Upload your first file above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold">Versions ({versions.length})</h3>
          {versions.map((version) => (
            <Card key={version.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">Version {version.version_number}</CardTitle>
                    <p className="text-sm text-slate-500">
                      {version.source_file_name} • {version.rows_count || 0} rows
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    version.parse_status === 'parsed'
                      ? 'bg-green-100 text-green-700'
                      : version.parse_status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {version.parse_status}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {latestVersion && <PlanJobsView planId={planId} latestVersion={latestVersion} />}

      {latestDiff && (
        <div className="space-y-4">
          <h3 className="font-semibold">Pending Review</h3>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-900 mb-4">
                Latest version has {latestDiff.summary && JSON.parse(latestDiff.summary).addedCount} additions, {JSON.parse(latestDiff.summary).changedCount} changes, {JSON.parse(latestDiff.summary).cancelledCount} cancellations
              </p>
              <Button
                onClick={() => navigate(createPageUrl(`PlanDiffReview?diffId=${latestDiff.id}`))}
                className="w-full"
              >
                Review Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}