import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, planVersionId } = body;

    if (!planId || !planVersionId) {
      return Response.json({ error: 'Missing planId or planVersionId' }, { status: 400 });
    }

    // Verify user owns this plan (use .get() instead of .read())
    const plan = await base44.asServiceRole.entities.Plan.get(planId);
    if (!plan || plan.customer_id !== user.customer_id) {
      return Response.json({ error: 'Plan not found or access denied' }, { status: 403 });
    }

    // Get customer details
    const customer = await base44.asServiceRole.entities.Customer.get(plan.customer_id);

    // Fetch all PlanLines for this version
    const planLines = await base44.asServiceRole.entities.PlanLine.filter({ 
      plan_version_id: planVersionId 
    });

    // Group by job_key
    const groupedLines = planLines.reduce((acc, line) => {
      if (!acc[line.job_key]) {
        acc[line.job_key] = [];
      }
      acc[line.job_key].push(line);
      return acc;
    }, {});

    let jobsCreatedCount = 0;
    let jobsSkippedCount = 0;

    // Create jobs for each job_key group
    for (const [jobKey, lines] of Object.entries(groupedLines)) {
      // Check for existing job (idempotency with version awareness)
      const existingJobs = await base44.asServiceRole.entities.Job.filter({ 
        plan_id: planId,
        plan_version_id: planVersionId,
        job_key: jobKey
      });

      if (existingJobs.length > 0) {
        jobsSkippedCount++;
        continue;
      }

      // Create job using planLineToJob conversion
      const jobData = planLineToJob(lines, plan.customer_id, customer?.name || '', planId, planVersionId, jobKey);
      await base44.asServiceRole.entities.Job.create(jobData);
      jobsCreatedCount++;
    }

    // Update plan status to published (use service role)
    await base44.asServiceRole.entities.Plan.update(planId, { 
      status: 'published'
    });

    return Response.json({
      status: 'success',
      jobs_created_count: jobsCreatedCount,
      jobs_skipped_count: jobsSkippedCount,
      plan_status: 'published',
    }, { status: 200 });
  } catch (error) {
    console.error('publishPlan failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});

function planLineToJob(planLines, customerId, customerName, planId, planVersionId, jobKey) {
  // Group items from multiple rows with same job_key
  const items = planLines.map(line => ({
    description: line.item_description || '',
    quantity: line.item_quantity || 1,
    weight_kg: line.item_weight_kg || 0,
    dimensions: line.item_dimensions || '',
  })).filter(item => item.description);

  // Use first row for job-level fields
  const firstLine = planLines[0];
  const jobNumber = `PLAN-${planId.slice(0, 8)}-${jobKey}`.slice(0, 50);
  
  return {
    job_number: jobNumber,
    customer_id: customerId,
    customer_name: customerName,
    job_type: firstLine.job_type || 'install',
    customer_status: 'confirmed',
    collection_address: firstLine.collection_address || '',
    collection_postcode: firstLine.collection_postcode || '',
    collection_contact: firstLine.collection_contact || '',
    collection_phone: firstLine.collection_phone || '',
    collection_date: firstLine.collection_date || null,
    collection_time_slot: firstLine.collection_time_slot || '',
    collection_time: firstLine.collection_time || '',
    delivery_address: firstLine.delivery_address || '',
    delivery_postcode: firstLine.delivery_postcode || '',
    delivery_contact: firstLine.delivery_contact || '',
    delivery_phone: firstLine.delivery_phone || '',
    delivery_date: firstLine.delivery_date || null,
    delivery_time_slot: firstLine.delivery_time_slot || '',
    delivery_time: firstLine.delivery_time || '',
    scheduled_date: firstLine.delivery_date || null,
    scheduled_time_slot: firstLine.delivery_time_slot || '',
    scheduled_time: firstLine.delivery_time || '',
    special_instructions: firstLine.special_instructions || '',
    requires_fitter: firstLine.requires_fitter || false,
    fitter_id: firstLine.fitter_id || null,
    fitter_name: firstLine.fitter_name || null,
    items: items.length > 0 ? items : [{ description: '', quantity: 1, weight_kg: 0, dimensions: '' }],
    plan_id: planId,
    plan_version_id: planVersionId,
    job_key: jobKey,
  };
}