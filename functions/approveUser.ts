import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin authentication
    const user = await base44.auth.me();
    if (user?.app_role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, action, rejectionReason } = await req.json();

    if (!userId || !action) {
      return Response.json({ error: 'userId and action are required' }, { status: 400 });
    }

    // Get the user to approve/reject
    const targetUser = await base44.asServiceRole.entities.User.get(userId);
    
    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Set app_role from requested_app_role and approve
      const updateData = {
        app_role: targetUser.requested_app_role,
        approval_status: 'approved',
        requested_app_role: null, // Clear the request
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
      };

      await base44.asServiceRole.entities.User.update(userId, updateData);

      // If driver, create Driver entity
      if (targetUser.requested_app_role === 'driver') {
        await base44.asServiceRole.entities.Driver.create({
          name: targetUser.full_name,
          email: targetUser.email,
          phone: targetUser.phone || '',
          vehicle_reg: targetUser.vehicle_reg || '',
          vehicle_type: targetUser.vehicle_type || '',
          status: 'active'
        });
      }

      // If fitter, create Fitter entity
      if (targetUser.requested_app_role === 'fitter') {
        await base44.asServiceRole.entities.Fitter.create({
          name: targetUser.full_name,
          email: targetUser.email,
          phone: targetUser.phone || '',
          specialization: 'general',
          status: 'active'
        });
      }

      return Response.json({ 
        success: true,
        message: `${targetUser.requested_app_role} approved successfully`
      });
    } 
    
    if (action === 'reject') {
      if (!rejectionReason) {
        return Response.json({ error: 'Rejection reason is required' }, { status: 400 });
      }

      await base44.asServiceRole.entities.User.update(userId, {
        approval_status: 'rejected',
        rejection_reason: rejectionReason,
        requested_app_role: null,  // Clear request so they can reapply
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
      });

      return Response.json({ 
        success: true,
        message: 'User rejected'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Approve user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});