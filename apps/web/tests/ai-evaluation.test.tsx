import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIEvaluationPage } from '@/features/ai-evaluation/pages/AIEvaluationPage';
import { EvaluationRunDetailPage } from '@/features/ai-evaluation/pages/EvaluationRunDetailPage';
import { aiEvaluationService } from '@/features/ai-evaluation/services/ai-evaluation.service';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  EvaluationDataset,
  EvaluationRun,
  EvaluationRunResult,
  EvaluationComparison,
} from '@/features/ai-evaluation/types/ai-evaluation.types';

const mockDatasets: EvaluationDataset[] = [
  {
    id: 'ds-rag-01',
    organization_id: 'org-1',
    name: 'Enterprise Core Knowledge Benchmark',
    description: 'Gold-standard RAG queries against IT documentation.',
    category: 'rag_retrieval',
    version: 1,
    example_count: 10,
    created_at: '2026-11-04T12:00:00.000Z',
    updated_at: '2026-11-04T12:00:00.000Z',
  },
  {
    id: 'ds-tools-02',
    organization_id: 'org-1',
    name: 'Agent Tool Invocation Benchmark',
    description: 'Tests tool selection accuracy and guardrail adherence.',
    category: 'agent_tool_selection',
    version: 1,
    example_count: 8,
    created_at: '2026-11-04T12:10:00.000Z',
    updated_at: '2026-11-04T12:10:00.000Z',
  },
];

const mockRuns: EvaluationRun[] = [
  {
    id: 'run-eval-101',
    organization_id: 'org-1',
    dataset_id: 'ds-rag-01',
    dataset_name: 'Enterprise Core Knowledge Benchmark',
    dataset_version: 1,
    category: 'rag_retrieval',
    model_provider: 'mock',
    model_name: 'mock-evaluator',
    rubric_version: 'v1.0',
    status: 'completed',
    total_examples: 10,
    completed_examples: 10,
    failed_examples: 0,
    summary_metrics: {
      overall_score: 92.5,
      mean_reciprocal_rank: 0.95,
      citation_accuracy: 0.90,
    },
    error_summary: null,
    started_at: '2026-11-04T12:15:00.000Z',
    completed_at: '2026-11-04T12:15:10.000Z',
    created_at: '2026-11-04T12:15:00.000Z',
  },
  {
    id: 'run-eval-102',
    organization_id: 'org-1',
    dataset_id: 'ds-rag-01',
    dataset_name: 'Enterprise Core Knowledge Benchmark',
    dataset_version: 1,
    category: 'rag_retrieval',
    model_provider: 'mock',
    model_name: 'mock-candidate',
    rubric_version: 'v1.0',
    status: 'completed',
    total_examples: 10,
    completed_examples: 10,
    failed_examples: 0,
    summary_metrics: {
      overall_score: 87.0,
      mean_reciprocal_rank: 0.88,
      citation_accuracy: 0.85,
    },
    error_summary: null,
    started_at: '2026-11-04T12:30:00.000Z',
    completed_at: '2026-11-04T12:30:10.000Z',
    created_at: '2026-11-04T12:30:00.000Z',
  },
];

const mockResults: EvaluationRunResult[] = [
  {
    id: 'res-001',
    run_id: 'run-eval-101',
    example_id: 'ex-001-abc',
    query: 'How do I request VPN access?',
    output: 'Submit an IT ticket via the self-service portal or email it@example.com.',
    status: 'success',
    metrics: {
      hit_rate: 1.0,
      reciprocal_rank: 1.0,
      citation_validity: 1.0,
    },
    model_judge_score: 5,
    model_judge_notes: 'Answer is fully supported by documentation with zero hallucinations.',
    error_message: null,
  },
  {
    id: 'res-002',
    run_id: 'run-eval-101',
    example_id: 'ex-002-def',
    query: 'What is the refund policy for annual enterprise plans?',
    output: 'Enterprise plans require 30 days notice prior to renewal.',
    status: 'success',
    metrics: {
      hit_rate: 1.0,
      reciprocal_rank: 1.0,
      citation_validity: 0.8,
    },
    model_judge_score: 4,
    model_judge_notes: 'Accurate policy statement, slightly brief explanation.',
    error_message: null,
  },
];

const mockComparison: EvaluationComparison = {
  run_a: mockRuns[1],
  run_b: mockRuns[0],
  score_deltas: {
    overall_score: 5.5,
    mean_reciprocal_rank: 0.07,
    citation_accuracy: 0.05,
  },
  comparable: true,
  notes: 'Run B demonstrates a +5.5% overall improvement over Run A.',
};

