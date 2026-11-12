import { useOrganizationStore } from '@/store/useOrganizationStore';

export const useOrganizations = () => {
  const {
    organizations,
    activeOrganization,
    isLoading,
    setActiveOrganization,
    fetchOrganizations,
    clearStore,
  } = useOrganizationStore();

  const isOwner = activeOrganization?.role === 'owner';
  const isAdmin = activeOrganization?.role === 'admin' || isOwner;
  const isMember = activeOrganization?.role === 'member';

  return {
    organizations,
    activeOrganization,
    isLoading,
    isOwner,
    isAdmin,
    isMember,
    setActiveOrganization,
    fetchOrganizations,
    clearStore,
  };
};
