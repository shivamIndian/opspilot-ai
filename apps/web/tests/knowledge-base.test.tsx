import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KnowledgeBasePage } from '@/features/knowledge/pages/KnowledgeBasePage';
import { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage';
import { documentService } from '@/features/documents/services/document.service';
import { knowledgeSearchService } from '@/features/knowledge/services/knowledge-search.service';
import type { SafeDocument } from '@/types/document';
import type { KnowledgeSearchResponse } from '@/types/knowledge';

const mockDocuments: SafeDocument[] = [
  {
    id: 'doc-101',
    organizationId: 'org-1',
    uploadedByUserId: 'user-1',
    originalFilename: 'Deployment-Runbook-2026.pdf',
    displayName: 'Production Deployment Runbook',
    description: 'Standard operating procedure for zero-downtime production deployments.',
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    sizeBytes: 204800,
    sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'active',
    processingStatus: 'completed',
    processingGeneration: 1,
    processingPipelineVersion: 'v2.0.0',
    pageCount: 12,
    extractedCharCount: 45000,
    chunkCount: 24,
    processingErrorCode: null,
    processedAt: '2026-11-04T08:00:00.000Z',
    embeddingStatus: 'completed',
    embeddingGeneration: 1,
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
    embeddedChunkCount: 24,
    embeddingErrorCode: null,
    embeddedAt: '2026-11-04T08:01:00.000Z',
    createdAt: '2026-11-04T07:55:00.000Z',
    updatedAt: '2026-11-04T08:01:00.000Z',
    archivedAt: null,
    uploader: {
      id: 'user-1',
      name: 'DevOps Architect',
      email: 'devops@opspilot.internal',
    },
  },
  {
    id: 'doc-102',
    organizationId: 'org-1',
    uploadedByUserId: 'user-1',
    originalFilename: 'Database-Failover.md',
    displayName: 'Postgres Failover Manual',
    description: 'Emergency primary-replica failover steps.',
    fileExtension: 'md',
    mimeType: 'text/markdown',
    sizeBytes: 10240,
    sha256Checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    status: 'active',
    processingStatus: 'completed',
    processingGeneration: 1,
    processingPipelineVersion: 'v2.0.0',
    pageCount: 3,
    extractedCharCount: 8200,
    chunkCount: 6,
    processingErrorCode: null,
    processedAt: '2026-11-04T09:00:00.000Z',
    embeddingStatus: 'completed',
    embeddingGeneration: 1,
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
    embeddedChunkCount: 6,
    embeddingErrorCode: null,
    embeddedAt: '2026-11-04T09:00:30.000Z',
    createdAt: '2026-11-04T08:58:00.000Z',
    updatedAt: '2026-11-04T09:00:30.000Z',
    archivedAt: null,
    uploader: {
      id: 'user-1',
      name: 'DevOps Architect',
      email: 'devops@opspilot.internal',
    },
  },
];

const mockSearchResponse: KnowledgeSearchResponse = {
  organizationId: 'org-1',
  query: 'How to rollback production deploy',
  retrievalMode: 'hybrid',
  resultCount: 1,
  results: [
    {
      rank: 1,
      chunkId: 'chunk-1',
      documentId: 'doc-101',
      content: 'In case of severe deployment failure, trigger canary abort immediately.',
      score: 0.96,
      scoreType: 'rrf',
      retrievalMethod: 'hybrid',
      citation: {
        documentId: 'doc-101',
        documentName: 'Production Deployment Runbook',
        originalFilename: 'Deployment-Runbook-2026.pdf',
        fileExtension: 'pdf',
        chunkId: 'chunk-1',
        chunkIndex: 0,
        pageStart: 2,
        pageEnd: 2,
        sectionTitle: 'Emergency Procedures',
        charStart: 120,
        charEnd: 450,
      },
    },
  ],
  context: {
    passages: [
      {
        sourceNumber: 1,
        documentName: 'Production Deployment Runbook',
        originalFilename: 'Deployment-Runbook-2026.pdf',
        page: 2,
        section: 'Emergency Procedures',
        text: 'In case of severe deployment failure, trigger canary abort immediately.',
      },
    ],
    sourceCount: 1,
    totalChars: 72,
    trustNotice: 'Evidence grounded in verified documentation.',
  },
  diagnostics: {
    queryNormalized: 'rollback production deploy',
    embeddingSpace: 'openai:text-embedding-3-small:1536',
    semanticCandidates: 10,
    keywordCandidates: 5,
    combinedCandidates: 12,
    returnedResults: 1,
    embeddingDurationMs: 45,
    searchDurationMs: 18,
    totalDurationMs: 63,
  },
};

describe('Module 20 — Knowledge Base UI', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(documentService, 'listDocuments').mockResolvedValue({
      documents: mockDocuments,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    });

    vi.spyOn(documentService, 'getDocument').mockResolvedValue(mockDocuments[0]);
    vi.spyOn(documentService, 'downloadDocument').mockResolvedValue();
    vi.spyOn(documentService, 'archiveDocument').mockResolvedValue(mockDocuments[0]);
    vi.spyOn(documentService, 'restoreDocument').mockResolvedValue(mockDocuments[0]);
    vi.spyOn(documentService, 'reprocessDocument').mockResolvedValue({
      status: 'completed',
      generation: 2,
      pipelineVersion: 'v2.0.0',
      pageCount: 12,
      extractedCharCount: 45000,
      chunkCount: 24,
      processedAt: '2026-11-04T10:00:00.000Z',
      processingStartedAt: '2026-11-04T09:59:00.000Z',
      errorCode: null,
    });
    vi.spyOn(documentService, 'reprocessEmbeddings').mockResolvedValue({
      documentId: 'doc-101',
      status: 'completed',
      generation: 2,
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      embeddedChunkCount: 24,
      errorCode: null,
      startedAt: '2026-11-04T10:00:00.000Z',
      embeddedAt: '2026-11-04T10:01:00.000Z',
      updatedAt: '2026-11-04T10:01:00.000Z',
    });
    vi.spyOn(documentService, 'getProcessingStatus').mockResolvedValue({
      status: 'completed',
      generation: 1,
      pipelineVersion: 'v2.0.0',
      pageCount: 12,
      extractedCharCount: 45000,
      chunkCount: 24,
      processedAt: '2026-11-04T08:00:00.000Z',
      processingStartedAt: '2026-11-04T07:59:00.000Z',
      errorCode: null,
    });
    vi.spyOn(documentService, 'getEmbeddingStatus').mockResolvedValue({
      documentId: 'doc-101',
      status: 'completed',
      generation: 1,
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      embeddedChunkCount: 24,
      errorCode: null,
      startedAt: '2026-11-04T08:00:00.000Z',
      embeddedAt: '2026-11-04T08:01:00.000Z',
      updatedAt: '2026-11-04T08:01:00.000Z',
    });

    vi.spyOn(knowledgeSearchService, 'searchKnowledge').mockResolvedValue(mockSearchResponse);
  });

  const renderKnowledgeBase = (initialEntry = '/organizations/org-1/knowledge') =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/organizations/:organizationId/knowledge" element={<KnowledgeBasePage />} />
            <Route
              path="/organizations/:organizationId/knowledge/documents/:documentId"
              element={<DocumentDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders unified Knowledge Base hub with summary statistics and document catalog', async () => {
    renderKnowledgeBase();

    // Verify main header
    expect(screen.getByText('Enterprise Knowledge Base')).toBeInTheDocument();

    // Verify tab buttons are rendered
    expect(screen.getByText('Documents Catalog')).toBeInTheDocument();
    expect(screen.getByText('Semantic Search & Ask AI')).toBeInTheDocument();
    expect(screen.getByText('Vector Index & Health')).toBeInTheDocument();

    // Verify documents list items are loaded
    await waitFor(() => {
      expect(screen.getByText('Production Deployment Runbook')).toBeInTheDocument();
      expect(screen.getByText('Postgres Failover Manual')).toBeInTheDocument();
    });

    // Verify metrics bar
    expect(screen.getByText('Active in RAG')).toBeInTheDocument();
    expect(screen.getByText('Extracted Chunks')).toBeInTheDocument();
  });

  it('switches to Semantic Search & Ask AI tab and executes hybrid search', async () => {
    renderKnowledgeBase();

    // Switch to search tab
    fireEvent.click(screen.getByText('Semantic Search & Ask AI'));

    await waitFor(() => {
      expect(
        screen.getByText('Hybrid Vector Search & RAG Answer Engine')
      ).toBeInTheDocument();
    });

    // Search query input
    const searchInput = screen.getByPlaceholderText(/search company documents/i);
    fireEvent.change(searchInput, { target: { value: 'How to rollback production deploy' } });

    const searchButton = screen.getByRole('button', { name: /^Search$/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(knowledgeSearchService.searchKnowledge).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({
          query: 'How to rollback production deploy',
          retrievalMode: 'hybrid',
        })
      );
    });

    // Verify search result card is rendered
    await waitFor(() => {
      expect(
        screen.getByText(/In case of severe deployment failure, trigger canary abort immediately/i)
      ).toBeInTheDocument();
    });
  });

  it('switches to Vector Index & Health tab and displays pgvector diagnostics', async () => {
    renderKnowledgeBase();

    // Switch to health tab
    fireEvent.click(screen.getByText('Vector Index & Health'));

    await waitFor(() => {
      expect(screen.getByText('PostgreSQL pgvector')).toBeInTheDocument();
      expect(screen.getByText(/1,536-dim Cosine Distance/i)).toBeInTheDocument();
      expect(screen.getByText('Pipeline Ingestion')).toBeInTheDocument();
      expect(screen.getByText(/No Processing or Vector Index Issues/i)).toBeInTheDocument();
    });
  });

  it('opens Document Upload Dialog when Upload Document button is clicked', async () => {
    renderKnowledgeBase();

    const uploadButtons = screen.getAllByRole('button', { name: /Upload Document/i });
    fireEvent.click(uploadButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Select Document/i)).toBeInTheDocument();
      expect(screen.getByText(/Display Name \(Optional\)/i)).toBeInTheDocument();
    });
  });

  it('renders DocumentDetailPage with full specifications, checksum, and pipeline diagnostics', async () => {
    renderKnowledgeBase('/organizations/org-1/knowledge/documents/doc-101');

    await waitFor(() => {
      expect(screen.getAllByText('Production Deployment Runbook').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Deployment-Runbook-2026.pdf')).toBeInTheDocument();
    });

    // Verify SHA-256 fingerprint
    expect(screen.getByText(/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855/i)).toBeInTheDocument();

    // Verify pipeline panels
    expect(screen.getByText('AI Ingestion Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/Vector Embedding \(pgvector\)/i)).toBeInTheDocument();

    // Trigger download
    const downloadButton = screen.getByRole('button', { name: /^Download$/i });
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(documentService.downloadDocument).toHaveBeenCalledWith(
        'org-1',
        'doc-101',
        'Deployment-Runbook-2026.pdf'
      );
    });
  });
});
