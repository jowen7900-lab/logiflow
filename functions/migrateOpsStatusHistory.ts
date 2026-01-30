import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const LEGACY_TO_CANONICAL = {
  en_route_collection: 'on_route_to_collection',
  in_transit: 'on_route_to_delivery',
  en_route_delivery: 'on_route_to_delivery',
  arrived: 'collected',
  delivering: 'on_route_to_delivery',
  completed: 'delivered',
  cancelled: 'failed',
};

const CANONICAL_VALUES = new Set([
  'allocated',
  'on_route_to_collection',
  'collected',
  'on_route_to_delivery',
  'delivered',
  'failed',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run migrations
    if (user?.app_role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let scanned = 0;
    let updated = 0;
    const legacyUpdateCounts = {};

    // Initialize legacy counters
    Object.keys(LEGACY_TO_CANONICAL).forEach(legacy => {
      legacyUpdateCounts[legacy] = 0;
    });

    // Fetch all JobStatusHistory records (paginate in batches of 500)
    let allRecords = [];
    let skip = 0;
    const batchSize = 500;
    let hasMore = true;

    while (hasMore) {
      const batch = await base44.asServiceRole.entities.JobStatusHistory.list('-created_date', batchSize, skip);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        allRecords = allRecords.concat(batch);
        skip += batch.length;
      }
    }

    scanned = allRecords.length;

    // Process each record
    for (const record of allRecords) {
      const legacyValue = record.new_ops_status;

      if (LEGACY_TO_CANONICAL[legacyValue]) {
        const canonicalValue = LEGACY_TO_CANONICAL[legacyValue];

        // Update the record
        await base44.asServiceRole.entities.JobStatusHistory.update(record.id, {
          new_ops_status: canonicalValue,
        });

        updated++;
        legacyUpdateCounts[legacyValue]++;
      }
    }

    // Build summary
    const summaryLines = [
      `✅ JobStatusHistory migration completed`,
      `📊 Total records scanned: ${scanned}`,
      `✏️  Total records updated: ${updated}`,
    ];

    Object.entries(legacyUpdateCounts).forEach(([legacy, count]) => {
      if (count > 0) {
        summaryLines.push(`   - ${legacy} → ${LEGACY_TO_CANONICAL[legacy]}: ${count} record(s)`);
      }
    });

    const summary = summaryLines.join('\n');
    console.log(summary);

    return Response.json({
      success: true,
      summary,
      stats: {
        scanned,
        updated,
        legacyUpdateCounts,
      },
    });
  } catch (error) {
    console.error('Migration failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});