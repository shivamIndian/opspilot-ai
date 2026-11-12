import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApprovalService } from '../services/agent-approval.service';
import type { ApprovalFilterParams, SafeAgentProposal } from '../types/agent-approvals.types';

export const useProposalList = (
  organizationId: string | undefined,
  filters: ApprovalFilterParams = {}
) => {
  return useQuery({
    queryKey: ['agent-approvals', organizationId, filters],
    queryFn: () => agentApprovalService.listProposals(organizationId!, filters),
    enabled: Boolean(organizationId),
    staleTime: 5000,
  });
};

export const useProposalDetails = (
  organizationId: string | undefined,
  proposalId: string | undefined
) => {
  return useQuery({
    queryKey: ['agent-proposal', organizationId, proposalId],
    queryFn: () => agentApprovalService.getProposalDetails(organizationId!, proposalId!),
    enabled: Boolean(organizationId && proposalId),
    staleTime: 5000,
  });
};

export const useApproveProposal = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, notes }: { proposalId: string; notes?: string }) =>
      agentApprovalService.approveProposal(organizationId!, proposalId, notes),
    onSuccess: (data: SafeAgentProposal) => {
      queryClient.invalidateQueries({ queryKey: ['agent-approvals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['agent-proposal', organizationId, data.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] });
    },
  });
};

export const useRejectProposal = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, reason }: { proposalId: string; reason: string }) =>
      agentApprovalService.rejectProposal(organizationId!, proposalId, reason),
    onSuccess: (data: SafeAgentProposal) => {
      queryClient.invalidateQueries({ queryKey: ['agent-approvals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['agent-proposal', organizationId, data.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] });
    },
  });
};

export const useCancelProposal = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ proposalId, reason }: { proposalId: string; reason?: string }) =>
      agentApprovalService.cancelProposal(organizationId!, proposalId, reason),
    onSuccess: (data: SafeAgentProposal) => {
      queryClient.invalidateQueries({ queryKey: ['agent-approvals', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['agent-proposal', organizationId, data.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', organizationId] });
    },
  });
};
