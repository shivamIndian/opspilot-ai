import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';
import type { DashboardPeriodKey } from '../types/dashboard.types';

export function useDashboardOverview(
  organizationId: string | undefined,
  period: DashboardPeriodKey = '30d'
) {
  return useQuery({
    queryKey: ['dashboard', 'overview', organizationId, period],
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return dashboardService.getOverview(organizationId, period);
    },
    enabled: Boolean(organizationId),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useRecentActivity(
  organizationId: string | undefined,
  limit: number = 20,
  offset: number = 0
) {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity', organizationId, limit, offset],
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return dashboardService.getRecentActivity(organizationId, limit, offset);
    },
    enabled: Boolean(organizationId),
    staleTime: 30000,
  });
}
