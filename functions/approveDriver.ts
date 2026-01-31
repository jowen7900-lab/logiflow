import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.app_role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { userId, action, rejectionReason } = await req.json();

    if (!userId || !action) {
      return Response.json({ error: 'userId and action are required' }, { status: 400 });
    }

    let updateData = {
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      updateData.approval_status = 'approved';
      updateData.rejection_reason = null;
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return Response.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      updateData.approval_status = 'rejected';
      updateData.rejection_reason = rejectionReason;
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Use service role to update user
    const result = await base44.asServiceRole.entities.User.update(userId, updateData);

    return Response.json({ 
      success: true, 
      message: action === 'approve' ? 'Driver approved successfully' : 'Driver rejected',
      user: result 
    });

  } catch (error) {
    console.error('Error in approveDriver:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});