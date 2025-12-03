# TLL Backend - Email Client API (Gmail Track A)

A production-ready **NestJS backend** for a React Email Client application implementing **Google OAuth 2.0 Authorization Code Flow** with secure token management, Gmail API integration, and comprehensive email operations.

> 📖 **Security Documentation**: See [SECURITY.md](../SECURITY.md) for comprehensive security analysis and token storage justification.

---

## 📑 Table of Contents

- [Features](#-features)
- [Technologies Used](#-technologies-used)
- [Architecture Overview](#-architecture-overview)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Google Cloud Setup](#google-cloud-setup)
  - [Local Development](#local-development)
  - [Production Deployment](#production-deployment)
- [API Endpoints](#-api-endpoints)
- [Token Storage & Security](#-token-storage--security)
- [Concurrency & Token Refresh](#-concurrency--token-refresh)
- [Simulating Token Expiry](#-simulating-token-expiry)
- [Environment Variables](#-environment-variables)
- [Deployed URLs](#-deployed-urls)

---

## 🎯 Features

### ✅ Authentication & OAuth 2.0
- **Email/Password Authentication** - Traditional login with bcrypt password hashing
- **Google OAuth 2.0 Authorization Code Flow** - Secure backend code exchange
- **JWT Token Management** - Access tokens (1h) + Refresh tokens (7d)
- **Token Rotation** - New refresh token issued on each refresh
- **HTTP-only Cookies** - Secure token storage

### ✅ Gmail API Integration (Track A)
- **Full Gmail Access** - Read, send, modify, and manage emails
- **Server-side Token Management** - Google refresh tokens stored securely in database
- **Automatic Token Refresh** - Seamless access token renewal
- **Token Revocation** - Proper cleanup on logout

### ✅ Email Operations
- **Mailbox Management** - List folders/labels with message counts
- **Email Listing** - Paginated email lists with filtering
- **Email Details** - Full message content with attachments
- **Send/Reply/Forward** - Complete email composition
- **Modify Actions** - Mark read/unread, star, archive, delete

### ✅ Security Features
- **Centralized Token Refresh** - Server-side Gmail token management
- **Secure Cookie Configuration** - HttpOnly, Secure, SameSite attributes
- **Google Token Revocation** - OAuth cleanup on logout
- **Input Validation** - class-validator with comprehensive DTOs

---

## 🛠 Technologies Used

| Technology | Purpose |
|------------|---------|
| [NestJS](https://nestjs.com/) | Progressive Node.js framework |
| [TypeORM](https://typeorm.io/) | TypeScript ORM |
| [PostgreSQL](https://www.postgresql.org/) | Relational database |
| [googleapis](https://www.npmjs.com/package/googleapis) | Official Google APIs client |
| [Passport](http://www.passportjs.org/) | Authentication middleware |
| [JWT](https://jwt.io/) | JSON Web Tokens |
| [Docker](https://www.docker.com/) | Containerization |
| [Swagger](https://swagger.io/) | API documentation |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React SPA)                            │
│  • Access Token in Memory    • Auto-refresh on 401    • Concurrency Guard   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Authorization: Bearer <app_token>
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Backend (NestJS)                                  │
│  ┌──────────────────┐    ┌───────────────────┐    ┌──────────────────────┐  │
│  │   Auth Module    │    │   Emails Module   │    │   Database (PG)      │  │
│  │                  │    │                   │    │                      │  │
│  │  • JWT Auth      │    │  • Gmail API Svc  │    │  • Users table       │  │
│  │  • Google OAuth  │───▶│  • Email Parser   │───▶│  • Refresh tokens    │  │
│  │  • Token Service │    │  • Mailbox Svc    │    │  • Google tokens     │  │
│  └──────────────────┘    └───────────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Access Token (auto-refreshed)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Gmail API                                       │
│  • messages.list    • messages.get    • messages.send    • messages.modify  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### OAuth 2.0 Authorization Code Flow

```
┌──────────┐     1. /auth/google/url     ┌──────────┐
│ Frontend │ ──────────────────────────▶ │ Backend  │
└──────────┘                             └──────────┘
     │                                        │
     │ ◀───────────────────────────────────────
     │       2. Google Auth URL               │
     │                                        │
     ▼  3. Redirect to Google                 │
┌──────────┐                                  │
│  Google  │                                  │
│  OAuth   │                                  │
└──────────┘                                  │
     │                                        │
     │ 4. Authorization Code                  │
     ▼                                        │
┌──────────┐  5. /auth/google/callback  ┌──────────┐
│ Frontend │ ────────────────────────▶  │ Backend  │
└──────────┘                            └──────────┘
                                             │
                                             │ 6. Exchange code for tokens
                                             ▼
                                       ┌──────────┐
                                       │  Google  │
                                       │ Token EP │
                                       └──────────┘
                                             │
     ◀─────────────────────────────────────────
     7. App JWT + HttpOnly cookies            │
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ 
- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Google Cloud Console](https://console.cloud.google.com/) account

### Google Cloud Setup

1. **Create a new project** in [Google Cloud Console](https://console.cloud.google.com/)

2. **Enable Gmail API**:
   - Navigate to **APIs & Services** > **Library**
   - Search for "Gmail API" and enable it

3. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services** > **OAuth consent screen**
   - Select **External** user type
   - Fill in app name, user support email, developer contact
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Add test users (your Gmail accounts)

4. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     http://localhost:3000
     https://your-frontend-domain.com
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/google/callback
     https://your-backend-domain.com/api/auth/google/callback
     ```
   - Copy the **Client ID** and **Client Secret**

5. **Important OAuth Settings**:
   - For development, add test users in OAuth consent screen
   - For production, verify your app domain and submit for verification

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/htloc0610/TLL_backend.git
   cd TLL_backend
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** (see [Environment Variables](#-environment-variables))

4. **Start the database**:
   ```bash
   docker compose -f docker-compose.local.yml up -d
   ```

5. **Install dependencies**:
   ```bash
   npm install
   ```

6. **Run database migrations**:
   ```bash
   npm run migration:run
   ```

7. **Start development server**:
   ```bash
   npm run start:dev
   ```

8. **Access the application**:
   - API: `http://localhost:3000`
   - Swagger Docs: `http://localhost:3000/docs`

### Production Deployment

1. **Clone and configure**:
   ```bash
   git clone https://github.com/htloc0610/TLL_backend.git
   cd TLL_backend
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Build and run with Docker**:
   ```bash
   docker compose -f docker-compose.production.yml up -d --build
   ```

3. **Run migrations**:
   ```bash
   npm install
   npm run migration:run
   ```

4. **Update Google Cloud Console**:
   - Add production domain to **Authorized JavaScript origins**
   - Add production callback URL to **Authorized redirect URIs**
   - Submit app for verification if needed

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user with email/password |
| `POST` | `/api/auth/login` | Login with email/password |
| `GET` | `/api/auth/google/url` | Get Google OAuth authorization URL |
| `GET` | `/api/auth/google/callback` | Handle OAuth callback, exchange code for tokens |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/profile` | Get current user profile |
| `POST` | `/api/auth/logout` | Logout and revoke tokens |

### Mailboxes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mailboxes` | Get all mailboxes with message counts |
| `GET` | `/api/mailboxes/:id/emails` | Get emails in a specific mailbox |

### Emails

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/emails/list` | Get all emails with filters |
| `GET` | `/api/emails/:id` | Get email detail by ID |
| `POST` | `/api/emails/send` | Send a new email |
| `POST` | `/api/emails/:id/reply` | Reply to an email |
| `POST` | `/api/emails/:id/forward` | Forward an email |
| `POST` | `/api/emails/:id/modify` | Modify email (read/unread, star, archive) |
| `DELETE` | `/api/emails/:id` | Delete email (move to trash) |

### Attachments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/attachments/:messageId/:attachmentId` | Download attachment |

---

## 🔐 Token Storage & Security

### Token Storage Strategy

| Token Type | Storage Location | Lifetime | Purpose |
|------------|------------------|----------|---------|
| **App Access Token** | Frontend Memory (Zustand) | 1 hour | API authentication |
| **App Refresh Token** | HTTP-only Cookie + DB (hashed) | 7 days | Token renewal |
| **Google Access Token** | Database (server-side only) | 1 hour | Gmail API calls |
| **Google Refresh Token** | Database (server-side only) | Long-lived | Renew Google access |

### Security Justification

**Why HTTP-only Cookies for Refresh Token?**
- ✅ **XSS Protection**: JavaScript cannot access HTTP-only cookies
- ✅ **CSRF Protection**: SameSite='lax' prevents cross-site requests
- ✅ **Automatic Transmission**: No manual header management
- ✅ **Server Control**: Can be invalidated server-side

**Why Memory for Access Token?**
- ✅ **Short Exposure**: Cleared on tab close
- ✅ **Fast Access**: No I/O operations
- ✅ **Limited Lifetime**: 1 hour expiry

**Why Server-side Google Tokens?**
- ✅ **Frontend Never Sees Google Tokens**: Prevents theft via XSS
- ✅ **Centralized Refresh**: Backend handles token renewal
- ✅ **Proper Revocation**: Backend can revoke on logout

### Token Flow

```
1. User logs in → Backend issues app JWT + sets HTTP-only refresh cookie
2. Frontend stores access token in memory
3. API requests include Bearer token in Authorization header
4. On 401 → Frontend calls /refresh → Backend validates cookie, issues new tokens
5. On logout → Backend revokes Google tokens, clears cookies, nullifies DB tokens
```

---

## 🔄 Concurrency & Token Refresh

### Server-side Google Token Refresh

The backend centralizes Google token refresh logic:

```typescript
// GoogleTokenService - Automatic token refresh
async getValidAccessToken(userId: string): Promise<string> {
  const user = await this.userRepository.findOne({ where: { id: userId } });
  
  // Check if token expired or expiring within 5 minutes
  const expiryBuffer = new Date(Date.now() + 5 * 60 * 1000);
  
  if (!user.googleTokenExpiry || user.googleTokenExpiry <= expiryBuffer) {
    // Refresh the token
    await this.refreshAccessToken(userId);
    const refreshedUser = await this.userRepository.findOne({ where: { id: userId } });
    return refreshedUser.googleAccessToken;
  }
  
  return user.googleAccessToken;
}
```

### Frontend Concurrency Guard

The frontend implements a request queue to prevent multiple simultaneous refresh calls:

```typescript
// Concurrency control - Only ONE refresh at a time
let isRefreshing = false;
let failedQueue: Array<{resolve, reject}> = [];

const processQueue = (error: AxiosError | null, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// In response interceptor
if (isRefreshing) {
  // Queue this request instead of making another refresh call
  return new Promise((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return apiClient(originalRequest);
  });
}

// Start refresh process
isRefreshing = true;
try {
  const newToken = await refreshTokenAPI();
  processQueue(null, newToken);
  return apiClient(originalRequest);
} catch (error) {
  processQueue(error, null);
  logout();
} finally {
  isRefreshing = false;
}
```

**Why This Matters:**
- Prevents token refresh race conditions
- Avoids duplicate refresh token usage (security risk)
- Ensures consistent authentication state

---

## ⏱ Simulating Token Expiry

### For Demo/Testing Purposes

#### Method 1: Short Token Lifetime

Set short expiry in `.env`:

```bash
JWT_EXPIRATION=30s      # 30 seconds instead of 1h
JWT_REFRESH_EXPIRATION=2m  # 2 minutes instead of 7d
```

#### Method 2: Manual Token Invalidation

1. **Invalidate Google Access Token**:
   ```sql
   UPDATE users 
   SET google_token_expiry = NOW() - INTERVAL '1 hour' 
   WHERE email = 'test@gmail.com';
   ```

2. **Observe**: Next Gmail API call will trigger automatic refresh

#### Method 3: Revoke via Google

1. Go to [Google Account Security](https://myaccount.google.com/permissions)
2. Find "TLL Email Client" and remove access
3. **Observe**: Next Gmail API call will fail, user redirected to reconnect

#### Expected Behaviors

| Scenario | Expected Behavior |
|----------|-------------------|
| App access token expires | Auto-refresh via refresh token, no user action |
| App refresh token expires | Forced logout, redirect to login |
| Google access token expires | Backend auto-refreshes, user unaware |
| Google refresh token revoked | Error shown, prompt to reconnect Gmail |

---

## 🔧 Environment Variables

```bash
# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=mailclient_db
DATABASE_SSL_ENABLED=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRATION=7d

# App
PORT=3000
NODE_ENV=development
API_PREFIX=api

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true
FRONTEND_URL=http://localhost:5173

# Swagger
SWAGGER_ENABLED=true
SWAGGER_TITLE=TLL Email Client API
SWAGGER_DESCRIPTION=Email Client Backend API Documentation
SWAGGER_VERSION=1.0

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/userinfo.profile
```

> ⚠️ **Never commit `.env` to version control!** Use environment variables in production.

---

## 🌐 Deployed URLs

| Service | URL |
|---------|-----|
| **Frontend** | `https://your-frontend-domain.vercel.app` |
| **Backend API** | `https://your-backend-domain.com` |
| **API Documentation** | `https://your-backend-domain.com/docs` |

> Update these URLs after deployment to Vercel/Render/Railway/etc.

---

## 📁 Project Structure

```
TLL_backend/
├── src/
│   ├── main.ts                      # Application entry point
│   ├── app.module.ts                # Root module
│   ├── common/                      # Shared utilities
│   │   ├── filters/                 # Exception filters
│   │   └── interceptors/            # Logging interceptors
│   ├── config/                      # Configuration
│   │   ├── app.config.ts            # App configuration
│   │   └── swagger.config.ts        # Swagger setup
│   ├── database/                    # Database layer
│   │   ├── entities/                # TypeORM entities
│   │   │   ├── user.entity.ts       # User with token fields
│   │   │   └── email.entity.ts      # Email cache (optional)
│   │   ├── data-source.ts           # TypeORM data source
│   │   └── typeorm-config.service.ts
│   ├── modules/
│   │   ├── auth/                    # Authentication module
│   │   │   ├── auth.controller.ts   # Auth endpoints
│   │   │   ├── auth.service.ts      # Auth business logic
│   │   │   ├── dto/                 # Data transfer objects
│   │   │   ├── guards/              # JWT guards
│   │   │   ├── strategies/          # Passport strategies
│   │   │   └── services/
│   │   │       └── google-token.service.ts  # Google OAuth handling
│   │   └── emails/                  # Email module
│   │       ├── emails.controller.ts # Email endpoints
│   │       ├── emails.service.ts    # Email business logic
│   │       ├── dto/                 # Email DTOs
│   │       ├── guards/              # Gmail auth guard
│   │       ├── interfaces/          # Email interfaces
│   │       └── services/
│   │           ├── gmail-api.service.ts    # Gmail API calls
│   │           └── gmail-parser.service.ts # Email parsing
│   └── utils/                       # Utility functions
├── test/                            # Test files
├── docker-compose.local.yml         # Local development
├── docker-compose.production.yml    # Production deployment
├── Dockerfile                       # Container definition
└── package.json                     # Dependencies
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 📚 Additional Documentation

- [API Documentation](./docs/api.md) - Detailed API reference
- [Setup Guide](./docs/setup.md) - Extended setup instructions
- [Deployment Guide](./docs/deployment.md) - Production deployment
- [Security Documentation](../SECURITY.md) - Security analysis

---

## 📜 License

This project is [MIT](LICENSE) licensed.

---

## 👥 Contributors

- **TLL Team** - Initial development

---

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) for the excellent framework
- [Google Gmail API](https://developers.google.com/gmail/api) for email integration
- Course instructors for the comprehensive requirements