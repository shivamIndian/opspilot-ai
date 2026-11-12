import React from 'react';
import { ApprovalInbox } from '@/features/agent-approvals/components/ApprovalInbox';

export const ApprovalsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <ApprovalInbox />
    </div>
  );
};
