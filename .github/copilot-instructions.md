# TLL (Student360) - AI Coding Agent Instructions

## Project Overview
Full-stack email dashboard implementing **G04 Track A (Gmail API Integration)** with **NestJS backend** (TypeScript + TypeORM + PostgreSQL) and **React frontend** (Vite + TypeScript + TailwindCSS). Real Gmail data via OAuth2, server-side token management, backend proxy architecture.

**Status:** Backend ~95% complete. Frontend: Gmail-style UI with infinite scroll, resizable panels, bulk actions complete.

## Architecture & Critical Patterns

### Monorepo Structure
- `TLL_backend/` - NestJS API (port 3000), TypeORM, Gmail API proxy
- `TLL_frontend/` - React SPA (port 5173), Zustand state, Axios interceptors

### Three-Token Authentication (CRITICAL!)
1. **Google Tokens (Server-Only):**
   - `googleRefreshToken` → PostgreSQL only, never exposed to frontend
   - `googleAccessToken` → Cached with `googleTokenExpiry` (5-min buffer auto-refresh)
   - `GoogleTokenService.getValidAccessToken()` handles refresh logic

2. **App Tokens (Cookie-Based):**
   - Backend sets **httpOnly cookies** for access/refresh tokens
   - `JwtAuthGuard` reads cookies first, falls back to `Authorization` header
   - Frontend stores access token in **Zustand memory** (never persisted)

3. **OAuth2 Flow:**
   ```
   GET /auth/google/url → User authorizes → /auth/google/callback?code=...
   → GoogleTokenService.exchangeCodeForTokens() → Store in DB
   ```
   Scopes: `gmail.readonly`, `gmail.modify`, `gmail.send`

**Guard Pattern:** `@UseGuards(JwtAuthGuard, GmailAuthGuard)` on email endpoints

### Response Format Convention
All APIs use `responseHelper()` from `src/utils/helpers/response.helper.ts`:
```typescript
{ message: string, code: number, data?: T, errors?: unknown, meta?: IMeta }
```
Never return raw objects - always use `successResponse()` or `errorResponse()`.

### Gmail API Integration
- **Backend:** `GmailApiService` proxies all Gmail API calls with auto-refreshed tokens
- **Parser:** `GmailParserService` handles HTML/plain text + attachments
- **Pagination:** Backend returns `{ emails: [], pagination: { total, page, limit, totalPages, nextPageToken } }`
- **Frontend:** Load more pattern with `pagination.page + 1`, toast notifications for empty results

## Frontend UI Patterns (Recently Implemented)

### Gmail-Compact Design
- Single-line email rows: `Sender | Subject - Preview | Date` with truncation
- Resizable email list: 300-800px width, mouse drag divider
- Bulk actions: Centered bar with "X selected" + Mark Read/Delete/Clear buttons
- Mobile: Floating Compose button (bottom-right), sidebar overlay, Load More button

### State Management Critical Rules
- **Optimistic Updates:** Mark email as read immediately in UI, rollback on error
- **Loading States:** Use `<EmailListSkeleton />` with matching heights to prevent scroll jump
- **Pagination:** Simple pattern - always show "Load more" button, hide when no more emails
- **Dark Mode Emails:** Force override with `[&_*]:!text-gray-800 [&_*]:!bg-transparent` on email content

### Key Components
- `DashboardPage.tsx` - Main container, handles pagination state, resizable divider logic
- `EmailList.tsx` - Compact rows, checkbox on hover, Load More button at bottom
- `EmailDetail.tsx` - Email content with forced light colors for sender HTML
- `FolderList.tsx` - Centered Compose button with `flex flex-col items-center`

## Development Workflows

### Backend Setup
```bash
cd TLL_backend
cp .env.example .env  # DATABASE_*, JWT_*, GOOGLE_OAUTH_*
docker compose -f docker-compose.local.yml up -d
npm install && npm run migration:run
npm run start:dev  # Port 3000
```
**Dev Note:** Comment `@UseGuards(StackAuthGuard)` for Swagger UI at `/docs`

### Frontend Setup
```bash
cd TLL_frontend
npm install && npm run dev  # Port 5173
```
Env: `VITE_API_BASE_URL=http://localhost:3000`, `VITE_GOOGLE_CLIENT_ID=...`

### Database Migrations
```bash
npm run migration:generate -- src/database/migrations/Name  # Auto-detect changes
npm run migration:run     # Apply pending
npm run migration:revert  # Rollback last
```
**Important:** Auto-sync enabled in dev (`synchronize: true`), disabled in production

## Common Pitfalls & Solutions

1. **401 on email endpoints:** User must complete OAuth flow first (`/auth/google/url`)
2. **Infinite scroll not working:** Use simple `pagination.page + 1`, check `onLoadMore` prop passed to both desktop/mobile `<EmailList>`
3. **Email content colors broken:** Apply `[&_*]:!text-gray-800` to force light mode
4. **Token refresh loop:** Axios interceptor uses `_retry` flag to prevent duplicate refreshes
5. **Gmail API errors:** Verify `GOOGLE_OAUTH_SCOPES` in backend `.env`
6. **Missing migrations:** Run `migration:run` after pulling, check `migrations` table
7. **Resizable divider jank:** Use `cursor-col-resize select-none` on parent during drag
8. **Load more shows "No more" too early:** Check logic uses `pagination.page < totalPages`, not email count

## Project Conventions

### File Naming
- Backend: `*.entity.ts`, `*.dto.ts`, `*.service.ts`, `*.controller.ts`, `*.guard.ts`
- Frontend: Components `PascalCase.tsx`, services/stores `lowercase.ts`
- DTOs use `class-validator`, extend `@nestjs/mapped-types` for partials

### NestJS Patterns
- Public routes: `@Public()` decorator (bypasses JWT guard)
- Global filters: `HttpExceptionFilter` handles all errors
- Swagger: Auto-docs at `/docs` with `@nestjs/swagger` decorators

### Frontend Patterns
- Zustand for auth state (memory only)
- Axios interceptors handle token refresh with request queue
- `react-hot-toast` for notifications (use `toast.success()`, `toast.error()`, `toast()` - no `toast.info`)
- Lucide React icons, TailwindCSS utilities

## When Adding Features

1. **New API endpoint:** DTO → Service → Controller → Swagger tags
2. **New UI component:** Match Gmail-compact style, add mobile responsive classes
3. **New auth guard:** Chain with `@UseGuards(JwtAuthGuard, YourGuard)`
4. **Frontend route:** Add to `App.tsx`, wrap in `<ProtectedRoute>` if needed

## External Dependencies
- **Gmail API:** `googleapis` package, OAuth2 client from Google Cloud Console
- **PostgreSQL 17:** Docker Alpine, managed by TypeORM
- **react-hot-toast:** Toast notifications (already imported in `DashboardPage.tsx`)
- **Lucide React:** Icon library for UI components
