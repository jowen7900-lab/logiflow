import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateData = [
      ['John Smith', '123 Main Street', 'M1 1AA', '2026-02-01T09:00:00Z', 'Office Supplies', 'LWB', 'REF-001'],
      ['Sarah Johnson', '456 Oak Avenue', 'M2 2BB', '2026-02-01T10:30:00Z', 'Furniture Set', 'LWB', 'REF-002'],
      ['Mike Brown', '789 Pine Road', 'M3 3CC', '2026-02-01T13:00:00Z', 'Electrical Equipment', 'SWB', 'REF-003'],
      ['Emma Davis', '321 Elm Street', 'M4 4DD', '2026-02-01T14:30:00Z', 'Tools & Hardware', 'LWB', 'REF-004'],
      ['David Wilson', '654 Birch Lane', 'M5 5EE', '2026-02-01T15:45:00Z', 'Kitchen Appliances', 'SWB', 'REF-005'],
      ['Lisa Martinez', '987 Maple Drive', 'M6 6FF', '2026-02-02T09:00:00Z', 'Textiles & Fabrics', 'LWB', 'REF-006'],
      ['Robert Taylor', '147 Cedar Street', 'M7 7GG', '2026-02-02T10:15:00Z', 'Books & Media', 'SWB', 'REF-007'],
      ['Jennifer Lee', '258 Walnut Avenue', 'M8 8HH', '2026-02-02T12:00:00Z', 'Industrial Parts', 'LWB', 'REF-008'],
      ['Mark Anderson', '369 Ash Road', 'M9 9II', '2026-02-02T14:30:00Z', 'Packaging Materials', 'SWB', 'REF-009'],
      ['Patricia White', '741 Spruce Lane', 'M10 10JJ', '2026-02-02T16:00:00Z', 'Miscellaneous Goods', 'LWB', 'REF-010'],
      ['Chris Evans', '852 Poplar Street', 'M11 11KK', '2026-02-03T08:30:00Z', 'Office Equipment', 'SWB', 'REF-011'],
      ['Diana Chen', '963 Willow Road', 'M12 12LL', '2026-02-03T11:00:00Z', 'Building Materials', 'LWB', 'REF-012'],
      ['Eric Johnson', '147 Oak Lane', 'M13 13MM', '2026-02-03T13:15:00Z', 'Electronics', 'LWB', 'REF-013'],
      ['Fiona Walsh', '258 Pine Street', 'M14 14NN', '2026-02-03T15:30:00Z', 'Clothing & Textiles', 'SWB', 'REF-014'],
      ['George Miller', '369 Elm Avenue', 'M15 15OO', '2026-02-04T09:45:00Z', 'Food & Beverage', 'LWB', 'REF-015'],
    ];

    const headers = ['delivery_recipient_name', 'delivery_address1', 'delivery_postcode', 'delivery_date_time', 'goods_description', 'vehicle_type', 'reference1'];
    
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