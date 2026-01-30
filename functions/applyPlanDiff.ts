import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planDiffId } = body;

    if (!planDiffId) {
      return Response.json({ error: 'Missing planDiffId' }, { status: 400 });
    }

    const planDiff = await base44.entities.PlanDiff.read(planDiffId);
    if (!planDiff || planDiff.status !== 'customer_approved') {
      return Response.json({ error: 'Diff not approved' }, { status: 400 });
    }

    const diffItems = await base44.asServiceRole.entities.PlanDiffItem.filter({ plan_diff_id: planDiffId });
    const plan = await base44.entities.Plan.read(planDiff.plan_id);
    const toVersion = await base44.entities.PlanVersion.read(planDiff.to_version_id);

    let appliedCount = 0;

    for (const item of diffItems) {
      const beforeData = item.before_snapshot ? JSON.parse(item.before_snapshot) : null;
      const afterData = item.after_snapshot ? JSON.parse(item.after_snapshot) : null;

      if (item.diff_type === 'added') {
        // Create new job
        const jobData = planLineToJob(afterData, plan.customer_id, planDiff.plan_id, toVersion.id, item.job_key);
        await base44.asServiceRole.entities.Job.create(jobData);
        appliedCount++;
      } else if (item.diff_type === 'changed') {
        // Find and update existing job by jobKey
        const existingJobs = await base44.asServiceRole.entities.Job.filter({ job_key: item.job_key });
        if (existingJobs.length > 0) {
          const jobData = planLineToJob(afterData, plan.customer_id, planDiff.plan_id, toVersion.id, item.job_key);
          await base44.asServiceRole.entities.Job.update(existingJobs[0].id, jobData);
          
          // Create OpsTask for change
          await base44.asServiceRole.entities.OpsTask.create({
            task_number: `PLAN-${planDiff.plan_id}-${Date.now()}`,
            job_id: existingJobs[0].id,
            job_number: existingJobs[0].job_number,
            task_type: 'customer_change',
            status: 'resolved',
            priority: 'medium',
            title: 'Plan upload update',
            description: item.change_summary,
            resolution_notes: 'Applied via plan upload',
            resolved_at: new Date().toISOString(),
            customer_id: plan.customer_id,
          });
          appliedCount++;
        }
      } else if (item.diff_type === 'cancelled') {
        // Find and cancel existing job
        const existingJobs = await base44.asServiceRole.entities.Job.filter({ job_key: item.job_key });
        if (existingJobs.length > 0) {
          await base44.asServiceRole.entities.Job.update(existingJobs[0].id, {
            ops_status: 'failed',
            customer_status: 'cancelled',
          });
          appliedCount++;
        }
      }
    }

    // Update diff status
    await base44.entities.PlanDiff.update(planDiffId, { status: 'applied' });
    
    // Update plan status if this is the latest version
    await base44.entities.Plan.update(planDiff.plan_id, { status: 'applied' });

    return Response.json({
      status: 'success',
      appliedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function planLineToJob(lineData, customerId, planId, planVersionId, jobKey) {
  const jobNumber = `PLAN-${planId}-${jobKey}`.slice(0, 50);
  
  return {
    job_number: jobNumber,
    customer_id: customerId,
    customer_name: '',
    job_type: 'delivery',
    customer_status: 'requested',
    ops_status: 'allocated',
    collection_address: lineData.collectionAddress || '',
    collection_postcode: lineData.collectionPostcode || '',
    collection_name: lineData.collectionName || '',
    delivery_address: lineData.address || '',
    delivery_postcode: lineData.postcode || '',
    delivery_contact: lineData.recipientName || '',
    scheduled_date: lineData.dateTime ? lineData.dateTime.split('T')[0] : null,
    scheduled_time_slot: 'all_day',
    vehicle_reg: lineData.vehicleType || '',
    items: [{
      description: lineData.goodsDescription || '',
      quantity: 1,
    }],
    special_instructions: lineData.notes || '',
    customer_reference: lineData.reference1 || '',
    plan_id: planId,
    plan_version_id: planVersionId,
    job_key: lineData.jobKey,
  };
}