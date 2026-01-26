import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Paperclip, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const roleColors = {
  customer: 'bg-blue-500',
  ops: 'bg-indigo-500',
  driver: 'bg-emerald-500',
  fitter: 'bg-purple-500',
};

export default function JobChat({ messages = [], currentUserId, currentUserRole, onSendMessage, isLoading }) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No messages yet. Start the conversation!
          </div>
        )}
        
        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentUserId;
          const isSystem = message.message_type === 'system';
          
          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center">
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {message.message}
                </span>
              </div>
            );
          }
          
          return (
            <div 
              key={message.id} 
              className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
            >
              <Avatar className={cn('w-8 h-8', roleColors[message.sender_role])}>
                <AvatarFallback className="text-white text-xs">
                  {message.sender_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
                <div className={cn('flex items-center gap-2 mb-1', isOwn && 'flex-row-reverse')}>
                  <span className="text-xs font-medium text-slate-700">{message.sender_name}</span>
                  <span className="text-xs text-slate-400 capitalize">{message.sender_role}</span>
                </div>
                
                <div className={cn(
                  'rounded-2xl px-4 py-2.5',
                  isOwn 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                )}>
                  {message.attachment_url && (
                    <img 
                      src={message.attachment_url} 
                      alt="Attachment" 
                      className="max-w-full rounded-lg mb-2"
                    />
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                </div>
                
                <span className={cn(
                  'text-xs text-slate-400 mt-1 block',
                  isOwn && 'text-right'
                )}>
                  {format(new Date(message.created_date), 'HH:mm')}
                </span>
              </div>
            </div>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend}
            disabled={!newMessage.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}