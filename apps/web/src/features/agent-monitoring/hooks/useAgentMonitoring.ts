import { useQuery } from '@tanstack/react-query';
import { agentMonitoringService } from '../services/agent-monitoring.service';
import type { WorkflowRunsFilter } from '../types/agent-monitoring.types';

export const useMonitoringOverview = (
  organizationId?: string,
  fromDate?: string,
  toDate?: string
) => {
  return useQuery({
    queryKey: ['agent-monitoring', 'overview', organizationId, fromDate, toDate],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return agentMonitoringService.getOverview(organizationId, fromDate, toDate);
    },
    enabled: !!organizationId,
    refetchInterval: 15000, // Safe 15s refresh
  });
};

export const useWorkflowRuns = (
  organizationId?: string,
  filters: WorkflowRunsFilter = {}
) => {
  return useQuery({
    queryKey: ['agent-monitoring', 'runs', organizationId, filters],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return agentMonitoringService.listRuns(organizationId, filters);
    },
    enabled: !!organizationId,
  });
};

export const useWorkflowRunDetails = (organizationId?: string, runId?: string) => {
  return useQuery({
    queryKey: ['agent-monitoring', 'run-details', organizationId, runId],
    queryFn: () => {
      if (!organizationId || !runId) throw new Error('Organization ID and Run ID are required');
      return agentMonitoringService.getRunDetails(organizationId, runId);
    },
    enabled: !!organizationId && !!runId,
  });
};

export const useWorkflowRunEvents = (organizationId?: string, runId?: string) => {
  return useQuery({
    queryKey: ['agent-monitoring', 'run-events', organizationId, runId],
    queryFn: () => {
      if (!organizationId || !runId) throw new Error('Organization ID and Run ID are required');
      return agentMonitoringService.getRunEvents(organizationId, runId);
    },
    enabled: !!organizationId && !!runId,
  });
};

export const useToolExecutions = (organizationId?: string) => {
  return useQuery({
    queryKey: ['agent-monitoring', 'tool-executions', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return agentMonitoringService.getToolExecutions(organizationId);
    },
    enabled: !!organizationId,
  });
};
