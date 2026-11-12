import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Workflow,
  Play,
  CheckCircle2,
  ShieldCheck,
  Bot,
  ExternalLink,
  Code2,
} from 'lucide-react';
import type { SafeOrganization } from '@/types/organization';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';

interface WorkflowRunResult {
  runId: string;
  threadId?: string;
  status: string;
  output?: string;
  finalAnswer?: string;
  stepsCount?: number;
  toolCalls?: Array<{ toolName: string; status: string }>;
  completedAt?: string;
}

export const WorkflowsPage: React.FC = () => {
  const context = useOutletContext<{ organization?: SafeOrganization }>();
  const organization = context?.organization;

  const [query, setQuery] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkflowRunResult | null>(null);

  if (!organization) return null;

  const handleRunWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setIsRunning(true);
      setError(null);
      setResult(null);

      const res = await apiClient.post(`/organizations/${organization.id}/agent/workflows/run`, {
        query: query.trim(),
      });

      const data = res.data.data;
      setResult(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error).message ||
        'Workflow execution failed. Please verify AI agent service is running.';
      setError(msg);
    } finally {
      setIsRunning(false);
    }
  };

  const workflowPipelines = [
    {
      id: 'ticket-triage',
      title: 'Ticket Triage & Multi-Step Resolution',
      description: 'LangGraph stateful workflow: inspects priority, queries RAG vector store, and synthesizes answers.',
      status: 'Active',
      version: 'v1.0.0',
    },
    {
      id: 'knowledge-grounding',
      title: 'Knowledge Retrieval & Evidence Grounding',
      description: 'Executes semantic document search, citations attribution, and contextual confidence verification.',
      status: 'Active',
      version: 'v1.0.0',
    },
    {
      id: 'governance-approval',
      title: 'Human-in-the-Loop Interventions',
      description: 'Detects high-risk tool actions (database writes, notifications) and persists checkpoints for human approval.',
      status: 'Active',
      version: 'v1.0.0',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">AI Agent Workflows</h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Stateful LangGraph orchestration engine with checkpointing, tool discovery, and human-in-the-loop gating.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of registered pipelines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {workflowPipelines.map(pipe => (
          <Card key={pipe.id} className="border-[var(--border-default)] bg-[var(--surface-secondary)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="success" size="sm">
                  {pipe.status}
                </Badge>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{pipe.version}</span>
              </div>
              <CardTitle className="text-sm font-semibold text-[var(--text-primary)]">
                {pipe.title}
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {pipe.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Interactive Workflow Execution Console */}
      <Card className="border-[var(--border-default)] bg-[var(--surface-secondary)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Bot className="h-4 w-4 text-[var(--brand-primary)]" />
                <span>Workflow Test Console</span>
              </CardTitle>
              <CardDescription className="text-xs text-[var(--text-secondary)]">
                Dispatch an operational prompt through the LangGraph engine to evaluate multi-step reasoning.
              </CardDescription>
            </div>
            <Link
              to={`/organizations/${organization.id}/approvals`}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-primary)] hover:underline"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>View Approval Inbox</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRunWorkflow} className="space-y-4">
            <Textarea
              label="Operational Instruction / Query"
              placeholder="e.g. Find the standard SLA policy in our employee manual and summarize the incident triage guidelines."
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={3}
              helperText="The agent will plan multi-step execution, invoke authorized tools, and return an evidence-grounded result."
              required
            />

            {error && (
              <Alert variant="error" dismissible onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isRunning}
                disabled={!query.trim() || isRunning}
                leftIcon={<Play className="h-3.5 w-3.5" />}
              >
                {isRunning ? 'Orchestrating Workflow...' : 'Execute Workflow'}
              </Button>
            </div>
          </form>

          {/* Result view */}
          {result && (
            <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Execution Succeeded
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                    Run ID: {result.runId?.slice(0, 8)}...
                  </span>
                  <Badge variant="success" size="sm">
                    {result.status || 'COMPLETED'}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Agent Response:
                </p>
                <div className="rounded-lg bg-[var(--surface-secondary)] p-3 text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed border border-[var(--border-subtle)]">
                  {result.finalAnswer || result.output || JSON.stringify(result, null, 2)}
                </div>
              </div>

              {result.toolCalls && result.toolCalls.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                    <span>Tools Invoked ({result.toolCalls.length}):</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.toolCalls.map((tool, idx) => (
                      <Badge key={idx} variant="info" size="sm">
                        {tool.toolName} ({tool.status})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
