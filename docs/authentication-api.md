# OpsPilot AI — Authentication API Reference

Base URL: `http://localhost:4000/api/v1/auth`

All API responses follow the OpsPilot AI standard envelope format:

```json
{
  "success": true,
  "message": "Human readable status (optional)",
  "data": { ... }
}
```

Error envelopes:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_CONSTANT",
    "message": "Human-readable description",
    "details": { ... }
  }
}
```

---

## Endpoint Summary

| Method | Path                   | Auth Required?        | CSRF Header? | Description                                       |
| :----- | :--------------------- | :-------------------- | :----------- | :------------------------------------------------ |
| `POST` | `/register`            | No (Rate Limited)     | No           | Register a new user account                       |
| `POST` | `/login`               | No (Rate Limited)     | No           | Authenticate user and issue tokens                |
| `POST` | `/refresh`             | Cookie (`SameSite`)   | **Yes**      | Rotate refresh token and issue fresh access token |
| `POST` | `/logout`              | Cookie (`SameSite`)   | **Yes**      | Revoke current session and clear cookies          |
| `POST` | `/logout-all`          | Bearer JWT            | **Yes**      | Revoke all active sessions across all devices     |
| `GET`  | `/me`                  | Bearer JWT            | No           | Get current authenticated user profile            |
| `GET`  | `/admin/verify`        | Bearer (`admin` role) | No           | Verify platform administrator access privilege    |
| `POST` | `/forgot-password`     | No (Rate Limited)     | No           | Request password reset link                       |
| `POST` | `/reset-password`      | No (Rate Limited)     | No           | Reset password with one-time token                |
| `POST` | `/verify-email`        | No (Rate Limited)     | No           | Verify email address with one-time token          |
| `POST` | `/resend-verification` | No (Rate Limited)     | No           | Resend email verification link                    |

---

## 1. Register User

### `POST /api/v1/auth/register`

Creates a new user account with default `user` platform role and dispatches a verification email.

#### Request Body

| Field      | Type     | Required | Description                                                  |
| :--------- | :------- | :------- | :----------------------------------------------------------- |
| `name`     | `string` | Yes      | Full name (2–100 characters)                                 |
| `email`    | `string` | Yes      | Valid work email address                                     |
| `password` | `string` | Yes      | Strong password (min 12 chars, upper, lower, number, symbol) |

#### Example Request

```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grace Hopper",
    "email": "grace.hopper@company.com",
    "password": "SecurePassword123!@#"
  }'
```

#### Example Response (`201 Created`)

```json
{
  "success": true,
  "message": "Account registered successfully. A verification email has been dispatched.",
  "data": {
    "user": {
      "id": "c1f7b822-482d-4813-8d63-548d88e04e22",
      "name": "Grace Hopper",
      "email": "grace.hopper@company.com",
      "role": "user",
      "status": "active",
      "emailVerified": false,
      "createdAt": "2026-11-03T14:30:00.000Z"
    }
  }
}
```

---

## 2. User Login

### `POST /api/v1/auth/login`

Authenticates credentials using Argon2id, creates a session with a new token family, sets `opspilot_refresh_token` and `opspilot_csrf_token` cookies, and returns the short-lived in-memory access token.

#### Example Request

```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "grace.hopper@company.com",
    "password": "SecurePassword123!@#"
  }'
```

#### Example Response (`200 OK`)

Headers:

```http
Set-Cookie: opspilot_refresh_token=6f2a...; Path=/api/v1/auth; HttpOnly; SameSite=Strict
Set-Cookie: opspilot_csrf_token=9e4b...; Path=/; SameSite=Strict
```

Body:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c1f7b822-482d-4813-8d63-548d88e04e22",
      "name": "Grace Hopper",
      "email": "grace.hopper@company.com",
      "role": "user",
      "status": "active",
      "emailVerified": false,
      "createdAt": "2026-11-03T14:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "csrfToken": "9e4b1c2d3e4f...",
    "expiresIn": 900
  }
}
```

---

## 3. Silent Refresh & Rotation

### `POST /api/v1/auth/refresh`

Rotates the refresh token inside a database transaction, issues a new in-memory JWT, and updates the session cookies. Requires matching `X-CSRF-Token` header.

#### Example Request

```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt \
  -H "X-CSRF-Token: 9e4b1c2d3e4f..."
```

#### Example Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "csrfToken": "1a2b3c4d5e6f...",
    "expiresIn": 900
  }
}
```

#### Error Response: Reuse Detected (`401 Unauthorized`)

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_REUSE_DETECTED",
    "message": "Session compromised. All sessions in this token family have been revoked."
  }
}
```

---

## 4. User Logout

### `POST /api/v1/auth/logout`

Revokes the current session record and clears browser cookies.

```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -b cookies.txt \
  -c cookies.txt \
  -H "X-CSRF-Token: 9e4b1c2d3e4f..."
```

---

## 5. Logout From All Devices

### `POST /api/v1/auth/logout-all`

Revokes all active sessions for the user across all browsers, mobile devices, and active clients.

```bash
curl -X POST http://localhost:4000/api/v1/auth/logout-all \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -b cookies.txt \
  -H "X-CSRF-Token: 9e4b1c2d3e4f..."
```

---

## 6. Current User Profile

### `GET /api/v1/auth/me`

Returns the profile of the currently authenticated subject.

```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Example Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c1f7b822-482d-4813-8d63-548d88e04e22",
      "name": "Grace Hopper",
      "email": "grace.hopper@company.com",
      "role": "user",
      "status": "active",
      "emailVerified": true,
      "createdAt": "2026-11-03T14:30:00.000Z"
    }
  }
}
```

---

## 7. Password Recovery Flow

### `POST /api/v1/auth/forgot-password`

```bash
curl -X POST http://localhost:4000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "grace.hopper@company.com" }'
```

### `POST /api/v1/auth/reset-password`

```bash
curl -X POST http://localhost:4000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "newPassword": "NewStrongPassword456!@#"
  }'
```

---

## 8. Email Verification Flow

### `POST /api/v1/auth/verify-email`

```bash
curl -X POST http://localhost:4000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{ "token": "v7w8x9y0z1..." }'
```

### `POST /api/v1/auth/resend-verification`

```bash
curl -X POST http://localhost:4000/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{ "email": "grace.hopper@company.com" }'
```
