import React from 'react';

interface ActionDiffViewerProps {
  actionType: string;
  proposedAction: Record<string, any>;
  className?: string;
}

export const ActionDiffViewer: React.FC<ActionDiffViewerProps> = ({
  actionType,
  proposedAction,
  className = '',
}) => {
  const isCreate = actionType === 'create_ticket' || proposedAction.action === 'create_ticket';
  const isUpdate = actionType === 'update_ticket' || proposedAction.action === 'update_ticket';
  const isExpense =
    actionType.includes('expense') ||
    (typeof proposedAction.action === 'string' && proposedAction.action.includes('Expense')) ||
    Boolean(proposedAction.claimed_amount);
  const isWfh =
    actionType.includes('wfh') ||
    (typeof proposedAction.action === 'string' && proposedAction.action.includes('Work-From-Home')) ||
    Boolean(proposedAction.duration);
  const isSoftware =
    actionType.includes('software') ||
    (typeof proposedAction.action === 'string' && proposedAction.action.includes('Software'));
  const isK8s =
    actionType.includes('kubernetes') ||
    actionType.includes('rollout') ||
    (typeof proposedAction.action === 'string' && proposedAction.action.startsWith('kubectl'));

  const badgeText = isExpense
    ? 'EXPENSE OVERRIDE'
    : isWfh
    ? 'HR POLICY WAIVER'
    : isSoftware
    ? 'LICENSE ALLOCATION'
    : isCreate
    ? 'NEW ENTITY CREATION'
    : isUpdate
    ? 'FIELD MODIFICATION'
    : isK8s
    ? 'KUBERNETES MUTATION'
    : 'OPERATION';

  return (
    <div className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 text-sm ${className}`}>
      <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase text-xs tracking-wider">
          Proposed Action Payload: {actionType}
        </span>
        <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">
          {badgeText}
        </span>
      </div>

      <div className="space-y-2">
        {isExpense && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Claimed Amount:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {proposedAction.claimed_amount || '₹7,000 INR'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Standard Policy Limit:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {proposedAction.policy_limit || '₹2,500 INR per person'}
                </span>
              </div>
              <div className="col-span-1 md:col-span-2">
                <span className="text-xs text-slate-500 block">Category:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {proposedAction.category || 'Client Entertainment / Business Meal'}
                </span>
              </div>
            </div>
            {proposedAction.reason && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Business Justification:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  {proposedAction.reason}
                </p>
              </div>
            )}
          </div>
        )}

        {isWfh && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Requested WFH Duration:</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {proposedAction.duration || '3 Weeks Remote Work'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Standard Allocation:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {proposedAction.standard_policy || 'Max 2 days per week'}
                </span>
              </div>
            </div>
            {proposedAction.reason && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Special Circumstances / Justification:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  {proposedAction.reason}
                </p>
              </div>
            )}
          </div>
        )}

        {isSoftware && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Requested Software / Tool:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {proposedAction.tool_name || 'GitHub Copilot Enterprise'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">License Cost:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {proposedAction.cost || '$19 / user / month'}
                </span>
              </div>
            </div>
            {proposedAction.reason && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Authorization Justification:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  {proposedAction.reason}
                </p>
              </div>
            )}
          </div>
        )}

        {isK8s && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Target Deployment:</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  {proposedAction.target || 'deployment/auth-service'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Namespace:</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {proposedAction.namespace || 'production'}
                </span>
              </div>
            </div>
            {proposedAction.action && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Execution Command:</span>
                <pre className="text-xs font-mono bg-slate-900 text-emerald-400 p-2.5 rounded border border-slate-800 overflow-x-auto">
                  {proposedAction.action}
                </pre>
              </div>
            )}
            {proposedAction.reason && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Incident Rationale:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                  {proposedAction.reason}
                </p>
              </div>
            )}
          </div>
        )}

        {isCreate && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-slate-500 block">Title / Subject:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {proposedAction.title || proposedAction.subject || '(None)'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Category & Priority:</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {proposedAction.category || 'technical'} &bull;{' '}
                <span className="uppercase text-xs font-bold text-amber-600 dark:text-amber-400">
                  {proposedAction.priority || 'medium'}
                </span>
              </span>
            </div>
            <div className="col-span-1 md:col-span-2">
              <span className="text-xs text-slate-500 block">Description:</span>
              <p className="mt-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-xs whitespace-pre-wrap font-sans">
                {proposedAction.description || '(No description provided)'}
              </p>
            </div>
          </div>
        )}

        {isUpdate && (
          <div>
            <div className="text-xs text-slate-500 mb-1">
              Target Ticket: <span className="font-mono text-slate-800 dark:text-slate-200">{proposedAction.ticketId || proposedAction.ticket_id}</span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">Changes:</span>
              <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {JSON.stringify(proposedAction.changes || proposedAction, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {!isCreate && !isUpdate && !isK8s && !isExpense && !isWfh && !isSoftware && (
          <div className="bg-white dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800">
            <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {JSON.stringify(proposedAction, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
