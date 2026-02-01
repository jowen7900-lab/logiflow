import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import JobPreviewTable from './JobPreviewTable';

export default function JobImportDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('input'); // input | preview | confirming
  const [mode, setMode] = useState('new'); // new | replace
  const [importName, setImportName] = useState('');
  const [selectedImportId, setSelectedImportId] = useState('');
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [expandedJob, setExpandedJob] = useState(null);
  const [replaceConfirm, setReplaceConfirm] = useState(false);

  // Fetch existing imports
  const { data: existingImports = [] } = useQuery({
    queryKey: ['jobImports', user?.customer_id],
    queryFn: () => base44.entities.JobImport.filter(
      { customer_id: user?.customer_id },
      '-created_date',
      100
    ),
    enabled: !!user?.customer_id && open,
  });

  // Parse file
  const parseMutation = useMutation({
    mutationFn: async (fileUrl) => {
      let jobImportId;

      if (mode === 'new') {
        // Create temp JobImport in draft status
        const jobImport = await base44.entities.JobImport.create({
          customer_id: user.customer_id,
          name: importName,
          created_by_user_id: user.id,
          status: 'draft',
        });
        jobImportId = jobImport.id;
      } else {
        // Use existing import
        jobImportId = selectedImportId;
      }

      // Parse file
      const response = await base44.functions.invoke('parseJobImportFile', {
        jobImportId,
        fileUrl,
        fileName: file.name,
      });

      if (response.data.status === 'failed') {
        setParseErrors(response.data.errors || []);
        // Delete draft import on parse failure (only if new)
        if (mode === 'new') {
          await base44.entities.JobImport.delete(jobImportId);
        }
        throw new Error('Parse failed');
      }

      return { jobImportId, parsedData: response.data };
    },
    onSuccess: (result) => {
      setParsedData({ ...result.parsedData, job_import_id: result.jobImportId });
      setParseErrors([]);
      setStep('preview');
    },
    onError: (error) => {
      setParseErrors([{ row: 0, error: error.message }]);
    },
  });

  // Create or replace import
  const createMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'replace') {
        // Call replace function
        const response = await base44.functions.invoke('replaceJobImport', {
          jobImportId: parsedData.job_import_id,
          parsedData: { ...parsedData, filename: file.name },
        });
        return response.data;
      } else {
        // Original create logic
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobImports'] });
      // Reset
      setStep('input');
      setMode('new');
      setImportName('');
      setSelectedImportId('');
      setFile(null);
      setParsedData(null);
      setParseErrors([]);
      setExpandedJob(null);
      setReplaceConfirm(false);
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

  const canParse = (mode === 'new' ? importName.trim() : selectedImportId) && file;
  const hasErrors = parseErrors.length > 0;
  const selectedImport = existingImports.find(imp => imp.id === selectedImportId);

  return (
    <>
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
                <label className="text-sm font-medium">Mode *</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="new"
                      checked={mode === 'new'}
                      onChange={(e) => {
                        setMode(e.target.value);
                        setSelectedImportId('');
                        setImportName('');
                      }}
                    />
                    <span className="text-sm">Create New Import</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="replace"
                      checked={mode === 'replace'}
                      onChange={(e) => {
                        setMode(e.target.value);
                        setImportName('');
                      }}
                    />
                    <span className="text-sm">Replace Existing</span>
                  </label>
                </div>
              </div>

              {mode === 'new' && (
                <div>
                  <label className="text-sm font-medium">Import Name *</label>
                  <Input
                    placeholder="e.g., February Bulk Upload"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              {mode === 'replace' && (
                <div>
                  <label className="text-sm font-medium">Select Import to Replace *</label>
                  <Select value={selectedImportId} onValueChange={setSelectedImportId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose import batch..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingImports.map(imp => (
                        <SelectItem key={imp.id} value={imp.id}>
                          {imp.name} ({imp.jobs_created_count} jobs)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedImport && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ All {selectedImport.jobs_created_count} existing jobs will be deleted and replaced.
                    </p>
                  )}
                </div>
              )}

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
              onClick={() => mode === 'replace' ? setReplaceConfirm(true) : createMutation.mutate()}
              disabled={hasErrors || createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'replace' ? 'Replace & Create' : 'Confirm & Create'}
            </Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* Replace Confirmation Dialog */}
      <AlertDialog open={replaceConfirm} onOpenChange={setReplaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all {selectedImport?.jobs_created_count || 0} existing jobs from "{selectedImport?.name}" and create new ones. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              createMutation.mutate();
              setReplaceConfirm(false);
            }}
            className="bg-destructive hover:bg-destructive/90"
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete & Replace
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}