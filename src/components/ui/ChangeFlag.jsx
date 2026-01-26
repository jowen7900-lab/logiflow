import React from 'react';
import { AlertTriangle, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ChangeFlag({ type = 'change', severity = 'medium', className = '' }) {
  const configs = {
    change: {
      icon: Edit2,
      text: 'Changed',
      className: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    rule_breach: {
      icon: AlertTriangle,
      text: 'Rule Breach',
      className: 'bg-orange-100 text-orange-800 border-orange-200'
    }
  };

  const config = configs[type] || configs.change;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${className} gap-1.5`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
}