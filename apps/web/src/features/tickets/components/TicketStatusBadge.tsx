import React from 'react';
import type { TicketStatus } from '../types/ticket.types';
import { STATUS_CONFIG } from '../utils/ticket-formatters';

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  );
};