describe('Module 23: AI Quality Evaluation UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.restoreAllMocks();

    useAuthStore.setState({
      user: {
        id: 'user-admin',
        email: 'admin@opspilot.internal',
        firstName: 'Ops',
        lastName: 'Admin',
        platformRole: 'user',
        emailVerified: true,
      },
      isAuthenticated: true,
    });

    useOrganizationStore.setState({
      activeOrganization: {
        id: 'org-1',
        name: 'OpsPilot Enterprise',
        slug: 'opspilot-enterprise',
        role: 'owner',
        createdAt: '2026-11-04T12:00:00.000Z',
        updatedAt: '2026-11-04T12:00:00.000Z',
      },
    });

    vi.spyOn(aiEvaluationService, 'listDatasets').mockResolvedValue(mockDatasets);
    vi.spyOn(aiEvaluationService, 'listRuns').mockResolvedValue(mockRuns);
    vi.spyOn(aiEvaluationService, 'getRunDetails').mockResolvedValue(mockRuns[0]);
    vi.spyOn(aiEvaluationService, 'getRunResults').mockResolvedValue(mockResults);
    vi.spyOn(aiEvaluationService, 'compareRuns').mockResolvedValue(mockComparison);
    vi.spyOn(aiEvaluationService, 'startRun').mockResolvedValue(mockRuns[0]);
    vi.spyOn(aiEvaluationService, 'createDataset').mockResolvedValue(mockDatasets[0]);
  });

  it('renders AI Evaluation Control Plane with overview cards and benchmark datasets', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-1/ai-evaluation']}>
          <Routes>
            <Route
              path="/organizations/:organizationId/ai-evaluation"
              element={<AIEvaluationPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Header & description
    expect(
      screen.getByText(/AI Quality Evaluation & Benchmark Control Plane/i)
    ).toBeInTheDocument();

    // Datasets should load
    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Knowledge Benchmark')).toBeInTheDocument();
      expect(screen.getByText('Agent Tool Invocation Benchmark')).toBeInTheDocument();
    });

    // KPI Card presence
    expect(screen.getByText('Benchmark Datasets')).toBeInTheDocument();
    expect(screen.getByText('Evaluation Runs')).toBeInTheDocument();
  });

  it('triggers benchmark run execution from dataset table', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-1/ai-evaluation']}>
          <Routes>
            <Route
              path="/organizations/:organizationId/ai-evaluation"
              element={<AIEvaluationPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Knowledge Benchmark')).toBeInTheDocument();
    });

    // Find Run Benchmark buttons
    const runButtons = screen.getAllByRole('button', { name: /Run Benchmark/i });
    expect(runButtons.length).toBeGreaterThan(0);

    fireEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(aiEvaluationService.startRun).toHaveBeenCalledWith('org-1', {
        datasetId: 'ds-rag-01',
        modelProvider: 'mock',
        modelName: 'mock-evaluator',
        evaluatorMode: 'hybrid',
      });
    });
  });

  it('switches tabs and displays run comparison with score deltas', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-1/ai-evaluation']}>
          <Routes>
            <Route
              path="/organizations/:organizationId/ai-evaluation"
              element={<AIEvaluationPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Knowledge Benchmark')).toBeInTheDocument();
    });

    // Switch to Run Comparison tab
    const compareTab = screen.getByRole('button', { name: /Run Comparison & Regression/i });
    fireEvent.click(compareTab);

    // Comparison view should be mounted
    await waitFor(() => {
      expect(screen.getByText(/Benchmark Run Comparison & Regression Analysis/i)).toBeInTheDocument();
    });

    // Click Compare Runs
    const compareBtn = screen.getByRole('button', { name: /Compare Runs/i });
    fireEvent.click(compareBtn);

    await waitFor(() => {
      expect(aiEvaluationService.compareRuns).toHaveBeenCalled();
    });
  });

  it('renders EvaluationRunDetailPage with score breakdown and test sample results', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/organizations/org-1/ai-evaluation/runs/run-eval-101']}>
          <Routes>
            <Route
              path="/organizations/:organizationId/ai-evaluation/runs/:runId"
              element={<EvaluationRunDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for run details to load
    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Knowledge Benchmark')).toBeInTheDocument();
      expect(screen.getByText(/92.5%/i)).toBeInTheDocument();
    });

    // Verify sample results
    expect(screen.getByText('How do I request VPN access?')).toBeInTheDocument();
    expect(
      screen.getByText('What is the refund policy for annual enterprise plans?')
    ).toBeInTheDocument();

    // Verify model judge score chips
    expect(screen.getByText('Judge: 5/5')).toBeInTheDocument();
    expect(screen.getByText('Judge: 4/5')).toBeInTheDocument();

    // Expand first sample result
    const sampleItem = screen.getByText('How do I request VPN access?');
    fireEvent.click(sampleItem);

    // Should reveal judge notes and model output
    await waitFor(() => {
      expect(
        screen.getByText(/Answer is fully supported by documentation with zero hallucinations/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Submit an IT ticket via the self-service portal or email it@example.com/i)
      ).toBeInTheDocument();
    });
  });
});
