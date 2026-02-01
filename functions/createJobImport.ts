import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !user.customer_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { importName, parsedData } = body;

    if (!importName || !parsedData) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create JobImport record only on final confirmation
    const jobImport = await base44.asServiceRole.entities.JobImport.create({
      customer_id: user.customer_id,
      name: importName,
      created_by_user_id: user.id,
      status: 'created',
      jobs_created_count: 0,
    });

    // Create Jobs from parsed data
    const groupedJobs = parsedData.grouped_jobs;
    const jobs = [];

    for (const [jobKey, jobData] of Object.entries(groupedJobs)) {
      const jobNumber = `IMP-${jobImport.id.slice(0, 8)}-${jobKey}`.slice(0, 50);
      jobs.push({
        job_number: jobNumber,
        customer_id: user.customer_id,
        customer_name: user.full_name || user.email,
        job_type: jobData.job_type,
        customer_status: 'confirmed',
        ops_status: 'allocated',
        collection_address: jobData.collection_address,
        collection_postcode: jobData.collection_postcode,
        collection_contact: jobData.collection_contact,
        collection_phone: jobData.collection_phone,
        collection_date: jobData.collection_date,
        collection_time_slot: jobData.collection_time_slot,
        collection_time: jobData.collection_time,
        delivery_address: jobData.delivery_address,
        delivery_postcode: jobData.delivery_postcode,
        delivery_contact: jobData.delivery_contact,
        delivery_phone: jobData.delivery_phone,
        delivery_date: jobData.delivery_date,
        delivery_time_slot: jobData.delivery_time_slot,
        delivery_time: jobData.delivery_time,
        scheduled_date: jobData.delivery_date,
        scheduled_time_slot: jobData.delivery_time_slot,
        scheduled_time: jobData.delivery_time,
        special_instructions: jobData.special_instructions,
        requires_fitter: jobData.requires_fitter,
        fitter_id: jobData.fitter_id || null,
        fitter_name: jobData.fitter_name || null,
        job_import_id: jobImport.id,
        job_import_name: jobImport.name,
        items: jobData.items,
      });
    }

    // Bulk create jobs
    await base44.asServiceRole.entities.Job.bulkCreate(jobs);

    // Update JobImport with counts
    await base44.asServiceRole.entities.JobImport.update(jobImport.id, {
      jobs_created_count: jobs.length,
      last_upload_filename: parsedData.filename || '',
    });

    return Response.json({
      status: 'success',
      job_import_id: jobImport.id,
      job_import_name: jobImport.name,
      jobs_created_count: jobs.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});