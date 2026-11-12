export type PlatformRole = 'user' | 'platform_admin';
export type UserStatus = 'active' | 'suspended';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  platform_role: PlatformRole;
  status: UserStatus;
  email_verified_at: Date | null;
  password_changed_at: Date | null;
  last_login_at: Date | null;
  failed_login_attempts: number;
  created_at: Date;
  updated_at: Date;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface UserSessionEntity {
  id: string;
  user_id: string;
  token_hash: string;
  token_family_id: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by_session_id: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

export interface PasswordResetTokenEntity {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface EmailVerificationTokenEntity {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface JwtAccessPayload {
  sub: string;
  role: PlatformRole;
  jti: string;
  iat?: number;
  exp?: number;
  iss: string;
  aud: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  expiresIn: number;
}
