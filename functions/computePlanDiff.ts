import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, fromVersionId, toVersionId } = await req.json();

    if (!planId || !toVersionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current lines
    const toLines = await base44.entities.PlanLine.filter({ plan_version_id: toVersionId });
    const toMap = new Map(toLines.map(l => [l.job_key, l]));

    // Get previous lines if fromVersionId provided
    let fromMap = new Map();
    if (fromVersionId) {
      const fromLines = await base44.entities.PlanLine.filter({ plan_version_id: fromVersionId });
      fromMap = new Map(fromLines.map(l => [l.job_key, l]));
    }

    // Compute diff
    const added = [];
    const changed = [];
    const cancelled = [];

    // Find additions and changes
    for (const [jobKey, toLine] of toMap) {
      if (!fromMap.has(jobKey)) {
        added.push(jobKey);
      } else {
        const fromLine = fromMap.get(jobKey);
        if (fromLine.line_hash !== toLine.line_hash) {
          changed.push(jobKey);
        }
      }
    }

    // Find cancellations
    for (const [jobKey] of fromMap) {
      if (!toMap.has(jobKey)) {
        cancelled.push(jobKey);
      }
    }

    // Create diff
    const diff = await base44.entities.PlanDiff.create({
      plan_id: planId,
      from_version_id: fromVersionId,
      to_version_id: toVersionId,
      summary: JSON.stringify({
        addedCount: added.length,
        changedCount: changed.length,
        cancelledCount: cancelled.length
      }),
      status: 'needs_customer_review'
    });

    // Create diff items
    const diffItems = [];

    for (const jobKey of added) {
      const line = toMap.get(jobKey);
      diffItems.push({
        plan_diff_id: diff.id,
        job_key: jobKey,
        diff_type: 'added',
        after_snapshot: JSON.stringify(line),
        change_summary: `New delivery to ${line.delivery_recipient_name} at ${line.delivery_postcode}`,
        impact_level: 'MEDIUM'
      });
    }

    for (const jobKey of changed) {
      const fromLine = fromMap.get(jobKey);
      const toLine = toMap.get(jobKey);
      
      const changes = [];
      if (fromLine.delivery_recipient_name !== toLine.delivery_recipient_name) {
        changes.push(`Recipient: ${fromLine.delivery_recipient_name} → ${toLine.delivery_recipient_name}`);
      }
      if (fromLine.delivery_address1 !== toLine.delivery_address1) {
        changes.push(`Address: changed`);
      }
      if (fromLine.delivery_date_time !== toLine.delivery_date_time) {
        changes.push(`Date/Time: ${fromLine.delivery_date_time} → ${toLine.delivery_date_time}`);
      }
      
      diffItems.push({
        plan_diff_id: diff.id,
        job_key: jobKey,
        diff_type: 'changed',
        before_snapshot: JSON.stringify(fromLine),
        after_snapshot: JSON.stringify(toLine),
        change_summary: changes.join('; '),
        impact_level: changes.some(c => c.includes('Recipient') || c.includes('Date')) ? 'HIGH' : 'MEDIUM'
      });
    }

    for (const jobKey of cancelled) {
      const fromLine = fromMap.get(jobKey);
      diffItems.push({
        plan_diff_id: diff.id,
        job_key: jobKey,
        diff_type: 'cancelled',
        before_snapshot: JSON.stringify(fromLine),
        change_summary: `Job cancelled: ${fromLine.delivery_recipient_name}`,
        impact_level: 'HIGH'
      });
    }

    if (diffItems.length > 0) {
      await base44.entities.PlanDiffItem.bulkCreate(diffItems);
    }

    return Response.json({
      diffId: diff.id,
      summary: {
        addedCount: added.length,
        changedCount: changed.length,
        cancelledCount: cancelled.length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});