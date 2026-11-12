export type PlatformRole = 'user' | 'platform_admin';
export type UserStatus = 'active' | 'suspended';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponseData {
  user?: SafeUser;
  accessToken: string;
  csrfToken: string;
  expiresIn: number;
}
