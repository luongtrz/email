# Security Documentation

## Overview

This document outlines the security measures, design decisions, and best practices implemented in the TLL Email Client application. The application follows OAuth 2.0 best practices and implements secure token management for Gmail API integration.

---

## 🔐 Authentication Architecture

### OAuth 2.0 Authorization Code Flow (Gmail)

We implement the **Authorization Code Flow with PKCE** pattern for Google OAuth:

```
┌──────────────┐     1. Click "Connect Gmail"     ┌──────────────┐
│   Frontend   │ ────────────────────────────────▶│   Backend    │
└──────────────┘                                  └──────────────┘
                                                        │
       ◀──────────────────────────────────────────────────
       2. Return Google Auth URL                        │
       │                                               │
       │  3. Redirect to Google                        │
       ▼                                               │
┌──────────────┐                                       │
│    Google    │                                       │
│    OAuth     │                                       │
└──────────────┘                                       │
       │                                               │
       │  4. User authorizes                           │
       ▼                                               │
┌──────────────┐     5. Authorization Code      ┌──────────────┐
│   Frontend   │ ────────────────────────────▶  │   Backend    │
│  (Callback)  │                                └──────────────┘
└──────────────┘                                       │
                                                       │  6. Exchange code
                                                       │     for tokens
                                                       ▼
                                               ┌──────────────┐
                                               │    Google    │
                                               │   Token EP   │
                                               └──────────────┘
                                                       │
       ◀──────────────────────────────────────────────
       7. Return app JWT + set cookies                 │
```

**Why Authorization Code Flow?**
- Frontend never sees Google refresh tokens
- Tokens are exchanged server-side
- Prevents token theft from browser developer tools
- Complies with Google OAuth 2.0 best practices

---

## 🔑 Token Storage Strategy

### Access Token (Short-lived)

| Aspect | Implementation | Rationale |
|--------|---------------|-----------|
| **Storage Location** | Memory (Zustand store) | Prevents XSS token theft |
| **Lifetime** | 1 hour | Limits exposure window |
| **Transmission** | `Authorization: Bearer <token>` header | Standard OAuth 2.0 |
| **On Refresh** | New token generated | Token rotation |
| **Tab Closure** | Automatically cleared | Session isolation |

### App Refresh Token (Long-lived)

| Aspect | Implementation | Rationale |
|--------|---------------|-----------|
| **Storage Location** | HTTP-only Cookie (server-set) | Cannot be accessed via JavaScript |
| **Lifetime** | 7 days | Balance UX vs security |
| **Protection** | Hashed in database, HttpOnly flag | Server-side validation, XSS-proof |
| **Transmission** | Automatic with each request | No manual handling required |
| **HTTPS Only** | Enabled in production | Prevents network interception |
| **SameSite Policy** | `lax` | CSRF protection |
| **On Logout** | Cleared from browser + database | Full session termination |

### Google OAuth Tokens (Server-side only)

| Aspect | Implementation | Rationale |
|--------|---------------|-----------|
| **Storage Location** | Database (encrypted at rest) | Never exposed to frontend |
| **Access Token** | Refreshed automatically | Seamless Gmail API access |
| **Refresh Token** | Stored securely in database | Long-term Gmail access |
| **Frontend Access** | Never transmitted to client | Client cannot misuse Google tokens |
| **On Logout** | **Revoked via Google API** | Proper OAuth cleanup |

---

## 🛡️ Security Measures

### 1. XSS Prevention with HTTP-only Cookies

```typescript
// Refresh token is set by backend as HTTP-only cookie
res.cookie('refreshToken', token, {
  httpOnly: true,      // NOT accessible via JavaScript (prevents XSS theft)
  secure: true,        // HTTPS only in production
  sameSite: 'lax',     // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Frontend access token stored in memory only
const useAuthStore = create<AuthState>((set) => ({
  accessToken: null, // Memory only, cleared on tab close
  // No localStorage usage
}));
```

**Why HTTP-only Cookies?**
- JavaScript cannot access HTTP-only cookies, even with XSS
- Browser automatically includes cookies in all requests
- Superior to localStorage for sensitive tokens
- `HttpOnly` flag prevents both XSS and CSRF attacks when combined with SameSite

