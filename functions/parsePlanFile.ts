import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

function normalizePostcode(pc) {
  return (pc || '').toUpperCase().replace(/\s/g, '');
}

function normalizeName(name) {
  return (name || '').toLowerCase().trim().replace(/[^\w\s]/g, '');
}

function normalizeDateTime(dt) {
  if (!dt) return '';
  try {
    return new Date(dt).toISOString();
  } catch {
    return dt;
  }
}

function generateJobKey(row) {
  if (row['Job Key']) return row['Job Key'];
  
  const parts = [
    normalizeName(row['Delivery Recipient Name']),
    normalizePostcode(row['Delivery Postcode']),
    normalizeDateTime(row['Delivery DateTime']),
    row['Reference 1'] || ''
  ];
  
  return parts.filter(Boolean).join('|');
}

function computeLineHash(row) {
  const normalized = [
    normalizeName(row['Collection Name']),
    row['Collection Address1'],
    normalizePostcode(row['Collection Postcode']),
    normalizeDateTime(row['Collection DateTime']),
    normalizeName(row['Delivery Recipient Name']),
    row['Delivery Address1'],
    normalizePostcode(row['Delivery Postcode']),
    normalizeDateTime(row['Delivery DateTime']),
    row['Vehicle Type'],
    row['Goods Description']
  ].join('||');
  
  return Array.from(normalized).reduce((acc, c) => {
    return ((acc << 5) - acc) + c.charCodeAt(0);
  }, 0).toString(36);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileContent, fileName, planVersionId } = await req.json();

    if (!fileContent || !planVersionId) {
      return Response.json({ error: 'Missing fileContent or planVersionId' }, { status: 400 });
    }

    // Get plan version
    const versions = await base44.entities.PlanVersion.filter({ id: planVersionId });
    const version = versions[0];
    if (!version) {
      return Response.json({ error: 'Plan version not found' }, { status: 404 });
    }

    // Parse file
    let parsed;
    try {
      parsed = parseCSV(fileContent);
    } catch (err) {
      await base44.entities.PlanVersion.update(planVersionId, {
        parse_status: 'failed',
        parse_errors: JSON.stringify({ error: err.message })
      });
      return Response.json({ 
        status: 'failed', 
        error: err.message 
      });
    }

    if (parsed.rows.length === 0) {
      await base44.entities.PlanVersion.update(planVersionId, {
        parse_status: 'failed',
        parse_errors: JSON.stringify({ error: 'No data rows found' })
      });
      return Response.json({ 
        status: 'failed', 
        error: 'No data rows found' 
      });
    }

    // Create plan lines
    const planLines = [];
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      
      try {
        const jobKey = generateJobKey(row);
        const lineHash = computeLineHash(row);

        const line = {
          plan_version_id: planVersionId,
          external_row_id: String(i + 2), // +2 for header and 1-index
          job_key: jobKey,
          collection_name: row['Collection Name'] || '',
          collection_address1: row['Collection Address1'] || '',
          collection_postcode: row['Collection Postcode'] || '',
          collection_date_time: row['Collection DateTime'] || '',
          delivery_recipient_name: row['Delivery Recipient Name'] || '',
          delivery_address1: row['Delivery Address1'] || '',
          delivery_postcode: row['Delivery Postcode'] || '',
          delivery_date_time: row['Delivery DateTime'] || '',
          vehicle_type: row['Vehicle Type'] || '',
          goods_description: row['Goods Description'] || '',
          notes: row['Notes'] || '',
          reference1: row['Reference 1'] || '',
          reference2: row['Reference 2'] || '',
          line_hash: lineHash
        };

        planLines.push(line);
      } catch (err) {
        console.error(`Error parsing row ${i + 2}:`, err);
      }
    }

    // Bulk create plan lines
    if (planLines.length > 0) {
      await base44.entities.PlanLine.bulkCreate(planLines);
    }

    // Update plan version
    await base44.entities.PlanVersion.update(planVersionId, {
      parse_status: 'parsed',
      rows_count: planLines.length
    });

    return Response.json({
      status: 'success',
      rowsCount: planLines.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});