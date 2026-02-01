import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planVersionId, fileUrl, fileName } = body;

    if (!planVersionId || !fileUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the file content
    const fileResponse = await fetch(fileUrl);
    const fileContent = await fileResponse.text();

    // Parse CSV (simple parser - supports both CSV and basic XLSX export as CSV)
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
    const planLines = [];

    // Group rows by job_key for validation
    const jobGroups = {};
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
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

    // Now create PlanLines
    for (const [jobKey, group] of Object.entries(jobGroups)) {
      for (const { rowNum, data: row } of group.rows) {
        const hashInput = JSON.stringify({
          job_key: jobKey,
          job_type: (row['job_type'] || '').toLowerCase().trim(),
          collection_address: (row['collection_address'] || '').toLowerCase().trim(),
          collection_postcode: (row['collection_postcode'] || '').toUpperCase().replace(/\s/g, ''),
          collection_date: row['collection_date'] || '',
          collection_time_slot: (row['collection_time_slot'] || '').toLowerCase().trim(),
          delivery_address: (row['delivery_address'] || '').toLowerCase().trim(),
          delivery_postcode: (row['delivery_postcode'] || '').toUpperCase().replace(/\s/g, ''),
          delivery_contact: (row['delivery_contact'] || '').toLowerCase().trim(),
          delivery_date: row['delivery_date'] || '',
          delivery_time_slot: (row['delivery_time_slot'] || '').toLowerCase().trim(),
          item_description: (row['item_description'] || '').toLowerCase().trim(),
          special_instructions: (row['special_instructions'] || '').toLowerCase().trim(),
        });
        const lineHash = await hashString(hashInput);

        const requiresFitter = (row['requires_fitter'] || '').toLowerCase();
        const requiresFitterBool = requiresFitter === 'yes' || requiresFitter === 'true' || requiresFitter === '1';

        planLines.push({
          plan_version_id: planVersionId,
          external_row_id: String(rowNum),
          job_key: jobKey,
          job_type: row['job_type'] || '',
          collection_address: row['collection_address'] || '',
          collection_postcode: row['collection_postcode'] || '',
          collection_contact: row['collection_contact'] || '',
          collection_phone: row['collection_phone'] || '',
          collection_date: row['collection_date'] || null,
          collection_time_slot: row['collection_time_slot'] || '',
          collection_time: row['collection_time'] || '',
          delivery_address: row['delivery_address'] || '',
          delivery_postcode: row['delivery_postcode'] || '',
          delivery_contact: row['delivery_contact'] || '',
          delivery_phone: row['delivery_phone'] || '',
          delivery_date: row['delivery_date'] || '',
          delivery_time_slot: row['delivery_time_slot'] || '',
          delivery_time: row['delivery_time'] || '',
          item_description: row['item_description'] || '',
          item_quantity: parseFloat(row['item_quantity']) || 1,
          item_weight_kg: parseFloat(row['item_weight_kg']) || 0,
          item_dimensions: row['item_dimensions'] || '',
          special_instructions: row['special_instructions'] || '',
          requires_fitter: requiresFitterBool,
          fitter_id: row['fitter_id'] || '',
          fitter_name: row['fitter_name'] || '',
          line_hash: lineHash,
        });
      }
    }

    if (errors.length > 0) {
      await base44.entities.PlanVersion.update(planVersionId, {
        parse_status: 'failed',
        parse_errors: JSON.stringify(errors),
      });
      return Response.json({ status: 'failed', errors });
    }

    // Create plan lines
    await base44.asServiceRole.entities.PlanLine.bulkCreate(planLines);

    // Update version status
    await base44.entities.PlanVersion.update(planVersionId, {
      parse_status: 'parsed',
      rows_count: planLines.length,
    });

    return Response.json({
      status: 'success',
      rowsCount: planLines.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}