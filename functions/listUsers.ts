import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all users using service role
    const users = await base44.asServiceRole.entities.User.list();

    return Response.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});