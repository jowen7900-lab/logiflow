import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PlansPage() {
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [planName, setPlanName] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: () => base44.entities.Plan.filter({ customer_id: user?.customer_id }, '-created_date', 100),
    enabled: !!user?.customer_id,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data) => {
      const plan = await base44.entities.Plan.create({
        customer_id: user.customer_id,
        name: data.planName,
        created_by_user_id: user.id,
        status: 'draft',
      });
      return plan;
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries(['plans']);
      setShowNewPlan(false);
      setPlanName('');
      navigate(createPageUrl(`PlanDetail?id=${plan.id}`));
    },
  });

  const handleCreatePlan = () => {
    if (planName.trim()) {
      createPlanMutation.mutate({ planName });
    }
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    pending_review: 'bg-blue-100 text-blue-700',
    applied: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Plans</h2>
        <Button onClick={() => setShowNewPlan(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="pt-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No plans yet. Create your first plan to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(createPageUrl(`PlanDetail?id=${plan.id}`))}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Created {new Date(plan.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[plan.status]}`}>
                    {plan.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showNewPlan} onOpenChange={setShowNewPlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Plan name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlan()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewPlan(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlan} disabled={!planName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}