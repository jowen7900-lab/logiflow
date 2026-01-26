import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Building2 } from 'lucide-react';

/**
 * SSO Configuration Component
 * 
 * This platform uses Single Sign-On (SSO) authentication via:
 * - Microsoft Azure AD
 * - Google Workspace
 * 
 * SSO is configured at the Base44 platform level via Authentication settings.
 * 
 * Role Assignment Flow:
 * 1. User authenticates via SSO (Microsoft/Google)
 * 2. During first login, user is assigned a role by admin
 * 3. Role is stored in User.app_role field
 * 4. Role determines all permissions and data access
 * 5. Role cannot be changed by user during session
 * 
 * Supported Roles:
 * - customer: End customer users
 * - customer_admin: Customer organization admins
 * - ops: Operations team
 * - driver: Delivery drivers
 * - fitter: Installation fitters
 */

export default function SSOConfig() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            SSO Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              SSO is configured at the platform level. Users authenticate via Microsoft Azure AD or Google Workspace.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Supported Providers:</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
              <li>Microsoft Azure AD (Office 365)</li>
              <li>Google Workspace (G Suite)</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Security Features:</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
              <li>Role-based access control (RBAC)</li>
              <li>Automatic session management</li>
              <li>No role switching within session</li>
              <li>Explicit permissions only</li>
              <li>Data isolation by role</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}