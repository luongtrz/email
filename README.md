# TLL Email Client - React SPA with Gmail Integration

A full-stack **React Email Client** application with **Gmail API integration** (Track A), implementing secure **OAuth 2.0 Authorization Code Flow**, automatic token refresh, and a responsive 3-column email dashboard.

> 📖 **Security Documentation**: See [SECURITY.md](./SECURITY.md) for comprehensive security analysis and token storage justification.

---

## 📑 Table of Contents

- [Demo](#-demo)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Google OAuth Setup](#google-oauth-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Deployed URLs](#-deployed-urls)
- [API Endpoints](#-api-endpoints)
- [Token Storage & Security](#-token-storage--security)
- [Concurrency & Token Refresh](#-concurrency--token-refresh)
- [Simulating Token Expiry](#-simulating-token-expiry)
- [Project Structure](#-project-structure)

---

## 🎬 Demo

> 📹 **Demo Video**: [Watch the 2-3 minute demo](./demo/demo-video.mp4) showing:
> - Login flow (email/password + Google OAuth)
> - Real Gmail inbox with messages
> - Email detail view with attachments
> - Reply/Send functionality
> - Token refresh demonstration

<!-- Replace with actual demo GIF/video link -->
![Demo GIF](./demo/demo.gif)

---

## 🎯 Features

### ✅ Authentication System
- **Email/Password Login** - Traditional authentication with bcrypt
- **Google OAuth 2.0** - Authorization Code Flow with backend token exchange
- **JWT Token Management** - Access tokens (1h) + Refresh tokens (7d)
- **Auto-refresh** - Seamless token renewal on expiry
- **Secure Logout** - Revokes Google tokens and clears all sessions

### ✅ Gmail Integration (Track A)
- **Real Gmail Data** - Inbox populated from actual Gmail account
- **Full Email Operations**:
  - 📥 Read emails with full content
  - 📤 Send new emails
  - ↩️ Reply to emails
  - ↪️ Forward emails
  - 📎 Download attachments
  - ⭐ Star/unstar emails
  - 📖 Mark as read/unread
  - 🗑️ Delete emails

### ✅ 3-Column Email Dashboard
- **Folder Navigation** (20%) - Inbox, Sent, Drafts, Trash with counts
- **Email List** (40%) - Paginated list with sender, subject, preview
- **Email Detail** (40%) - Full content with attachments and actions

### ✅ User Experience
- **Responsive Design** - Desktop (3 columns) → Mobile (stack navigation)
- **Keyboard Navigation** - Gmail-style shortcuts (j/k, r, f, e, s)
- **Search & Filter** - Real-time search across emails
- **Loading States** - Skeleton loaders and smooth transitions

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite + TypeScript)                 │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Auth Store │  │  API Client │  │  3-Column   │  │  Token Management   │ │
│  │  (Zustand)  │  │   (Axios)   │  │  Dashboard  │  │  (Concurrency Guard)│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │               │                │                    │             │
│         └───────────────┴────────────────┴────────────────────┘             │
│                                    │                                        │
│                    Authorization: Bearer <app_token>                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Backend (NestJS + TypeORM)                           │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Auth Module │  │Email Module │  │  Database   │  │  Google Token Svc   │ │
│  │ (JWT+OAuth) │  │ (Gmail API) │  │ (PostgreSQL)│  │  (Auto-refresh)     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                    │                                        │
│                    Google Access Token (server-side)                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Gmail REST API                                  │
│        messages.list  |  messages.get  |  messages.send  |  labels.list     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### OAuth 2.0 Authorization Code Flow

```
┌──────────┐                              ┌──────────┐                    ┌──────────┐
│ Frontend │                              │ Backend  │                    │  Google  │
└────┬─────┘                              └────┬─────┘                    └────┬─────┘
     │  1. Click "Sign in with Google"        │                               │
     │ ──────────────────────────────────────▶│                               │
     │                                        │                               │
     │  2. Return Google Auth URL             │                               │
     │ ◀──────────────────────────────────────│                               │
     │                                        │                               │
     │  3. Redirect to Google ────────────────────────────────────────────────▶
     │                                        │                               │
     │  4. User authorizes, Google redirects with code                        │
     │ ◀──────────────────────────────────────────────────────────────────────│
     │                                        │                               │
     │  5. Send code to backend               │                               │
     │ ──────────────────────────────────────▶│                               │
     │                                        │  6. Exchange code for tokens  │
     │                                        │ ─────────────────────────────▶│
     │                                        │                               │
     │                                        │  7. Access + Refresh tokens   │
     │                                        │ ◀─────────────────────────────│
     │                                        │                               │
     │  8. App JWT + HttpOnly cookie          │  (Google tokens stored in DB) │
     │ ◀──────────────────────────────────────│                               │
     │                                        │                               │
     │  9. Access inbox with real Gmail data  │                               │
     │ ═══════════════════════════════════════▶                               │
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| [React 18](https://react.dev/) | UI Framework |
| [Vite](https://vitejs.dev/) | Build tool |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [TailwindCSS](https://tailwindcss.com/) | Styling |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [Axios](https://axios-http.com/) | HTTP client |
| [React Router](https://reactrouter.com/) | Routing |

### Backend
| Technology | Purpose |
|------------|---------|
| [NestJS](https://nestjs.com/) | Node.js framework |
| [TypeORM](https://typeorm.io/) | ORM |
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [googleapis](https://www.npmjs.com/package/googleapis) | Gmail API client |
| [Passport](http://www.passportjs.org/) | Authentication |
| [JWT](https://jwt.io/) | Token management |
| [Docker](https://www.docker.com/) | Containerization |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Google Cloud Console](https://console.cloud.google.com/) account
- [pnpm](https://pnpm.io/) (for frontend) or npm

### Google OAuth Setup

1. **Create a project** in [Google Cloud Console](https://console.cloud.google.com/)

2. **Enable Gmail API**:
   - Go to **APIs & Services** > **Library**
   - Search "Gmail API" and enable it

3. **Configure OAuth Consent Screen**:
   - Navigate to **APIs & Services** > **OAuth consent screen**
   - Select **External** user type
   - Add required scopes:
     ```
     https://www.googleapis.com/auth/gmail.readonly
     https://www.googleapis.com/auth/gmail.modify
     https://www.googleapis.com/auth/gmail.send
     https://www.googleapis.com/auth/userinfo.email
     https://www.googleapis.com/auth/userinfo.profile
     ```
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
   - Save the **Client ID** and **Client Secret**

### Backend Setup

```bash
# Navigate to backend
cd TLL_backend

# Copy environment file
cp .env.example .env

# Configure .env with your values:
# - Database credentials
# - JWT secrets
# - Google OAuth credentials (from step above)

# Start database
docker compose -f docker-compose.local.yml up -d

# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start development server
npm run start:dev
```

Backend will be available at `http://localhost:3000`  
API docs at `http://localhost:3000/docs`

### Frontend Setup

```bash
# Navigate to frontend
cd TLL_frontend

# Copy environment file
cp .env.example .env

# Configure .env with backend URL

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Frontend will be available at `http://localhost:5173`

---

## 🌐 Deployed URLs

| Service | URL |
|---------|-----|
| **Frontend** | `https://your-frontend.vercel.app` |
| **Backend API** | `https://your-backend.render.com` |
| **API Documentation** | `https://your-backend.render.com/docs` |

> ⚠️ Update these URLs after deploying to Vercel/Render/Railway

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register with email/password |
| `POST` | `/api/auth/login` | Login with email/password |
| `GET` | `/api/auth/google/url` | Get Google OAuth URL |
| `GET` | `/api/auth/google/callback` | OAuth callback (code exchange) |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout and revoke tokens |

### Mailboxes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mailboxes` | Get all mailboxes with counts |
| `GET` | `/api/mailboxes/:id/emails` | Get emails in mailbox |

### Emails
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/emails/:id` | Get email detail |
| `POST` | `/api/emails/send` | Send new email |
| `POST` | `/api/emails/:id/reply` | Reply to email |
| `POST` | `/api/emails/:id/forward` | Forward email |
| `POST` | `/api/emails/:id/modify` | Mark read/star/archive |
| `GET` | `/api/attachments/:msgId/:attId` | Download attachment |

---

## 🔐 Token Storage & Security

### Storage Strategy

| Token | Location | Lifetime | Justification |
|-------|----------|----------|---------------|
| **App Access Token** | Frontend Memory | 1 hour | XSS-safe, cleared on tab close |
| **App Refresh Token** | HTTP-only Cookie | 7 days | Cannot be accessed via JavaScript |
| **Google Access Token** | Database | 1 hour | Frontend never sees Google tokens |
| **Google Refresh Token** | Database | Long-lived | Server-side only, revoked on logout |

### Why These Choices?

**HTTP-only Cookies for Refresh Token:**
- ✅ XSS Protection - JavaScript cannot access
- ✅ CSRF Protection - SameSite='lax' attribute
- ✅ Automatic - Sent with every request
- ✅ Server-controlled - Can invalidate anytime

**Memory for Access Token:**
- ✅ Short-lived - 1 hour expiry
- ✅ Tab isolation - Cleared when tab closes
- ✅ Fast access - No I/O overhead

**Server-side Google Tokens:**
- ✅ Never exposed to frontend
- ✅ Centralized refresh logic
- ✅ Proper revocation on logout

> 📖 See [SECURITY.md](./SECURITY.md) for detailed security analysis

---

## 🔄 Concurrency & Token Refresh

### The Problem
When access token expires, multiple simultaneous API calls all receive 401. Without protection, each would trigger a separate refresh request.

### The Solution
Frontend implements a **request queue** with concurrency guard:

```typescript
let isRefreshing = false;
let failedQueue: Array<{resolve, reject}> = [];

// Response interceptor
if (response.status === 401) {
  if (isRefreshing) {
    // Queue this request, don't trigger another refresh
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then(token => retryWithNewToken(token));
  }

  isRefreshing = true;
  
  try {
    const newToken = await refreshToken();
    processQueue(null, newToken); // Resolve all queued requests
    return retryOriginalRequest(newToken);
  } catch (error) {
    processQueue(error, null); // Reject all queued
    logout();
  } finally {
    isRefreshing = false;
  }
}
```

**Result:** Only ONE refresh call happens, all waiting requests retry with new token.

---

## ⏱ Simulating Token Expiry

### For Demo Purposes

#### Method 1: Short Token Lifetime
```bash
# In backend .env
JWT_EXPIRATION=30s
JWT_REFRESH_EXPIRATION=2m
```

#### Method 2: Invalidate in Database
```sql
-- Force Google token refresh
UPDATE users 
SET google_token_expiry = NOW() - INTERVAL '1 hour' 
WHERE email = 'test@gmail.com';
```

#### Method 3: Revoke via Google
1. Go to [Google Account Permissions](https://myaccount.google.com/permissions)
2. Remove "TLL Email Client"
3. Next API call will fail → user prompted to reconnect

### Expected Behaviors

| Scenario | Behavior |
|----------|----------|
| App access token expires | Auto-refresh, user unaware |
| App refresh token expires | Forced logout → login page |
| Google access token expires | Backend auto-refreshes |
| Google refresh token revoked | Error → "Reconnect Gmail" prompt |

---

## 📁 Project Structure

```
MailClient/
├── README.md                 # This file
├── REQUIREMENTS.md           # Project requirements
├── SECURITY.md               # Security documentation
│
├── TLL_backend/              # NestJS Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # Authentication + OAuth
│   │   │   └── emails/       # Gmail API integration
│   │   ├── database/
│   │   │   └── entities/     # User entity with tokens
│   │   └── config/           # App configuration
│   ├── docker-compose.*.yml  # Docker configs
│   └── README.md             # Backend-specific docs
│
├── TLL_frontend/             # React Frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── store/            # Zustand state
│   │   ├── services/         # API services
│   │   └── lib/axios.ts      # Token refresh logic
│   └── README.md             # Frontend-specific docs
│
└── demo/                     # Demo video/GIF
```

---

## 🧪 Testing

```bash
# Backend tests
cd TLL_backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage

# Frontend tests
cd TLL_frontend
pnpm test
```

---

## 📜 License

This project is [MIT](LICENSE) licensed.

---

## 👥 Team

- **TLL Team** - Full-stack development

---

## 🙏 Acknowledgments

- Course instructors for comprehensive requirements
- [NestJS](https://nestjs.com/) & [React](https://react.dev/) teams
- [Google Gmail API](https://developers.google.com/gmail/api) documentation
