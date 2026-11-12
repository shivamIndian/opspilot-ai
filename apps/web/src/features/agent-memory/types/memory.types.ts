export type MemoryType = 'preference' | 'contextual_fact' | 'workflow_summary' | 'recurring_pattern';
export type MemoryStatus = 'active' | 'expired' | 'deleted';

export interface SafeAgentMemory {
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

export interface MemorySettings {
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

export interface MemoryFilterParams {
  memory_type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateMemoryInput {
  memory_type: MemoryType;
  category: string;
  title: string;
  content: string;
  importance_score?: number;
  source_type?: string;
  expires_at?: string | null;
}

export interface UpdateMemoryInput {
  category?: string;
  title?: string;
  content?: string;
  importance_score?: number;
  status?: MemoryStatus;
  expires_at?: string | null;
}

export interface UpdateMemorySettingsInput {
  memory_enabled?: boolean;
  memory_extraction_enabled?: boolean;
  episodic_memory_enabled?: boolean;
  retention_days?: number | null;
}
