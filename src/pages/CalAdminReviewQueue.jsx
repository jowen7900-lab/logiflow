import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function CalAdminReviewQueue() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <CardTitle className="text-xl">Deprecated Page</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            This page is no longer used. Please return to your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}