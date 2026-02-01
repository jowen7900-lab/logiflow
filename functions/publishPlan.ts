export default async function publishPlan(req, ctx) {
  try {
    // 1. Parse input safely
    const { planId, planVersionId } = await req.json();

    if (!planId || !planVersionId) {
      return new Response(
        JSON.stringify({ error: 'planId and planVersionId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Auth
    const user = await ctx.auth.getUser();
    if (!user?.customer_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Load plan (SERVICE ROLE REQUIRED)
    const plan = await ctx.base44.asServiceRole.entities.Plan.get(planId);

    if (!plan || plan.customer_id !== user.customer_id) {
      return new Response(
        JSON.stringify({ error: 'Plan not found or access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3b. Load customer safely (fallback if not found)
    let customerName = '';
    try {
      const customer = await ctx.base44.asServiceRole.entities.Customer.get(plan.customer_id);
      customerName = customer?.name || user.full_name || user.email || '';
    } catch (err) {
      console.warn('Customer entity not found, using fallback name');
      customerName = user.full_name || user.email || '';
    }

    // 4. Load plan lines
    const planLines = await ctx.base44.asServiceRole.entities.PlanLine.filter({
      plan_version_id: planVersionId,
    });

    if (planLines.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No plan lines found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Group by job_key
    const grouped = {};
    for (const line of planLines) {
      if (!grouped[line.job_key]) grouped[line.job_key] = [];
      grouped[line.job_key].push(line);
    }

    let created = 0;
    let skipped = 0;

    // 6. Create jobs (idempotent)
    for (const [jobKey, lines] of Object.entries(grouped)) {
      const existing = await ctx.base44.asServiceRole.entities.Job.filter({
        plan_id: planId,
        plan_version_id: planVersionId,
        job_key: jobKey,
      });

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const first = lines[0];

      await ctx.base44.asServiceRole.entities.Job.create({
        job_key: jobKey,
        plan_id: planId,
        plan_version_id: planVersionId,
        customer_id: plan.customer_id,
        customer_name: customerName,
        customer_status: 'confirmed',

        job_type: first.job_type,
        collection_address: first.collection_address,
        collection_postcode: first.collection_postcode,
        collection_contact: first.collection_contact,
        collection_phone: first.collection_phone,
        collection_date: first.collection_date,
        collection_time_slot: first.collection_time_slot,
        collection_time: first.collection_time,

        delivery_address: first.delivery_address,
        delivery_postcode: first.delivery_postcode,
        delivery_contact: first.delivery_contact,
        delivery_phone: first.delivery_phone,
        delivery_date: first.delivery_date,
        delivery_time_slot: first.delivery_time_slot,
        delivery_time: first.delivery_time,

        scheduled_date: first.delivery_date,
        scheduled_time_slot: first.delivery_time_slot,
        scheduled_time: first.delivery_time,

        requires_fitter: first.requires_fitter,
        fitter_id: first.fitter_id || null,
        fitter_name: first.fitter_name || null,
        special_instructions: first.special_instructions || '',

        items: lines.map(l => ({
          description: l.item_description,
          quantity: Number(l.item_quantity) || 1,
          weight_kg: Number(l.item_weight_kg) || 0,
          dimensions: l.item_dimensions || '',
        })),
      });

      created++;
    }

    // 7. Update plan status
    await ctx.base44.asServiceRole.entities.Plan.update(planId, {
      status: 'published',
    });

    // 8. SUCCESS RESPONSE
    return new Response(
      JSON.stringify({
        status: 'success',
        jobs_created_count: created,
        jobs_skipped_count: skipped,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('publishPlan error:', err);

    return new Response(
      JSON.stringify({
        error: 'Publish failed',
        message: err.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}