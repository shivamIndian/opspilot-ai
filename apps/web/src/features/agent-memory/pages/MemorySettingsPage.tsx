import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Database, Sparkles, Sliders, Shield, RefreshCw } from 'lucide-react';
import { memoryService } from '../services/memory.service';
import type {
  SafeAgentMemory,
  MemorySettings,
  MemoryCandidateProposal,
  CreateMemoryInput,
  UpdateMemoryInput,
  UpdateMemorySettingsInput,
} from '../types/memory.types';
import { MemoryList } from '../components/MemoryList';
import { MemorySettingsPanel } from '../components/MemorySettingsPanel';
import { MemorySuggestionDialog } from '../components/MemorySuggestionDialog';
import { MemoryEditDialog } from '../components/MemoryEditDialog';
import { MemoryDeleteDialog } from '../components/MemoryDeleteDialog';

export const MemorySettingsPage: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();

  const [activeTab, setActiveTab] = useState<'memories' | 'suggestions' | 'settings'>('memories');
  const [memories, setMemories] = useState<SafeAgentMemory[]>([]);
  const [settings, setSettings] = useState<MemorySettings | null>(null);
  const [suggestions, setSuggestions] = useState<MemoryCandidateProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<SafeAgentMemory | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPurgeAll, setIsPurgeAll] = useState(false);

  const loadData = async () => {
    if (!organizationId) return;
    try {
      setIsLoading(true);
      const [memsRes, settsRes] = await Promise.all([
        memoryService.listMemories(organizationId),
        memoryService.getSettings(organizationId),
      ]);
      setMemories(memsRes.items);
      setSettings(settsRes);
    } catch (err) {
      console.error('Failed to load memory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const handleCreateOrUpdateMemory = async (input: CreateMemoryInput | UpdateMemoryInput) => {
    if (!organizationId) return;
    setIsSaving(true);
    try {
      if (selectedMemory) {
        const updated = await memoryService.updateMemory(organizationId, selectedMemory.id, input as UpdateMemoryInput);
        setMemories((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const created = await memoryService.createMemory(organizationId, input as CreateMemoryInput);
        setMemories((prev) => [created, ...prev]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemory = async () => {
    if (!organizationId) return;
    setIsSaving(true);
    try {
      if (isPurgeAll) {
        await memoryService.bulkPurgeMemories(organizationId);
        setMemories([]);
        setIsDeleteOpen(false);
      } else if (selectedMemory) {
        await memoryService.deleteMemory(organizationId, selectedMemory.id);
        setMemories((prev) => prev.filter((m) => m.id !== selectedMemory.id));
        setIsDeleteOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSettings = async (input: UpdateMemorySettingsInput) => {
    if (!organizationId) return;
    setIsSaving(true);
    try {
      const updated = await memoryService.updateSettings(organizationId, input);
      setSettings(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveSuggestion = async (candidate: MemoryCandidateProposal) => {
    if (!organizationId) return;
    setIsSaving(true);
    try {
      const created = await memoryService.createMemory(organizationId, {
        memory_type: candidate.memory_type,
        category: candidate.category,
        title: candidate.title,
        content: candidate.content,
        importance_score: candidate.importance_score,
        source_type: 'agent_proposed',
      });
      setMemories((prev) => [created, ...prev]);
      setSuggestions((prev) => prev.filter((s) => s.candidate_id !== candidate.candidate_id));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectSuggestion = (candidateId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.candidate_id !== candidateId));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Agent Memory & Context
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Shield className="w-3 h-3 mr-1" /> Tenant & User Isolated
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control long-term preferences, durable facts, and episodic memory retained by AI agents across your workflows.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('memories')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'memories'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Active Memories</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {memories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'suggestions'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Agent Suggestions</span>
          {suggestions.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold">
              {suggestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Privacy & Settings</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'memories' && (
        <MemoryList
          memories={memories}
          isLoading={isLoading}
          onAddClick={() => {
            setSelectedMemory(null);
            setIsEditOpen(true);
          }}
          onEdit={(mem) => {
            setSelectedMemory(mem);
            setIsEditOpen(true);
          }}
          onDelete={(mem) => {
            setSelectedMemory(mem);
            setIsPurgeAll(false);
            setIsDeleteOpen(true);
          }}
        />
      )}

      {activeTab === 'suggestions' && (
        <MemorySuggestionDialog
          candidates={suggestions}
          onApprove={handleApproveSuggestion}
          onReject={handleRejectSuggestion}
          isProcessing={isSaving}
        />
      )}

      {activeTab === 'settings' && settings && (
        <MemorySettingsPanel
          settings={settings}
          onUpdate={handleUpdateSettings}
          onPurgeAll={() => {
            setIsPurgeAll(true);
            setIsDeleteOpen(true);
          }}
          isSaving={isSaving}
        />
      )}

      {/* Edit/Create Modal */}
      <MemoryEditDialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedMemory(null);
        }}
        onSave={handleCreateOrUpdateMemory}
        editingMemory={selectedMemory}
        isSaving={isSaving}
      />

      {/* Delete/Purge Modal */}
      <MemoryDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedMemory(null);
          setIsPurgeAll(false);
        }}
        onConfirm={handleDeleteMemory}
        memory={selectedMemory}
        isPurgeAll={isPurgeAll}
        isDeleting={isSaving}
      />
    </div>
  );
};
