import React, { useState } from 'react';
import { Shield, Lock, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { MemorySettings, UpdateMemorySettingsInput } from '../types/memory.types';

interface MemorySettingsPanelProps {
  settings: MemorySettings;
  onUpdate: (input: UpdateMemorySettingsInput) => Promise<void>;
  onPurgeAll: () => void;
  isSaving: boolean;
}

export const MemorySettingsPanel: React.FC<MemorySettingsPanelProps> = ({
  settings,
  onUpdate,
  onPurgeAll,
  isSaving,
}) => {
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memory_enabled);
  const [extractionEnabled, setExtractionEnabled] = useState(settings.memory_extraction_enabled);
  const [episodicEnabled, setEpisodicEnabled] = useState(settings.episodic_memory_enabled);
  const [retentionDays, setRetentionDays] = useState<number | undefined>(
    settings.retention_days ?? undefined
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    await onUpdate({
      memory_enabled: memoryEnabled,
      memory_extraction_enabled: extractionEnabled,
      episodic_memory_enabled: episodicEnabled,
      retention_days: retentionDays ?? null,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Privacy Guarantee Banner */}
      <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg p-5 flex items-start gap-4">
        <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <h4 className="font-semibold text-indigo-950 dark:text-indigo-100 mb-1">
            Enterprise Privacy & Isolation Guarantee
          </h4>
          <p className="text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
            All agent memories are strictly partitioned to your individual user account within this
            organization. Administrators and other team members cannot inspect your personal
            memories. Furthermore, memory content is treated as advisory reference context only and
            never bypasses security permissions or approval policies.
          </p>
        </div>
      </div>

      {/* Consent & Feature Toggles */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm space-y-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
          Memory Consent & Preferences
        </h3>

        {/* Master Memory Enablement Toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Enable Long-Term Agent Memory</span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Allows OpsPilot AI agents to retrieve your approved preferences and contextual facts
              to personalize workflow recommendations.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={memoryEnabled}
            onClick={() => setMemoryEnabled(!memoryEnabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              memoryEnabled ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                memoryEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Candidate Extraction Toggle */}
        <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Proactive Memory Candidate Suggestions
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically identify durable preferences from multi-turn conversations and present
              them in the Suggestions tab for your explicit confirmation before persisting.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            disabled={!memoryEnabled}
            aria-checked={extractionEnabled}
            onClick={() => setExtractionEnabled(!extractionEnabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40 disabled:cursor-not-allowed ${
              extractionEnabled && memoryEnabled
                ? 'bg-primary-600'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                extractionEnabled && memoryEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Episodic Summary Toggle */}
        <div className="flex items-start justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Episodic Workflow Summarization
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Synthesize compact factual recaps of complex multi-step workflows to retain high-level
              continuity without storing raw conversational transcripts.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            disabled={!memoryEnabled}
            aria-checked={episodicEnabled}
            onClick={() => setEpisodicEnabled(!episodicEnabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40 disabled:cursor-not-allowed ${
              episodicEnabled && memoryEnabled
                ? 'bg-primary-600'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                episodicEnabled && memoryEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Retention Period Dropdown */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Memory Retention Window
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically expire memories that exceed the configured time limit.
            </p>
          </div>
          <select
            value={retentionDays ?? 'unlimited'}
            onChange={(e) => {
              const val = e.target.value;
              setRetentionDays(val === 'unlimited' ? undefined : Number(val));
            }}
            disabled={!memoryEnabled}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="unlimited">Indefinite (No automatic expiration)</option>
            <option value="30">30 Days</option>
            <option value="90">90 Days</option>
            <option value="180">180 Days</option>
            <option value="365">365 Days (1 Year)</option>
          </select>
        </div>

        {/* Save Settings Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Settings saved successfully
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Danger Zone: Bulk Purge */}
      <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Danger Zone: Purge All Memories
            </h4>
            <p className="text-xs text-rose-800/80 dark:text-rose-300 max-w-xl leading-relaxed">
              Permanently deletes all of your stored agent preferences, facts, and embeddings. This
              action cannot be undone and resets all context across your future conversations.
            </p>
          </div>
          <button
            onClick={onPurgeAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge All Memories
          </button>
        </div>
      </div>
    </div>
  );
};
