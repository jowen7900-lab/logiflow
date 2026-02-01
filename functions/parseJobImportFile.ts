import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobImportId, fileUrl, fileName } = body;

    if (!jobImportId || !fileUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the file content
    const fileResponse = await fetch(fileUrl);
    const fileContent = await fileResponse.text();

    // Parse CSV
    const lines = fileContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return Response.json({
        status: 'failed',
        errors: [{ row: 0, error: 'File is empty or has no data rows' }]
      });
    }

    // Header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const requiredFields = ['job_key', 'job_type', 'delivery_address', 'delivery_postcode', 'delivery_date', 'delivery_time_slot', 'requires_fitter'];
    const missingFields = requiredFields.filter(f => !headers.includes(f));
    
    if (missingFields.length > 0) {
      return Response.json({
        status: 'failed',
        errors: [{ row: 0, error: `Missing required columns: ${missingFields.join(', ')}. Please use the latest template.` }]
      });
    }

    const errors = [];
    const jobRows = [];
    const jobGroups = {};
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => {
          let val = v.trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          return val;
        });
        const row = {};

        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        const jobKey = row['job_key'] || '';
        if (!jobKey) {
          errors.push({ row: i + 1, column: 'job_key', error: 'Required field missing' });
          continue;
        }

        // Validate required fields per row
        if (!row['job_type']) {
          errors.push({ row: i + 1, column: 'job_type', error: 'Required field missing' });
        }
        if (!row['delivery_address']) {
          errors.push({ row: i + 1, column: 'delivery_address', error: 'Required field missing' });
        }
        if (!row['delivery_postcode']) {
          errors.push({ row: i + 1, column: 'delivery_postcode', error: 'Required field missing' });
        }
        if (!row['delivery_date']) {
          errors.push({ row: i + 1, column: 'delivery_date', error: 'Required field missing' });
        }
        if (!row['delivery_time_slot']) {
          errors.push({ row: i + 1, column: 'delivery_time_slot', error: 'Required field missing' });
        }
        if (!row['requires_fitter']) {
          errors.push({ row: i + 1, column: 'requires_fitter', error: 'Required field missing' });
        }

        // Group by job_key for consistency validation
        if (!jobGroups[jobKey]) {
          jobGroups[jobKey] = { rows: [], firstRow: i + 1 };
        }
        jobGroups[jobKey].rows.push({ rowNum: i + 1, data: row });

      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
      }
    }

    // Validate job-level field consistency across rows with same job_key
    const jobLevelFields = ['job_type', 'collection_address', 'collection_postcode', 'collection_contact', 
      'collection_phone', 'collection_date', 'collection_time_slot', 'collection_time',
      'delivery_address', 'delivery_postcode', 'delivery_contact', 'delivery_phone',
      'delivery_date', 'delivery_time_slot', 'delivery_time', 'special_instructions',
      'requires_fitter', 'fitter_id', 'fitter_name'];

    for (const [jobKey, group] of Object.entries(jobGroups)) {
      if (group.rows.length > 1) {
        const firstRowData = group.rows[0].data;
        for (let j = 1; j < group.rows.length; j++) {
          const currentRowData = group.rows[j].data;
          for (const field of jobLevelFields) {
            if (firstRowData[field] !== currentRowData[field]) {
              errors.push({
                row: group.rows[j].rowNum,
                column: field,
                error: `Mismatch with row ${group.rows[0].rowNum} for job_key ${jobKey}. Job-level fields must be identical across all items.`
              });
            }
          }
        }
      }
    }

    // Return early if errors found
    if (errors.length > 0) {
      return Response.json({ status: 'failed', errors });
    }

    // Transform to grouped jobs with items
    const groupedJobs = {};
    for (const [jobKey, group] of Object.entries(jobGroups)) {
      const firstRow = group.rows[0].data;
      const items = group.rows.map(({ data: row }) => ({
        description: row['item_description'] || '',
        quantity: parseFloat(row['item_quantity']) || 1,
        weight_kg: parseFloat(row['item_weight_kg']) || 0,
        dimensions: row['item_dimensions'] || '',
      }));

      const requiresFitter = (firstRow['requires_fitter'] || '').toLowerCase();
      const requiresFitterBool = requiresFitter === 'yes' || requiresFitter === 'true' || requiresFitter === '1';

      groupedJobs[jobKey] = {
        job_key: jobKey,
        job_type: firstRow['job_type'] || '',
        collection_address: firstRow['collection_address'] || '',
        collection_postcode: firstRow['collection_postcode'] || '',
        collection_contact: firstRow['collection_contact'] || '',
        collection_phone: firstRow['collection_phone'] || '',
        collection_date: firstRow['collection_date'] || null,
        collection_time_slot: firstRow['collection_time_slot'] || '',
        collection_time: firstRow['collection_time'] || '',
        delivery_address: firstRow['delivery_address'] || '',
        delivery_postcode: firstRow['delivery_postcode'] || '',
        delivery_contact: firstRow['delivery_contact'] || '',
        delivery_phone: firstRow['delivery_phone'] || '',
        delivery_date: firstRow['delivery_date'] || '',
        delivery_time_slot: firstRow['delivery_time_slot'] || '',
        delivery_time: firstRow['delivery_time'] || '',
        special_instructions: firstRow['special_instructions'] || '',
        requires_fitter: requiresFitterBool,
        fitter_id: firstRow['fitter_id'] || '',
        fitter_name: firstRow['fitter_name'] || '',
        items,
      };
    }

    return Response.json({
      status: 'success',
      job_import_id: jobImportId,
      jobs_count: Object.keys(groupedJobs).length,
      grouped_jobs: groupedJobs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});