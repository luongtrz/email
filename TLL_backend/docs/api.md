# Gmail Email Dashboard API Documentation

## Overview
NestJS-based Email Dashboard API integrating **Gmail API** with OAuth2 authentication, providing real-time email management capabilities.

## Features
- 🔐 JWT Authentication with Cookie-based Sessions
- 📧 Gmail API Integration (OAuth2 Authorization Code Flow)
- 🔄 Automatic Token Refresh (Server-side)
- 📬 Email CRUD Operations (List, Read, Send, Modify)
- 📎 Attachment Support
- 🔍 Search & Filtering
- 📊 Pagination with nextPageToken
- 🛡️ Input Validation & Error Handling
- 📝 Swagger API Documentation

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns httpOnly cookies)
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get current user profile
- `POST /auth/logout` - User logout

### Google OAuth
- `GET /auth/google/url` - Get Google OAuth authorization URL
- `GET /auth/google/callback` - OAuth callback handler (exchange code for tokens)

### Email Management (Requires Gmail Authentication)
- `GET /emails/mailboxes` - Get all mailboxes with unread counts
- `GET /emails` - List emails with pagination & filters
- `GET /emails/folder/:folderId` - List emails by folder
- `GET /emails/:id` - Get email details with full content
- `POST /emails/send` - Send new email
- `PATCH /emails/:id/read` - Mark email as read/unread
- `PATCH /emails/:id/star` - Star/unstar email
- `PATCH /emails/:id/archive` - Archive email
- `DELETE /emails/:id` - Delete email (move to trash)
- `GET /emails/:id/attachments/:attachmentId` - Download attachment

## Authentication Flow

### 1. User Registration/Login
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

### 2. Gmail OAuth Flow
```bash
# Step 1: Get authorization URL
GET /auth/google/url

Response:
{
  "message": "Google OAuth URL generated",
  "code": 200,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}

# Step 2: User authorizes in browser, Google redirects to callback
# Backend handles callback automatically and stores tokens

# Step 3: Verify Gmail connection
GET /auth/profile

Response:
{
  "data": {
    "gmailAddress": "user@gmail.com",
    "googleTokenExpiry": "2025-12-03T12:00:00Z"
  }
}
```

### 3. Access Emails
All email endpoints require:
- Valid JWT token (from login)
- Google refresh token stored (from OAuth flow)

## Token Management

### Three-Token Architecture
1. **App Access Token** - Short-lived JWT (httpOnly cookie)
2. **App Refresh Token** - Long-lived JWT (httpOnly cookie)
3. **Google Refresh Token** - Stored in database, never exposed

### Cookie Settings
```typescript
{
  httpOnly: true,  // Prevent XSS
  secure: true,    // HTTPS only in production
  sameSite: 'lax', // CSRF protection
  maxAge: 7 days   // Refresh token validity
}
```

## Email API Examples

### List Emails with Pagination
```bash
GET /emails?page=1&limit=20&search=invoice

Response:
{
  "data": {
    "emails": [...],
    "pagination": {
      "total": 1789,
      "page": 1,
      "limit": 20,
      "totalPages": 90,
      "nextPageToken": "04324610207797567226"
    }
  }
}
```

### Get Email Detail
```bash
GET /emails/18f4c5e2f3a1b9c0

Response:
{
  "data": {
    "id": "18f4c5e2f3a1b9c0",
    "threadId": "18f4c5e2f3a1b9c0",
    "subject": "Invoice #12345",
    "from": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "body": "<html>...</html>",
    "date": "2025-12-03T10:00:00Z",
    "read": false,
    "starred": false,
    "attachments": [...]
  }
}
```

### Send Email
```bash
POST /emails/send
{
  "to": "recipient@example.com",
  "subject": "Meeting Tomorrow",
  "body": "Let's meet at 2pm",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}
```

## Response Format
All responses follow this structure:
```typescript
{
  message: string;
  code: number;
  data?: T;
  errors?: unknown;
  meta?: {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}
```

## Error Handling

### Common Error Codes
- `401` - Unauthorized (invalid JWT or Gmail not connected)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `422` - Validation error
- `500` - Internal server error

### Gmail-Specific Errors
```json
{
  "message": "Gmail account not connected",
  "code": 401,
  "errors": {
    "action": "Please complete OAuth flow at /auth/google/url"
  }
}
```

## Environment Variables
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=tll_db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.modify,https://www.googleapis.com/auth/gmail.send

# Frontend
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
```

## Testing
1. Start application: `npm run start:dev`
2. Visit Swagger docs: `http://localhost:3000/docs`
3. Register user → Login → Get Google OAuth URL → Authorize → Access emails

## Security Best Practices
- ✅ Google tokens stored server-side only
- ✅ HttpOnly cookies prevent XSS
- ✅ Auto-refresh tokens before expiry (5-min buffer)
- ✅ CORS configured for frontend domain
- ✅ Input validation with class-validator
- ✅ SQL injection prevention via TypeORM
