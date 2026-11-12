import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Ticket as TicketIcon } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useTicketList, useTicketSummary } from '../hooks/useTickets';
import type { TicketFilterParams } from '../types/ticket.types';
import { TicketSummaryCards } from '../components/TicketSummaryCards';
import { TicketFilters } from '../components/TicketFilters';
import { TicketTable } from '../components/TicketTable';

export const TicketsPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { activeOrganization } = useOrganizations();

  const [filters, setFilters] = useState<TicketFilterParams>({
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const { data: ticketData, isLoading: isLoadingTickets } = useTicketList(organizationId, filters);

  const { data: summaryMetrics, isLoading: isLoadingSummary } = useTicketSummary(organizationId);

  const handleFilterChange = (newFilters: Partial<TicketFilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  };

  const handleSortChange = (
    sortBy: 'created_at' | 'updated_at' | 'ticket_number' | 'priority' | 'status'
  ) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TicketIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Support Tickets
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage, assign, and track customer support requests for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeOrganization?.name || 'Workspace'}
            </span>
          </p>
        </div>

        <button
          onClick={() => navigate(`/organizations/${organizationId}/tickets/new`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Metric Summary Cards */}
      <TicketSummaryCards metrics={summaryMetrics} isLoading={isLoadingSummary} />

      {/* Filter Controls */}
      <TicketFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Tickets Data Table */}
      <TicketTable
        organizationId={organizationId || ''}
        tickets={ticketData?.tickets || []}
        pagination={
          ticketData?.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
          }
        }
        isLoading={isLoadingTickets}
        onPageChange={page => handleFilterChange({ page })}
        onSortChange={handleSortChange}
      />
    </div>
  );
};
