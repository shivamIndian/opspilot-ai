import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Archive,
  Edit2,
  Lock,
  MessageSquare,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';
import { organizationService } from '@/services/organizationService';
import { useProposalList } from '@/features/agent-approvals/hooks/useApprovals';
import {
  useTicketDetails,
  useTicketComments,
  useTicketActivity,
  useTicketMutations,
} from '../hooks/useTickets';
import type { TicketStatus, TicketPriority, TicketCategory } from '../types/ticket.types';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { TicketAssigneeSelect } from '../components/TicketAssigneeSelect';
import { TicketCommentList } from '../components/TicketCommentList';
import { TicketCommentForm } from '../components/TicketCommentForm';
import { InternalNoteEditor } from '../components/InternalNoteEditor';
import { TicketActivityTimeline } from '../components/TicketActivityTimeline';
import { CATEGORY_LABELS, formatRelativeTime } from '../utils/ticket-formatters';

export const TicketDetailsPage: React.FC = () => {
  const { organizationId, ticketId } = useParams<{
    organizationId: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner, isAdmin } = useOrganizations();
  const isStaff = isOwner || isAdmin;

  // Active Tab for comment input
  const [commentTab, setCommentTab] = useState<'public' | 'internal'>('public');

  // Inline editing state for description/subject
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<TicketCategory>('general');

  // Queries
  const {
    data: ticket,
    isLoading: isLoadingTicket,
    error: ticketError,
  } = useTicketDetails(organizationId, ticketId);

  const { data: commentsData, isLoading: isLoadingComments } = useTicketComments(
    organizationId,
    ticketId
  );

  const { data: activityData, isLoading: isLoadingActivity } = useTicketActivity(
    organizationId,
    ticketId
  );

  // Members query for assignee selection
  const { data: membersData } = useQuery({
    queryKey: ['org-members', organizationId],
    queryFn: () => organizationService.listMembers(organizationId!, { limit: 100 }),
    enabled: Boolean(organizationId && isStaff),
  });

  // Related AI Action Proposals (Module 11 & Module 14)
  const { data: proposalsData } = useProposalList(organizationId, { limit: 50 });
  const relatedProposals = (proposalsData?.items || []).filter(
    (p) =>
      p.proposedAction?.ticketId === ticketId ||
      p.proposedAction?.ticket_id === ticketId ||
      p.execution?.targetEntityId === ticketId
  );

  // Mutations
  const {
    updateTicketMutation,
    assignTicketMutation,
    updatePriorityMutation,
    updateStatusMutation,
    archiveTicketMutation,
    addCommentMutation,
  } = useTicketMutations(organizationId);

  if (isLoadingTicket) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-100 dark:bg-slate-800/60 animate-pulse rounded-xl" />
          <div className="h-96 bg-slate-100 dark:bg-slate-800/60 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          Ticket Not Found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          This ticket may have been removed, archived, or you do not have permission to view it.
        </p>
        <button
          onClick={() => navigate(`/organizations/${organizationId}/tickets`)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </button>
      </div>
    );
  }

  // Can user edit ticket details?
  const canEditTicket =
    ticket.archivedAt === null &&
    (isStaff ||
      (ticket.createdByUserId === user?.id &&
        ticket.status === 'open' &&
        ticket.assignedToUserId === null));

  const handleStartEdit = () => {
    setEditSubject(ticket.subject);
    setEditDescription(ticket.description);
    setEditCategory(ticket.category);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateTicketMutation.mutateAsync({
      ticketId: ticket.id,
      input: {
        subject: editSubject,
        description: editDescription,
        category: editCategory,
      },
    });
    setIsEditing(false);
  };

  // Status transitions
  const getAllowedStatusTransitions = (current: TicketStatus): TicketStatus[] => {
    if (isStaff) {
      if (current === 'open') return ['in_progress', 'waiting_on_customer', 'resolved'];
      if (current === 'in_progress') return ['waiting_on_customer', 'resolved'];
      if (current === 'waiting_on_customer') return ['in_progress', 'resolved'];
      if (current === 'resolved') return ['closed', 'open'];
      if (current === 'closed') return ['open'];
    } else {
      // Creator can close their own resolved ticket
      if (current === 'resolved' && ticket.createdByUserId === user?.id) {
        return ['closed'];
      }
    }
    return [];
  };

  const allowedTransitions = getAllowedStatusTransitions(ticket.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/organizations/${organizationId}/tickets`)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Back to Tickets"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60">
                {ticket.formattedTicketNumber}
              </span>
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
            </div>
          </div>
        </div>

        {/* Action Controls for Status & Archival */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Transitions Dropdown / Buttons */}
          {allowedTransitions.length > 0 && ticket.archivedAt === null && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Move to:</span>
              {allowedTransitions.map(targetStatus => (
                <button
                  key={targetStatus}
                  onClick={() =>
                    updateStatusMutation.mutateAsync({
                      ticketId: ticket.id,
                      status: targetStatus,
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 shadow-xs transition capitalize"
                >
                  {targetStatus.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}

          {/* Archive Action (Owner/Admin) */}
          {isStaff && ticket.archivedAt === null && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to archive this ticket?')) {
                  archiveTicketMutation.mutate(ticket.id);
                }
              }}
              disabled={archiveTicketMutation.isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/50 transition"
              title="Archive Ticket"
            >
              <Archive className="w-3.5 h-3.5" />
              Archive
            </button>
          )}

          {ticket.archivedAt && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
              <Archive className="w-3.5 h-3.5" />
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Left Details & Comments, Right Sidebar Metadata & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Subject, Description & Conversation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header & Description Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={6}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateTicketMutation.isPending}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {ticket.subject}
                  </h1>
                  {canEditTicket && (
                    <button
                      onClick={handleStartEdit}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Edit Ticket"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {CATEGORY_LABELS[ticket.category]}
                  </span>
                  <span>•</span>
                  <span>Opened {formatRelativeTime(ticket.createdAt)}</span>
                  <span>by {ticket.creator?.name || 'User'}</span>
                </div>

                <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </div>
              </div>
            )}
          </div>

          {/* Related AI Action Proposals (Module 11 & Module 14 Integration) */}
          {relatedProposals.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    AI Action Proposals & Approvals ({relatedProposals.length})
                  </span>
                </div>
                <Link
                  to={`/organizations/${organizationId}/approvals`}
                  className="text-[11px] font-semibold text-amber-900 dark:text-amber-300 hover:underline"
                >
                  View in Inbox &rarr;
                </Link>
              </div>

              <div className="space-y-1.5 pt-1">
                {relatedProposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-900/40 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase text-[11px] flex-shrink-0">
                        {prop.actionType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500 truncate text-[11px]">
                        {prop.justification || `tool: ${prop.toolName}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          prop.status === 'awaiting_approval'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : prop.status === 'approved' || prop.status === 'executed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {prop.status.replace(/_/g, ' ')}
                      </span>
                      <Link
                        to={`/organizations/${organizationId}/approvals/${prop.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-[11px]"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation & Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                Conversation & Notes
              </h3>

              {/* Toggle Public Reply vs Internal Note (Staff only) */}
              {isStaff && ticket.archivedAt === null && (
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  <button
                    onClick={() => setCommentTab('public')}
                    className={`px-3 py-1 rounded-md font-medium transition ${
                      commentTab === 'public'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Public Reply
                  </button>
                  <button
                    onClick={() => setCommentTab('internal')}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-md font-medium transition ${
                      commentTab === 'internal'
                        ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-amber-600" />
                    Internal Note
                  </button>
                </div>
              )}
            </div>

            {/* Comment Form */}
            {ticket.archivedAt === null && (
              <div>
                {commentTab === 'internal' && isStaff ? (
                  <InternalNoteEditor
                    onSubmit={async body => {
                      await addCommentMutation.mutateAsync({
                        ticketId: ticket.id,
                        body,
                        visibility: 'internal',
                      });
                    }}
                    disabled={addCommentMutation.isPending}
                  />
                ) : (
                  <TicketCommentForm
                    onSubmit={async body => {
                      await addCommentMutation.mutateAsync({
                        ticketId: ticket.id,
                        body,
                        visibility: 'public',
                      });
                    }}
                    disabled={addCommentMutation.isPending}
                  />
                )}
              </div>
            )}

            {/* Comment List */}
            <TicketCommentList
              comments={commentsData?.comments || []}
              isLoading={isLoadingComments}
            />
          </div>
        </div>

        {/* Right Sidebar (1 col): Metadata Card & Activity Timeline */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ticket Properties
            </h3>

            {/* Status Field */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status</span>
              <TicketStatusBadge status={ticket.status} />
            </div>

            {/* Priority Field */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Priority</span>
              {isStaff && ticket.archivedAt === null ? (
                <select
                  value={ticket.priority}
                  onChange={e =>
                    updatePriorityMutation.mutateAsync({
                      ticketId: ticket.id,
                      priority: e.target.value as TicketPriority,
                    })
                  }
                  className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              ) : (
                <TicketPriorityBadge priority={ticket.priority} />
              )}
            </div>

            {/* Category */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Category</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {CATEGORY_LABELS[ticket.category]}
              </span>
            </div>

            {/* Assignee Selection */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Assignee</label>
              {isStaff && ticket.archivedAt === null ? (
                <TicketAssigneeSelect
                  members={membersData?.members || []}
                  currentAssigneeId={ticket.assignedToUserId}
                  onAssign={async targetUserId => {
                    await assignTicketMutation.mutateAsync({
                      ticketId: ticket.id,
                      assignedToUserId: targetUserId,
                    });
                  }}
                  disabled={assignTicketMutation.isPending}
                />
              ) : ticket.assignee ? (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                    {ticket.assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {ticket.assignee.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{ticket.assignee.email}</div>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Unassigned</span>
              )}
            </div>

            {/* Requester / Creator */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs text-slate-500 mb-1 font-medium">Requester</label>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                  {ticket.creator?.name ? ticket.creator.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {ticket.creator?.name || 'User'}
                  </div>
                  <div className="text-[11px] text-slate-400">{ticket.creator?.email}</div>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Resolved:</span>
                  <span>{new Date(ticket.resolvedAt).toLocaleString()}</span>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex justify-between text-zinc-500">
                  <span>Closed:</span>
                  <span>{new Date(ticket.closedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity History Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Activity History
            </h3>
            <TicketActivityTimeline
              activity={activityData?.activity || []}
              isLoading={isLoadingActivity}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
