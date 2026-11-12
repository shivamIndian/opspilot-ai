# Module 17: OpsPilot AI – Authentication UI Architecture & Integration

## 1. Overview & System Mission

Module 17 focuses on auditing, hardening, and polishing the enterprise **Authentication UI** for OpsPilot AI. Building on the React application foundation established in Module 16 and the authentication backend delivered in Module 03, Module 17 provides a modern, accessible, and secure user experience across all entry points:
- User Sign In (`/login`)
- Enterprise Account Registration (`/register`)
- Password Recovery Request (`/forgot-password`)
- Password Reset (`/reset-password`)
- Email Verification & Resend (`/verify-email`)
- Session Restoration, Silent Refresh & Secure Logout

---

## 2. Implemented Authentication Flows & Routes

| Route | View Component | Guard | Description |
| :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | `PublicRoute` | Email + password entry, remember me toggle, 401/403/429 error mapping, redirect preservation. |
| `/register` | `RegisterPage` | `PublicRoute` | Full name, work email, 12-char passphrase, password strength meter, terms acceptance, duplicate email handling. |
| `/forgot-password` | `ForgotPasswordPage` | `PublicRoute` | Account recovery request. Implements generic success screen to prevent email enumeration. |
| `/reset-password` | `ResetPasswordPage` | `PublicRoute` | Token-based password reset, token validation, 12-char policy enforcement, expired/invalid token handling. |
| `/verify-email` | `VerifyEmailPage` | Public | Automatic token verification on mount, success confirmation, token expiration handling, resend verification email form. |
| `/dashboard`, `/organizations/*` | Protected Features | `ProtectedRoute` | Authenticated application views requiring a valid, active session. |

---

## 3. Backend API Contracts Consumed

All endpoints interface with the backend service at `/api/v1/auth`:

1. `POST /api/v1/auth/login`
   - **Payload**: `{ email: string, password: string, rememberMe?: boolean }`
   - **Response**: `{ user: SafeUser, accessToken: string, csrfToken: string, expiresIn: number }` + sets `HttpOnly` refresh cookie.
2. `POST /api/v1/auth/register`
   - **Payload**: `{ name: string, email: string, password: string }`
   - **Response**: `{ user: SafeUser }` + dispatches verification email.
3. `POST /api/v1/auth/refresh`
   - **Headers**: `X-CSRF-Token: <token>`
   - **Cookies**: `opspilot_refresh_token: <cookie>`
   - **Response**: `{ accessToken: string, csrfToken: string, expiresIn: number }`
4. `POST /api/v1/auth/logout`
   - **Headers**: `X-CSRF-Token: <token>`
   - **Action**: Revokes refresh token in database/Redis, clears `HttpOnly` and CSRF cookies.
5. `POST /api/v1/auth/forgot-password`
   - **Payload**: `{ email: string }`
   - **Response**: Generic confirmation message regardless of user existence.
6. `POST /api/v1/auth/reset-password`
   - **Payload**: `{ token: string, newPassword: string }`
   - **Response**: Password updated message or `EXPIRED_RESET_TOKEN` / `INVALID_RESET_TOKEN`.
7. `POST /api/v1/auth/verify-email`
   - **Payload**: `{ token: string }`
   - **Response**: Success or `EXPIRED_VERIFICATION_TOKEN` / `INVALID_VERIFICATION_TOKEN`.
8. `POST /api/v1/auth/resend-verification`
   - **Payload**: `{ email: string }`
   - **Response**: Generic dispatch confirmation.

---

## 4. Session Management, Silent Refresh & Logout Architecture

### In-Memory Access Token Principle
- Access tokens (`JWT`) reside strictly in-memory inside the Zustand `useAuthStore`.
- No tokens or credentials are ever stored in `localStorage` or `sessionStorage`.

### Refresh Storm Prevention & Concurrency Mutex
In `apps/web/src/services/api.ts`:
- An Axios response interceptor intercepts `401 Unauthorized` responses.
- When a `401` occurs, `isRefreshing` locks concurrent callers into a `failedQueue`.
- A single request to `POST /api/v1/auth/refresh` is dispatched with double-submit CSRF protection.
- Once the fresh token is acquired, queued requests are resolved with the refreshed token, completely eliminating race conditions.

### Comprehensive Logout Cleanup
When a user logs out (`logout()` or `clearAuth()`):
- Backend session is revoked.
- In-memory auth credentials in `useAuthStore` are cleared (`user: null`, `accessToken: null`, `isAuthenticated: false`).
- Active organization state in `useOrganizationStore` is purged (`clearStore()`).
- TanStack Query cache is purged (`queryClient.clear()`), ensuring zero stale customer data or tickets linger in browser memory.

---

## 5. UI/UX Design System & Reusable Components

The authentication experience leverages the design tokens established in Module 16 (`tokens.css`):
- **`AuthLayout`**: Responsive 2-column SaaS layout on desktop with enterprise capability showcase and security certifications; sleek single-column view on mobile.
- **`AuthCard`**: Elevated card container styled with tokens and subtle backdrop blur.
- **`AuthPageHeader`**: Centered header with icon badge, title, and descriptive subtitle.
- **`PasswordInput`**: Standardized input with eye/eye-off show/hide password toggle and ARIA labeling.
- **`PasswordStrengthIndicator`**: Real-time password evaluation against the backend 12-character minimum and character class complexity rules.

---

## 6. Security Considerations & Protections

1. **Anti-Enumeration Defense**: Forgot-password submission always returns a generic success confirmation to prevent attackers from querying valid email addresses.
2. **Double-Submit CSRF Protection**: All state-changing auth requests require the `X-CSRF-Token` header matching the readable cookie.
3. **No In-Browser Secret Storage**: Refresh tokens are stored exclusively in `HttpOnly`, `SameSite=Strict` cookies.
4. **Rate-Limit Resilience**: Client handles `429 Too Many Requests` responses with user-friendly retry guidance.
5. **No Token Leaks**: Reset and verification tokens are stripped from logs and telemetry.

---

## 7. Testing & Verification Summary

The authentication suite is validated by 22 dedicated test cases in `apps/web/tests/auth.test.tsx`:
- **Login**: Empty fields, format validation, valid auth, 401 invalid credentials, 403 suspension, 429 rate limit.
- **Registration**: Required fields, 12-char passphrase enforcement, confirmation mismatch, terms checkbox validation, 409 conflict.
- **Password Reset**: Generic submission, token extraction, 12-char password reset, expired/invalid token feedback.
- **Email Verification**: Automatic execution on mount, success screen, error state, resend dispatch.
- **Guards & Cleanup**: `PublicRoute` redirect, `ProtectedRoute` redirect, `clearAuth` memory cleanup.

**Monorepo Test Pass Rate**: 416/416 tests passing across Web (45), API (208), and AI Service (163).
