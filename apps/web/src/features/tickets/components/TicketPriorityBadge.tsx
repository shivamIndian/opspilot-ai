import React from 'react';
import type { TicketPriority } from '../types/ticket.types';
import { PRIORITY_CONFIG } from '../utils/ticket-formatters';

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
  showDot?: boolean;
}

export const TicketPriorityBadge: React.FC<TicketPriorityBadgeProps> = ({
  priority,
  showDot = true,
}) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  );
};
