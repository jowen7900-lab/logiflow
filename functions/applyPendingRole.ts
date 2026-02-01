import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if there's a pending invitation for this user
    const invitations = await base44.asServiceRole.entities.PendingInvitation.filter({
      email: user.email,
      status: 'pending'
    });

    if (invitations.length === 0) {
      return Response.json({ 
        success: false,
        message: 'No pending invitation found for this email',
        debug: { email: user.email }
      });
    }

    const invitation = invitations[0];

    // Prepare update data based on role
    const updateData = {};
    
    // Store role in user.data.app_role (custom field)
    updateData.app_role = invitation.app_role;

    // For customer and fitter: pre-approve
    if (invitation.app_role === 'customer' || invitation.app_role === 'fitter') {
      updateData.approval_status = 'approved';
      if (invitation.customer_id) {
        updateData.customer_id = invitation.customer_id;
      }
    }

    // For driver: set vehicle details but require manual approval
    if (invitation.app_role === 'driver') {
      if (invitation.vehicle_reg) updateData.vehicle_reg = invitation.vehicle_reg;
      if (invitation.vehicle_type) updateData.vehicle_type = invitation.vehicle_type;
      updateData.approval_status = 'pending_review';
    }

    // For admin: auto-approve
    if (invitation.app_role === 'admin') {
      updateData.approval_status = 'approved';
    }

    // Update the user with role and other details
    await base44.asServiceRole.entities.User.update(user.id, updateData);

    // Mark invitation as accepted
    await base44.asServiceRole.entities.PendingInvitation.update(invitation.id, {
      status: 'accepted'
    });

    return Response.json({ 
      success: true,
      app_role: invitation.app_role,
      message: `Role ${invitation.app_role} applied successfully`
    });
  } catch (error) {
    console.error('Apply pending role error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});