import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { History, Loader2 } from 'lucide-react';
import { findRecipientHistory } from './recipientMatcher';
import { formatDistanceToNow } from 'date-fns';
import RecipientHistoryDrawer from './RecipientHistoryDrawer';

export default function RecipientIntelligence({ 
  recipientName, 
  recipientPostcode, 
  userRole,
  currentJobId = null 
}) {
  // Early return: never render for drivers
  if (userRole === 'driver') return null;
  
  const [history, setHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Only show for ops, customer, customer_admin
  const canView = ['ops', 'admin', 'customer', 'customer_admin'].includes(userRole);
  
  useEffect(() => {
    if (!canView || !recipientName || !recipientPostcode) {
      setHistory(null);
      return;
    }
    
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const result = await findRecipientHistory(base44, {
          name: recipientName,
          postcode: recipientPostcode,
          currentJobId,
        });
        setHistory(result);
      } catch (error) {
        console.error('Failed to load recipient history:', error);
        setHistory(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistory();
  }, [recipientName, recipientPostcode, currentJobId, canView]);
  
  if (!canView) return null;
  if (!recipientName || !recipientPostcode) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking recipient history...</span>
      </div>
    );
  }
  
  if (!history || history.deliveriesCount === 0) return null;
  
  return (
    <>
      <div className="flex items-center gap-3 mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
        <History className="w-4 h-4 text-indigo-600" />
        <div className="flex-1 text-sm">
          <span className="font-medium text-indigo-900">
            {history.deliveriesCount} previous {history.deliveriesCount === 1 ? 'delivery' : 'deliveries'}
          </span>
          {history.lastDeliveryDate && (
            <span className="text-indigo-700 ml-2">
              • Last: {formatDistanceToNow(new Date(history.lastDeliveryDate), { addSuffix: true })}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsDrawerOpen(true)}
          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
        >
          View history
        </Button>
      </div>
      
      <RecipientHistoryDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        recipientName={recipientName}
        recipientPostcode={recipientPostcode}
        history={history}
        userRole={userRole}
      />
    </>
  );
}