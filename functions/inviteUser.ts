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

    // Store the pending invitation with intended role
    await base44.asServiceRole.entities.PendingInvitation.create({
      email,
      app_role,
      customer_id: customer_id || null,
      vehicle_reg: vehicle_reg || null,
      vehicle_type: vehicle_type || null,
      invited_by: user.id,
      status: 'pending'
    });

    // Send the invitation email
    // If app_role is 'admin', invite as admin in Base44 system, otherwise as 'user'
    const platformRole = app_role === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(email, platformRole);

    return Response.json({ 
      success: true,
      message: `Invitation sent to ${email} for ${app_role} role`
    });
  } catch (error) {
    console.error('Invite user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});