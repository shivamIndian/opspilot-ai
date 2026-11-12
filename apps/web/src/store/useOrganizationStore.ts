import { create } from 'zustand';
import type { SafeOrganization } from '@/types/organization';
import { organizationService } from '@/services/organizationService';

interface OrganizationState {
  organizations: SafeOrganization[];
  activeOrganization: SafeOrganization | null;
  isLoading: boolean;
  setActiveOrganization: (org: SafeOrganization | null) => void;
  setOrganizations: (orgs: SafeOrganization[]) => void;
  fetchOrganizations: () => Promise<void>;
  clearStore: () => void;
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  organizations: [],
  activeOrganization: null,
  isLoading: false,

  setActiveOrganization: (org: SafeOrganization | null) => {
    set({ activeOrganization: org });
    if (org) {
      sessionStorage.setItem('opspilot_active_org_id', org.id);
    } else {
      sessionStorage.removeItem('opspilot_active_org_id');
    }
  },

  setOrganizations: (organizations: SafeOrganization[]) => {
    set({ organizations });
  },

  fetchOrganizations: async () => {
    set({ isLoading: true });
    try {
      const orgs = await organizationService.listOrganizations();
      set({ organizations: orgs });

      // Automatically restore active organization or select first
      const storedId = sessionStorage.getItem('opspilot_active_org_id');
      const found = orgs.find(o => o.id === storedId);

      if (found) {
        set({ activeOrganization: found });
      } else if (orgs.length > 0 && !get().activeOrganization) {
        set({ activeOrganization: orgs[0] });
        sessionStorage.setItem('opspilot_active_org_id', orgs[0].id);
      } else if (orgs.length === 0) {
        set({ activeOrganization: null });
        sessionStorage.removeItem('opspilot_active_org_id');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  clearStore: () => {
    set({
      organizations: [],
      activeOrganization: null,
      isLoading: false,
    });
    sessionStorage.removeItem('opspilot_active_org_id');
  },
}));
