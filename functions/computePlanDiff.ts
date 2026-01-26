import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, fromVersionId, toVersionId } = body;

    if (!planId || !fromVersionId || !toVersionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch old and new lines
    const oldLines = await base44.asServiceRole.entities.PlanLine.filter({ plan_version_id: fromVersionId });
    const newLines = await base44.asServiceRole.entities.PlanLine.filter({ plan_version_id: toVersionId });

    const oldMap = new Map(oldLines.map(l => [l.job_key, l]));
    const newMap = new Map(newLines.map(l => [l.job_key, l]));

    const diffItems = [];
    let addedCount = 0;
    let changedCount = 0;
    let cancelledCount = 0;

    // Find additions and changes
    for (const [jobKey, newLine] of newMap.entries()) {
      if (!oldMap.has(jobKey)) {
        // Added
        diffItems.push({
          plan_diff_id: null, // Will set after diff creation
          job_key: jobKey,
          diff_type: 'added',
          before_snapshot: null,
          after_snapshot: JSON.stringify(serializeLineForDiff(newLine)),
          change_summary: `New job: ${newLine.delivery_recipient_name}, ${newLine.delivery_postcode}`,
          impact_level: 'MEDIUM',
        });
        addedCount++;
      } else {
        const oldLine = oldMap.get(jobKey);
        if (oldLine.line_hash !== newLine.line_hash) {
          // Changed
          const changedFields = detectChanges(oldLine, newLine);
          diffItems.push({
            plan_diff_id: null,
            job_key: jobKey,
            diff_type: 'changed',
            before_snapshot: JSON.stringify(serializeLineForDiff(oldLine)),
            after_snapshot: JSON.stringify(serializeLineForDiff(newLine)),
            change_summary: `Updated: ${changedFields.join(', ')}`,
            impact_level: assessImpact(changedFields),
          });
          changedCount++;
        }
      }
    }

    // Find cancellations
    for (const [jobKey, oldLine] of oldMap.entries()) {
      if (!newMap.has(jobKey)) {
        diffItems.push({
          plan_diff_id: null,
          job_key: jobKey,
          diff_type: 'cancelled',
          before_snapshot: JSON.stringify(serializeLineForDiff(oldLine)),
          after_snapshot: null,
          change_summary: `Cancelled: ${oldLine.delivery_recipient_name}, ${oldLine.delivery_postcode}`,
          impact_level: 'HIGH',
        });
        cancelledCount++;
      }
    }

    // Create PlanDiff
    const planDiff = await base44.entities.PlanDiff.create({
      plan_id: planId,
      from_version_id: fromVersionId,
      to_version_id: toVersionId,
      summary: JSON.stringify({ addedCount, changedCount, cancelledCount }),
      status: 'needs_customer_review',
    });

    // Create PlanDiffItems
    for (const item of diffItems) {
      item.plan_diff_id = planDiff.id;
    }
    await base44.asServiceRole.entities.PlanDiffItem.bulkCreate(diffItems);

    return Response.json({
      status: 'success',
      diffId: planDiff.id,
      summary: { addedCount, changedCount, cancelledCount },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function serializeLineForDiff(line) {
  return {
    jobKey: line.job_key,
    recipientName: line.delivery_recipient_name,
    address: line.delivery_address1,
    postcode: line.delivery_postcode,
    dateTime: line.delivery_date_time,
    vehicleType: line.vehicle_type,
    goodsDescription: line.goods_description,
    collectionName: line.collection_name,
    collectionAddress: line.collection_address1,
    collectionPostcode: line.collection_postcode,
    collectionDateTime: line.collection_date_time,
    reference1: line.reference1,
    reference2: line.reference2,
    notes: line.notes,
  };
}

function detectChanges(oldLine, newLine) {
  const changes = [];
  const fields = ['delivery_recipient_name', 'delivery_address1', 'delivery_postcode', 'delivery_date_time', 'vehicle_type', 'goods_description', 'collection_address1', 'collection_postcode', 'collection_date_time'];
  
  for (const field of fields) {
    if ((oldLine[field] || '') !== (newLine[field] || '')) {
      changes.push(field.replace(/_/g, ' '));
    }
  }
  
  return changes;
}

function assessImpact(changedFields) {
  const highImpactFields = ['delivery_date_time', 'delivery_address1', 'vehicle_type'];
  const hasHighImpact = changedFields.some(f => highImpactFields.some(hi => f.includes(hi)));
  
  if (hasHighImpact) return 'HIGH';
  if (changedFields.length > 2) return 'MEDIUM';
  return 'LOW';
}