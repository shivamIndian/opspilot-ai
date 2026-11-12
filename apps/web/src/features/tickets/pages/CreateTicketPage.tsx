import React from 'react';
import { useParams } from 'react-router-dom';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useTicketMutations } from '../hooks/useTickets';
import { TicketCreateForm } from '../components/TicketCreateForm';

export const CreateTicketPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { isOwner, isAdmin } = useOrganizations();
  const { createTicketMutation } = useTicketMutations(organizationId);

  const handleCreate = async (input: any): Promise<string> => {
    const ticket = await createTicketMutation.mutateAsync(input);
    return ticket.id;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <TicketCreateForm
        organizationId={organizationId || ''}
        onSubmit={handleCreate}
        canSetPriority={isOwner || isAdmin}
      />
    </div>
  );
};
