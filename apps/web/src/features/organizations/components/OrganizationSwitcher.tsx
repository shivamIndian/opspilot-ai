import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Building2, ChevronDown, Check, Plus, Settings, Shield, UserCheck } from 'lucide-react';

export const OrganizationSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { organizations, activeOrganization, setActiveOrganization, fetchOrganizations } =
    useOrganizations();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (organizations.length === 0) {
      fetchOrganizations().catch(console.error);
    }
  }, [organizations.length, fetchOrganizations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (org: typeof activeOrganization) => {
    setActiveOrganization(org);
    setIsOpen(false);
    if (org) {
      navigate(`/organizations/${org.id}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
        title="Switch Organization"
      >
        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
        <span className="max-w-[120px] sm:max-w-[160px] truncate">
          {activeOrganization ? activeOrganization.name : 'Select Organization'}
        </span>
        {activeOrganization?.role && (
          <span
            className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold border ${
              activeOrganization.role === 'owner'
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                : activeOrganization.role === 'admin'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
            }`}
          >
            {activeOrganization.role}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Organizations
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 my-1">
            {organizations.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center">
                No organizations joined yet.
              </div>
            ) : (
              organizations.map(org => {
                const isSelected = activeOrganization?.id === org.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelect(org)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-medium">{org.name}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        {org.role === 'owner' ? (
                          <span className="text-amber-400 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> Owner
                          </span>
                        ) : org.role === 'admin' ? (
                          <span className="text-purple-400 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> Admin
                          </span>
                        ) : (
                          <span className="text-indigo-400 flex items-center gap-0.5">
                            <UserCheck className="w-2.5 h-2.5" /> Member
                          </span>
                        )}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-800 pt-1.5 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/organizations/new');
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create Organization</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/organizations');
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Manage Organizations</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
