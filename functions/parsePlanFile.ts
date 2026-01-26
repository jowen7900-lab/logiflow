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
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredFields = ['delivery_recipient_name', 'delivery_address1', 'delivery_postcode', 'delivery_date_time'];
    const missingFields = requiredFields.filter(f => !headers.includes(f.toLowerCase()));
    
    if (missingFields.length > 0) {
      return Response.json({
        status: 'failed',
        errors: [{ row: 0, error: `Missing required columns: ${missingFields.join(', ')}` }]
      });
    }

    const errors = [];
    const planLines = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};

        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        // Generate or use provided job_key
        let jobKey = row['job_key'] || '';
        if (!jobKey) {
          const normalizedName = (row['delivery_recipient_name'] || '').toLowerCase().replace(/[^\w]/g, '');
          const normalizedPostcode = (row['delivery_postcode'] || '').toUpperCase().replace(/\s/g, '');
          const normalizedDate = row['delivery_date_time'] || '';
          const normalizedRef = row['reference1'] || '';
          jobKey = `${normalizedName}-${normalizedPostcode}-${normalizedDate}-${normalizedRef}`.replace(/^-+|-+$/g, '');
        }

        // Compute line hash
        const hashInput = JSON.stringify({
          recipient: (row['delivery_recipient_name'] || '').toLowerCase().trim(),
          address: (row['delivery_address1'] || '').toLowerCase().trim(),
          postcode: (row['delivery_postcode'] || '').toUpperCase().replace(/\s/g, ''),
          datetime: row['delivery_date_time'] || '',
          vehicle: (row['vehicle_type'] || '').toLowerCase().trim(),
          goods: (row['goods_description'] || '').toLowerCase().trim(),
        });
        const lineHash = await hashString(hashInput);

        planLines.push({
          plan_version_id: planVersionId,
          external_row_id: String(i),
          job_key: jobKey,
          collection_name: row['collection_name'] || null,
          collection_address1: row['collection_address1'] || '',
          collection_postcode: row['collection_postcode'] || '',
          collection_date_time: row['collection_date_time'] || null,
          delivery_recipient_name: row['delivery_recipient_name'] || '',
          delivery_address1: row['delivery_address1'] || '',
          delivery_postcode: row['delivery_postcode'] || '',
          delivery_date_time: row['delivery_date_time'] || '',
          vehicle_type: row['vehicle_type'] || '',
          goods_description: row['goods_description'] || '',
          notes: row['notes'] || '',
          reference1: row['reference1'] || '',
          reference2: row['reference2'] || '',
          line_hash: lineHash,
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error.message });
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