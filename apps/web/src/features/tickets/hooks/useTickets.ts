import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '../services/ticket.service';
import type {
  TicketFilterParams,
  CreateTicketInput,
  UpdateTicketInput,
  TicketPriority,
  TicketStatus,
  CommentVisibility,
} from '../types/ticket.types';

export const useTicketList = (
  organizationId: string | undefined,
  params: TicketFilterParams = {}
) => {
  return useQuery({
    queryKey: ['tickets', organizationId, params],
    queryFn: () => ticketService.listTickets(organizationId!, params),
    enabled: Boolean(organizationId),
  });
};

export const useTicketDetails = (
  organizationId: string | undefined,
  ticketId: string | undefined
) => {
  return useQuery({
    queryKey: ['ticket', organizationId, ticketId],
    queryFn: () => ticketService.getTicketDetails(organizationId!, ticketId!),
    enabled: Boolean(organizationId && ticketId),
  });
};

export const useTicketComments = (
  organizationId: string | undefined,
  ticketId: string | undefined
) => {
  return useQuery({
    queryKey: ['ticket-comments', organizationId, ticketId],
    queryFn: () => ticketService.listComments(organizationId!, ticketId!),
    enabled: Boolean(organizationId && ticketId),
  });
};

export const useTicketActivity = (
  organizationId: string | undefined,
  ticketId: string | undefined
) => {
  return useQuery({
    queryKey: ['ticket-activity', organizationId, ticketId],
    queryFn: () => ticketService.listActivity(organizationId!, ticketId!),
    enabled: Boolean(organizationId && ticketId),
  });
};

export const useTicketSummary = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ['ticket-summary', organizationId],
    queryFn: () => ticketService.getSummaryMetrics(organizationId!),
    enabled: Boolean(organizationId),
  });
};

export const useTicketMutations = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  const invalidateTicketQueries = (ticketId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['tickets', organizationId] });
    queryClient.invalidateQueries({ queryKey: ['ticket-summary', organizationId] });
    if (ticketId) {
      queryClient.invalidateQueries({ queryKey: ['ticket', organizationId, ticketId] });
      queryClient.invalidateQueries({
        queryKey: ['ticket-comments', organizationId, ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket-activity', organizationId, ticketId],
      });
    }
  };

  const createTicketMutation = useMutation({
    mutationFn: (input: CreateTicketInput) => ticketService.createTicket(organizationId!, input),
    onSuccess: () => invalidateTicketQueries(),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ ticketId, input }: { ticketId: string; input: UpdateTicketInput }) =>
      ticketService.updateTicket(organizationId!, ticketId, input),
    onSuccess: (_, vars) => invalidateTicketQueries(vars.ticketId),
  });

  const assignTicketMutation = useMutation({
    mutationFn: ({
      ticketId,
      assignedToUserId,
    }: {
      ticketId: string;
      assignedToUserId: string | null;
    }) => ticketService.assignTicket(organizationId!, ticketId, assignedToUserId),
    onSuccess: (_, vars) => invalidateTicketQueries(vars.ticketId),
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ ticketId, priority }: { ticketId: string; priority: TicketPriority }) =>
      ticketService.updatePriority(organizationId!, ticketId, priority),
    onSuccess: (_, vars) => invalidateTicketQueries(vars.ticketId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: TicketStatus }) =>
      ticketService.updateStatus(organizationId!, ticketId, status),
    onSuccess: (_, vars) => invalidateTicketQueries(vars.ticketId),
  });

  const archiveTicketMutation = useMutation({
    mutationFn: (ticketId: string) => ticketService.archiveTicket(organizationId!, ticketId),
    onSuccess: (_, ticketId) => invalidateTicketQueries(ticketId),
  });

  const addCommentMutation = useMutation({
    mutationFn: ({
      ticketId,
      body,
      visibility,
    }: {
      ticketId: string;
      body: string;
      visibility?: CommentVisibility;
    }) => ticketService.addComment(organizationId!, ticketId, body, visibility),
    onSuccess: (_, vars) => invalidateTicketQueries(vars.ticketId),
  });

  return {
    createTicketMutation,
    updateTicketMutation,
    assignTicketMutation,
    updatePriorityMutation,
    updateStatusMutation,
    archiveTicketMutation,
    addCommentMutation,
  };
};
