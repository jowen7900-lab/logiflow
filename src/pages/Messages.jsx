import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import JobChat from '@/components/chat/JobChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MessageSquare,
  Package,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function Messages() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get jobs based on user role
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['userJobs', user?.app_role, user?.customer_id, user?.email],
    queryFn: async () => {
      if (user?.app_role === 'customer' || user?.app_role === 'customer_admin') {
        return base44.entities.Job.filter({ customer_id: user?.customer_id }, '-updated_date', 50);
      }
      if (user?.app_role === 'driver') {
        return base44.entities.Job.filter({ driver_id: user?.email }, '-updated_date', 50);
      }
      if (user?.app_role === 'fitter') {
        return base44.entities.Job.filter({ fitter_id: user?.email }, '-updated_date', 50);
      }
      // Ops/Admin see all
      return base44.entities.Job.list('-updated_date', 100);
    },
    enabled: !!user,
  });

  // Get messages for all user's jobs
  const { data: allMessages = [] } = useQuery({
    queryKey: ['allMessages', jobs.map(j => j.id)],
    queryFn: async () => {
      if (jobs.length === 0) return [];
      const messages = await Promise.all(
        jobs.slice(0, 20).map(job => 
          base44.entities.JobMessage.filter({ job_id: job.id }, '-created_date', 5)
        )
      );
      return messages.flat();
    },
    enabled: jobs.length > 0,
  });

  // Get messages for selected job
  const { data: selectedJobMessages = [] } = useQuery({
    queryKey: ['jobMessages', selectedJobId],
    queryFn: () => base44.entities.JobMessage.filter({ job_id: selectedJobId }, 'created_date'),
    enabled: !!selectedJobId,
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const sendMessageMutation = useMutation({
    mutationFn: async (message) => {
      await base44.entities.JobMessage.create({
        job_id: selectedJobId,
        job_number: selectedJob?.job_number,
        sender_id: user?.email,
        sender_name: user?.full_name,
        sender_role: user?.app_role?.includes('customer') ? 'customer' : user?.app_role,
        message,
        message_type: 'text',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobMessages', selectedJobId]);
      queryClient.invalidateQueries(['allMessages']);
    },
  });

  // Group messages by job and get latest
  const jobsWithMessages = jobs.map(job => {
    const jobMessages = allMessages.filter(m => m.job_id === job.id);
    const lastMessage = jobMessages[0];
    const unreadCount = jobMessages.filter(m => 
      m.sender_id !== user?.email && 
      (!m.read_by || !m.read_by.includes(user?.email))
    ).length;
    
    return {
      ...job,
      lastMessage,
      unreadCount,
    };
  }).filter(job => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return job.job_number?.toLowerCase().includes(search) ||
           job.customer_name?.toLowerCase().includes(search);
  }).sort((a, b) => {
    // Sort by last message date or job creation date
    const aDate = a.lastMessage?.created_date || a.created_date;
    const bDate = b.lastMessage?.created_date || b.created_date;
    return new Date(bDate) - new Date(aDate);
  });

  return (
    <div className="flex h-[calc(100vh-180px)] gap-6">
      {/* Job List */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {jobsLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : jobsWithMessages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : (
            jobsWithMessages.map(job => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-colors',
                  selectedJobId === job.id 
                    ? 'bg-indigo-50 border-indigo-200 border' 
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-slate-900">{job.job_number}</span>
                  {job.unreadCount > 0 && (
                    <Badge className="bg-indigo-600 text-white text-xs">
                      {job.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-1">{job.customer_name}</p>
                {job.lastMessage ? (
                  <p className="text-sm text-slate-600 truncate">
                    {job.lastMessage.sender_name}: {job.lastMessage.message}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No messages yet</p>
                )}
                {job.lastMessage && (
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(job.lastMessage.created_date), 'MMM d, HH:mm')}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        {selectedJobId ? (
          <div className="h-full flex flex-col">
            {/* Job Header */}
            <div className="bg-white border border-slate-200 rounded-t-lg p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold">{selectedJob?.job_number}</span>
                </div>
                <p className="text-sm text-slate-500">{selectedJob?.customer_name}</p>
              </div>
              <Link to={createPageUrl(`JobDetail?id=${selectedJobId}`)}>
                <Button variant="outline" size="sm">View Job</Button>
              </Link>
            </div>
            
            {/* Chat */}
            <div className="flex-1 border-x border-b border-slate-200 rounded-b-lg overflow-hidden">
              <JobChat
                messages={selectedJobMessages}
                currentUserId={user?.email}
                currentUserRole={user?.app_role}
                onSendMessage={(msg) => sendMessageMutation.mutate(msg)}
                isLoading={sendMessageMutation.isPending}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-center text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm">Choose a job to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}