export type MemoryType = 'preference' | 'contextual_fact' | 'workflow_summary' | 'recurring_pattern';
export type MemoryStatus = 'active' | 'expired' | 'deleted';
export type MemorySourceType = 'user_explicit' | 'agent_proposed' | 'system_inferred';

export interface MemoryCandidateProposal {
  candidate_id: string;
  memory_type: MemoryType;
  category: string;
  title: string;
  content: string;
  importance_score: number;
  confidence: number;
  reasoning: string;
}

export interface MemoryCreateInput {
  memory_type: MemoryType;
  category: string;
  title: string;
  content: string;
  importance_score?: number;
  source_type?: string;
  source_reference?: string | null;
  expires_at?: string | null;
  consent_version?: string;
}

export interface MemoryUpdateInput {
  category?: string;
  title?: string;
  content?: string;
  importance_score?: number;
  status?: MemoryStatus;
  expires_at?: string | null;
}

export interface MemoryResponse {
  id: string;
  organization_id: string;
  user_id: string;
  memory_type: MemoryType;
  category: string;
  title: string;
  content: string;
  content_hash: string;
  importance_score: number;
  status: MemoryStatus;
  source_type?: string | null;
  source_reference?: string | null;
  consent_version: string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  deleted_at?: string | null;
}

export interface MemoryListResponse {
  items: MemoryResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemorySettingsResponse {
  id: string;
  organization_id: string;
  user_id: string;
  memory_enabled: boolean;
  memory_extraction_enabled: boolean;
  episodic_memory_enabled: boolean;
  retention_days?: number | null;
  consent_version: string;
  updated_at: string;
}

export interface MemorySettingsUpdateInput {
  memory_enabled?: boolean;
  memory_extraction_enabled?: boolean;
  episodic_memory_enabled?: boolean;
  retention_days?: number | null;
  consent_version?: string;
}

export interface MemorySearchResultItem {
  memory: MemoryResponse;
  score: number;
  citation_text: string;
}

export interface MemorySearchResponse {
  results: MemorySearchResultItem[];
  total: number;
  query: string;
}

export interface MemoryCandidateListResponse {
  candidates: MemoryCandidateProposal[];
  conversation_id: string;
  detected_count: number;
}