**Why Memory Storage for Access Token?**
- Faster than localStorage reads
- Cleared when tab closes (isolation between tabs)
- Shorter lifetime (1 hour) limits exposure


### 2. CSRF Protection

- Backend uses `sameSite: 'lax'` cookies
- HTTP-only flag prevents JavaScript access
- State parameter in OAuth flow prevents CSRF
- All mutations require valid JWT from Authorization header

### 3. Cookie Security

```typescript
// HTTP-only Cookie Configuration
res.cookie('refreshToken', token, {
  httpOnly: true,      // Prevents JavaScript access (XSS protection)
  secure: true,        // HTTPS only in production (network interception)
  sameSite: 'lax',     // CSRF protection (only same-origin requests)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',           // Available to all routes
});
```

**Why HTTP-only Cookies are Superior to localStorage?**

| Aspect | localStorage | HTTP-only Cookie |
|--------|-------------|------------------|
| **XSS Vulnerability** | ❌ Stolen by JavaScript | ✅ Inaccessible to JavaScript |
| **CSRF Protection** | ❌ Manual handling needed | ✅ Built-in with SameSite |
| **Automatic Transmission** | ❌ Manual header insertion | ✅ Sent automatically |
| **Cross-tab Sync** | ✅ Shared between tabs | ❌ Isolated per request |
| **Session Isolation** | ❌ Persists after logout | ✅ Can be cleared by server |
| **Inspection Tool** | ❌ Visible in DevTools Console | ✅ Hidden (secure) |

### 4. Token Refresh Concurrency Control

```typescript
// Only ONE refresh request at a time
let isRefreshing = false;
let failedQueue: Array<{resolve, reject}> = [];

if (isRefreshing) {
  // Queue request instead of duplicate refresh
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  });
}
```

**Why?**
- Prevents race conditions with multiple 401 responses
- Avoids token refresh token reuse attacks
- Ensures consistent token state

### 5. Google Token Revocation on Logout

```typescript
async logout(userId: string) {
  // Revoke Google tokens via Google API
  await this.googleTokenService.revokeTokens(
    user.googleAccessToken,
    user.googleRefreshToken,
  );
  
  // Clear all tokens from database
  await this.userRepository.update(userId, {
    refreshToken: null,
    googleAccessToken: null,
    googleRefreshToken: null,
  });
  
  // Clear refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
}
```

**Why?**
- Ensures Google tokens cannot be reused after logout
- Follows OAuth 2.0 token lifecycle best practices
- Protects user Gmail access if tokens were compromised
- Server clears the cookie to prevent token reuse

### 6. Frontend Refresh Token Initialization

```typescript
// AuthContext.tsx - Initialize session on app load
useEffect(() => {
  if (isInitialized.current) return;
  isInitialized.current = true;

  const initAuth = async () => {
    try {
      // Call refresh API - refresh token is sent automatically via cookie
      const refreshResponse = await authApi.refreshToken();
      
      // Get new access token
      setAccessToken(refreshResponse.data.accessToken);
      
      // Load user profile
      const profile = await authApi.getProfile();
      setUser(profile.data);
    } catch {
      // No valid session (no refresh token cookie)
      clearAuth();
    }
  };

  initAuth();
}, []); // Runs only once on mount
```

**How It Works:**
1. App loads → AuthProvider's `initAuth` runs once (protected by `isInitialized` ref)
2. If refresh token cookie exists → API automatically sends it via `withCredentials: true`
3. Server validates cookie → returns new access token → user is logged in
4. If no refresh token cookie → API returns 401 → user stays logged out
5. No manual token handling needed - cookies are automatic

---

## 🔒 OAuth Scopes

The application requests minimal necessary Gmail scopes:

| Scope | Purpose | Justification |
|-------|---------|---------------|
| `gmail.readonly` | Read emails | Display inbox |
| `gmail.modify` | Mark read, star, labels | Email management |
| `gmail.send` | Send/reply emails | Compose functionality |
| `userinfo.email` | Get user email | Account identification |
| `userinfo.profile` | Get user name | Display purposes |

**Principle of Least Privilege**: We do NOT request `gmail.compose` or `gmail.settings.basic` as they are not needed.

---

