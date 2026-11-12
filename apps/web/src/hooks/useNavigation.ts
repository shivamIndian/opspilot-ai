import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { NAVIGATION_CONFIG } from '@/navigation/navigation.config';
import type { NavigationSection, NavigationItem } from '@/types/navigation.types';

export const useNavigation = () => {
  const location = useLocation();
  const activeOrganization = useOrganizationStore(s => s.activeOrganization);

  const userRole = activeOrganization?.role;

  const filteredSections = useMemo((): NavigationSection[] => {
    if (!activeOrganization) return [];

    return NAVIGATION_CONFIG.map(section => {
      const items = section.items.filter(item => {
        // If roles are specified, check membership
        if (item.allowedRoles && userRole) {
          return item.allowedRoles.includes(userRole as any);
        }
        return true;
      });

      return {
        ...section,
        items,
      };
    }).filter(section => section.items.length > 0);
  }, [activeOrganization, userRole]);

  const isPathActive = (item: NavigationItem): boolean => {
    return item.pattern.test(location.pathname);
  };

  return {
    sections: filteredSections,
    activeOrganization,
    isPathActive,
    currentPath: location.pathname,
  };
};
