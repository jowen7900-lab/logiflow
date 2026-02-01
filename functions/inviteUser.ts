import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin authentication
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, app_role, customer_id, vehicle_reg, vehicle_type } = await req.json();

    if (!email || !app_role) {
      return Response.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Invite the user
    await base44.users.inviteUser(email, 'user');

    // Wait for user creation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find the newly created user with retries
    let invitedUser = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        invitedUser = users[0];
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!invitedUser) {
      // User invited but record creation is still pending
      return Response.json({ 
        success: true,
        message: 'User invitation sent successfully',
        pending: true 
      });
    }
    
    // Prepare update data based on role
    const updateData = {
      app_role,
    };

    // For customer and fitter: pre-approve
    if (app_role === 'customer' || app_role === 'fitter') {
      updateData.approval_status = 'approved';
      if (customer_id) {
        updateData.customer_id = customer_id;
      }
    }

    // For driver: set vehicle details but require manual approval
    if (app_role === 'driver') {
      if (vehicle_reg) updateData.vehicle_reg = vehicle_reg;
      if (vehicle_type) updateData.vehicle_type = vehicle_type;
      // Driver approval happens separately via approval flow
    }

    // Update the user with role and other details
    await base44.asServiceRole.entities.User.update(invitedUser.id, updateData);

    return Response.json({ 
      success: true,
      message: `User invited as ${app_role}`,
      userId: invitedUser.id 
    });
  } catch (error) {
    console.error('Invite user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});