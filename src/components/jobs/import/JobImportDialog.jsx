import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import JobPreviewTable from './JobPreviewTable';

export default function JobImportDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('input'); // input | preview | confirming
  const [importName, setImportName] = useState('');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [expandedJob, setExpandedJob] = useState(null);

  // Parse file
  const parseMutation = useMutation({
    mutationFn: async (fileUrl) => {
      // Create temp JobImport in draft status
      const jobImport = await base44.entities.JobImport.create({
        customer_id: user.customer_id,
        name: importName,
        created_by_user_id: user.id,
        status: 'draft',
      });

      // Parse file
      const response = await base44.functions.invoke('parseJobImportFile', {
        jobImportId: jobImport.id,
        fileUrl,
        fileName: file.name,
      });

      if (response.data.status === 'failed') {
        setParseErrors(response.data.errors || []);
        // Delete draft import on parse failure
        await base44.entities.JobImport.delete(jobImport.id);
        throw new Error('Parse failed');
      }

      return { jobImport, parsedData: response.data };
    },
    onSuccess: (result) => {
      setParsedData(result.parsedData);
      setParseErrors([]);
      setStep('preview');
    },
    onError: (error) => {
      setParseErrors([{ row: 0, error: error.message }]);
    },
  });

  // Create import
  const createMutation = useMutation({
    mutationFn: async () => {
      const groupedJobs = parsedData.grouped_jobs;
      const jobImportId = parsedData.job_import_id;

      // Create all jobs
      const jobs = [];
      for (const [jobKey, jobData] of Object.entries(groupedJobs)) {
        const jobNumber = `IMP-${jobImportId.slice(0, 8)}-${jobKey}`.slice(0, 50);
        jobs.push({
          job_number: jobNumber,
          customer_id: user.customer_id,
          customer_name: user.full_name || user.email,
          job_type: jobData.job_type,
          customer_status: 'requested',
          ops_status: 'allocated',
          collection_address: jobData.collection_address,
          collection_postcode: jobData.collection_postcode,
          collection_contact: jobData.collection_contact,
          collection_phone: jobData.collection_phone,
          collection_date: jobData.collection_date,
          collection_time_slot: jobData.collection_time_slot,
          collection_time: jobData.collection_time,
          delivery_address: jobData.delivery_address,
          delivery_postcode: jobData.delivery_postcode,
          delivery_contact: jobData.delivery_contact,
          delivery_phone: jobData.delivery_phone,
          delivery_date: jobData.delivery_date,
          delivery_time_slot: jobData.delivery_time_slot,
          delivery_time: jobData.delivery_time,
          scheduled_date: jobData.delivery_date,
          scheduled_time_slot: jobData.delivery_time_slot,
          scheduled_time: jobData.delivery_time,
          special_instructions: jobData.special_instructions,
          requires_fitter: jobData.requires_fitter,
          fitter_id: jobData.fitter_id || null,
          fitter_name: jobData.fitter_name || null,
          job_import_id: jobImportId,
          job_import_name: importName,
          items: jobData.items,
        });
      }

      // Bulk create jobs
      await base44.asServiceRole.entities.Job.bulkCreate(jobs);

      // Update JobImport status
      await base44.asServiceRole.entities.JobImport.update(jobImportId, {
        status: 'created',
        jobs_created_count: jobs.length,
        last_upload_filename: file.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerJobs'] });
      // Reset
      setStep('input');
      setImportName('');
      setFile(null);
      setParsedData(null);
      setParseErrors([]);
      setExpandedJob(null);
      onOpenChange(false);
    },
  });

  const handleUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseErrors([]);
    setParsedData(null);

    // Upload file and get URL
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const uploadResponse = await base44.integrations.Core.UploadFile({
        file: selectedFile,
      });
      
      setStep('parsing');
      parseMutation.mutate(uploadResponse.file_url);
    } catch (error) {
      setParseErrors([{ row: 0, error: 'Failed to upload file' }]);
    }
  };

  const canParse = importName.trim() && file;
  const hasErrors = parseErrors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Jobs</DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Upload a CSV file with your jobs'}
            {step === 'preview' && 'Review your jobs before confirming'}
            {step === 'parsing' && 'Parsing your file...'}
          </DialogDescription>
        </DialogHeader>

        {/* Input Step */}
        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Import Name *</label>
              <Input
                placeholder="e.g., February Bulk Upload"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">CSV File *</label>
              <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleUpload}
                  disabled={parseMutation.isPending}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-900">
                    {file ? file.name : 'Click to upload or drag file'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">CSV format</p>
                </label>
              </div>
            </div>

            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {parseErrors[0].error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Parsing Step */}
        {step === 'parsing' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-slate-600">Parsing file...</span>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4">
            {hasErrors && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {parseErrors.length} validation error(s) found
                </AlertDescription>
              </Alert>
            )}

            {!hasErrors && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  ✓ {parsedData.jobs_count} jobs ready to create
                </AlertDescription>
              </Alert>
            )}

            <JobPreviewTable
              jobs={Object.values(parsedData.grouped_jobs)}
              expandedJob={expandedJob}
              onToggleExpand={setExpandedJob}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setStep('input');
            setParseErrors([]);
            setParsedData(null);
            setExpandedJob(null);
          }}>
            {step === 'preview' ? 'Back' : 'Cancel'}
          </Button>

          {step === 'input' && (
            <Button
              onClick={() => parseMutation.mutate()}
              disabled={!canParse || parseMutation.isPending}
            >
              {parseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Parse & Preview
            </Button>
          )}

          {step === 'preview' && (
            <Button
              onClick={() => createMutation.mutate()}
              disabled={hasErrors || createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm & Create
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}