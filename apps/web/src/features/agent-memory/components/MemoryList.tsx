import React, { useState } from 'react';
import { Search, Plus, Filter, Database } from 'lucide-react';
import type { SafeAgentMemory } from '../types/memory.types';
import { MemoryCard } from './MemoryCard';

interface MemoryListProps {
  memories: SafeAgentMemory[];
  isLoading: boolean;
  onAddClick: () => void;
  onEdit: (memory: SafeAgentMemory) => void;
  onDelete: (memory: SafeAgentMemory) => void;
}

export const MemoryList: React.FC<MemoryListProps> = ({
  memories,
  isLoading,
  onAddClick,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredMemories = memories.filter((mem) => {
    const matchesSearch =
      mem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mem.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mem.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || mem.memory_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search preferences, facts, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="preference">Preferences</option>
              <option value="contextual_fact">Context Facts</option>
              <option value="workflow_summary">Workflow Summaries</option>
              <option value="recurring_pattern">Recurring Patterns</option>
            </select>
          </div>

          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Memory Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 rounded-lg bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : filteredMemories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map((mem) => (
            <MemoryCard
              key={mem.id}
              memory={mem}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <Database className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No memories found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {searchTerm || selectedType !== 'all'
              ? 'No memories match your filter criteria. Try adjusting your search query.'
              : 'You have not added any personal agent preferences or operational memories yet.'}
          </p>
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Memory Record
          </button>
        </div>
      )}
    </div>
  );
};
