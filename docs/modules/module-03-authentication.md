# Module 03: Authentication & Authorization

## 1. Overview
Module 03 implemented enterprise authentication, session management, and OWASP-compliant access controls.

## 2. Scope & Implementation
- **Password Security**: Argon2id hashing with constant-time verification (`@node-rs/argon2`).
- **Token Management**: Short-lived JWT access tokens (15m) and secure HTTP-only refresh cookies.
- **Session Rotation**: Token family tracking with reuse detection revoking the entire session chain.
- **Double-Submit CSRF**: Validation of `x-csrf-token` against `opspilot_csrf_token` cookie.
- **Email Verification & Password Reset**: Token generation with TTL expiration and SMTP / development email adapters.

## 3. Status
- **Status**: Complete (100% verified, 25 tests passing).
