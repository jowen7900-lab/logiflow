import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateData = [
      ['JOB001', 'install', '123 Warehouse St', 'M1 1AA', 'John Smith', '07700900001', '2026-02-10', 'am', '', '456 Client Ave', 'M2 2BB', 'Jane Doe', '07700900002', '2026-02-10', 'pm', '', 'Office desk', '1', '25', '', 'Use service elevator', 'yes', 'FIT001', 'John Fitter'],
      ['JOB001', 'install', '123 Warehouse St', 'M1 1AA', 'John Smith', '07700900001', '2026-02-10', 'am', '', '456 Client Ave', 'M2 2BB', 'Jane Doe', '07700900002', '2026-02-10', 'pm', '', 'Office chair', '2', '15', 'Standard', 'Use service elevator', 'yes', 'FIT001', 'John Fitter'],
      ['JOB002', 'rubbish_collection', '789 Factory Rd', 'M3 3CC', 'Bob Jones', '07700900003', '2026-02-11', 'am', '09:00', '321 Shop St', 'M4 4DD', 'Alice Brown', '07700900004', '2026-02-11', 'pm', '', 'Old furniture', '1', '80', '2m x 1m', 'Collection from rear', 'no', '', ''],
      ['JOB003', 'remedial', '', '', '', '', '', '', '', '654 Office Park', 'M5 5EE', 'Charlie Davis', '07700900005', '2026-02-12', 'all_day', '', 'Repair equipment', '1', '20', '', 'Contact on arrival', 'yes', 'FIT002', 'Sarah Fitter'],
    ];

    const headers = ['job_key', 'job_type', 'collection_address', 'collection_postcode', 'collection_contact', 'collection_phone', 'collection_date', 'collection_time_slot', 'collection_time', 'delivery_address', 'delivery_postcode', 'delivery_contact', 'delivery_phone', 'delivery_date', 'delivery_time_slot', 'delivery_time', 'item_description', 'item_quantity', 'item_weight_kg', 'item_dimensions', 'special_instructions', 'requires_fitter', 'fitter_id', 'fitter_name'];
    
    const csv = [
      headers.join(','),
      ...templateData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="plan_import_template.csv"'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});