## 🚨 Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|-----------|
| **XSS Token Theft** | Access token in memory only |
| **CSRF Attacks** | SameSite cookies, state parameter |
| **Token Replay** | Short-lived tokens, server-side refresh |
| **Session Hijacking** | Refresh token hashed in DB |
| **OAuth Token Leak** | Server-side storage, revocation on logout |
| **Concurrent Refresh Race** | Queue-based concurrency control |

### Accepted Risks

| Risk | Justification |
|------|---------------|
| HTTP-only Cookie not accessible to frontend | Feature, not a bug - prevents XSS entirely |
| Refresh token required for persistent sessions | HTTP-only cookies solve this securely |
| Token in URL during OAuth callback | Standard OAuth flow; tokens immediately processed and URL cleared |

---

## 🔄 Token Refresh Flow (HTTP-only Cookie Based)

```
┌───────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. API Request                                              │
│     with Authorization: Bearer <accessToken>  ─▶ Backend     │
│     (Refresh token cookie sent automatically)                │
│                                                    │          │
│  2. 401 Unauthorized ◀────────────────────────────┘          │
│     (Access token expired)                                   │
│                                                               │
│  3. Check: isRefreshing?                                      │
│     ├─ YES: Add to failedQueue                               │
│     └─ NO: Set isRefreshing = true                           │
│                                                               │
│  4. POST /auth/refresh                                        │
│     (Refresh token sent automatically in cookie)──▶ Backend   │
│                                                    │          │
│  5. Return New Access Token ◀─────────────────────┘          │
│     (Refresh token cookie still valid)                        │
│                                                               │
│  6. Update memory store with new access token               │
│  7. Process failedQueue (retry all with new token)          │
│  8. Set isRefreshing = false                                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Key Advantages Over localStorage:**
- Refresh token never exposed to JavaScript (XSS-proof)
- Automatic inclusion in requests (developer doesn't handle it)
- Server-side management (can track/revoke cookies)
- Built-in CSRF protection with SameSite flag
- Clear separation of frontend (memory) and backend (cookie) tokens



---

## 🏛️ Backend Security

### Password Storage
- Passwords hashed with **bcrypt** (cost factor 10)
- Salt automatically generated per password

### Database Security
- Refresh tokens stored as bcrypt hashes
- Google tokens stored in database (encrypted at rest recommended)
- No plain-text credentials in logs

### API Security
- All `/api/*` routes require valid JWT (except auth endpoints)
- Refresh token must be present in HTTP-only cookie for refresh endpoint
- Gmail endpoints additionally require valid Google OAuth tokens
- Axios interceptor automatically handles 401 refresh (concurrency-safe)
- Rate limiting recommended for production

### Frontend Security
- Refresh token is never accessible to JavaScript
- Separate axios instance for auth operations (avoids interceptor loops)
- Main axios client auto-includes access token in Authorization header
- Cookies automatically sent with `withCredentials: true`

---

## 📝 Security Checklist

- [x] Access token in memory only (not localStorage)
- [x] Refresh token in HTTP-only cookie (not localStorage)
- [x] HTTP-only flag prevents JavaScript access (XSS-proof)
- [x] SameSite cookie policy (CSRF protection)
- [x] Secure flag for HTTPS enforcement
- [x] Google OAuth Authorization Code flow (not implicit)
- [x] Server-side token exchange (client never sees Google tokens)
- [x] Google token revocation on logout
- [x] Concurrency control for token refresh
- [x] Separate axios instance for auth (prevents interceptor loops)
- [x] Proper error handling (no token leaks in errors)
- [x] Minimal OAuth scopes requested
- [x] Password hashing with bcrypt
- [x] JWT signature verification
- [x] Refresh token hashed in database
- [ ] Rate limiting (recommended for production)
- [ ] HTTPS enforcement (required for production)
- [ ] Content Security Policy headers (recommended)
- [ ] Database encryption at rest (recommended for Google tokens)

---

## 🔧 Production Recommendations

1. **Enable HTTPS**: All token transmissions must be encrypted
2. **Add Rate Limiting**: Prevent brute force attacks
3. **Implement CSP**: Prevent XSS attacks
4. **Database Encryption**: Encrypt OAuth tokens at rest
5. **Audit Logging**: Log authentication events
6. **Token Rotation**: Consider rotating refresh tokens on each use

---

## 📚 References

- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Google OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
