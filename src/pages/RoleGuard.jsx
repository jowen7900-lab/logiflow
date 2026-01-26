import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function RoleGuard({ children, allowedRoles, currentRole }) {
  const navigate = useNavigate();
  
  if (!currentRole) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Authentication Required</h2>
        <p className="text-slate-500 mt-1">Please log in to access this page</p>
      </div>
    );
  }
  
  if (!allowedRoles.includes(currentRole)) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-1">You don't have permission to access this page</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }
  
  return children;
}