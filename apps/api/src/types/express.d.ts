import type { PlatformRole } from '../modules/auth/types/auth.types.js';
import type { OrganizationContext } from '../modules/organizations/types/organization.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: PlatformRole;
      };
      organization?: OrganizationContext;
    }
  }
}

export {};
