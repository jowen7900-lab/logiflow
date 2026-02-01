import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateData = [
      ['install', '123 Warehouse St', 'M1 1AA', 'John Smith', '07700900001', '2026-02-10', 'am', '', '456 Client Ave', 'M2 2BB', 'Jane Doe', '07700900002', '2026-02-10', 'pm', '', 'Office desk x2', '2', '50', 'Use service elevator', ''],
      ['rubbish_collection', '789 Factory Rd', 'M3 3CC', 'Bob Jones', '07700900003', '2026-02-11', 'am', '09:00', '321 Shop St', 'M4 4DD', 'Alice Brown', '07700900004', '2026-02-11', 'pm', '', 'Old furniture', '1', '80', 'Collection from rear entrance', 'yes'],
      ['remedial', '', '', '', '', '', '', '', '654 Office Park', 'M5 5EE', 'Charlie Davis', '07700900005', '2026-02-12', 'all_day', '', 'Repair equipment', '1', '20', 'Contact on arrival', 'yes'],
    ];

    const headers = ['job_type', 'collection_address', 'collection_postcode', 'collection_contact', 'collection_phone', 'collection_date', 'collection_time_slot', 'collection_time', 'delivery_address', 'delivery_postcode', 'delivery_contact', 'delivery_phone', 'delivery_date', 'delivery_time_slot', 'delivery_time', 'items_description', 'items_quantity', 'items_weight_kg', 'special_instructions', 'fitter_required'];
    
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