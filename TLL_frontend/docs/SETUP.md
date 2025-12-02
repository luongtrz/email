# Frontend Setup Guide

## Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Backend API running on port 3000

## Installation

### 1. Clone and Install
```bash
cd TLL_frontend
npm install
```

### 2. Environment Configuration

Create `.env` file in `TLL_frontend/`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# Google OAuth (for OAuth button UI - optional)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Important:** The actual OAuth flow is handled by the backend. Frontend only needs `VITE_API_BASE_URL`.

### 3. Start Development Server
```bash
npm run dev
```

Application runs at `http://localhost:5173`

## Development Workflow

### Available Scripts
```bash
npm run dev          # Start Vite dev server with hot reload
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

### Project Commands
```bash
# Install new dependency
npm install package-name

# Remove dependency
npm uninstall package-name

# Update dependencies
npm update

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## First Time Setup Flow

### 1. Register User
```
http://localhost:5173/register
→ Email: user@example.com
→ Password: password123
→ Full Name: John Doe
```

### 2. Login
```
http://localhost:5173/login
→ Email: user@example.com
→ Password: password123
→ Auto-redirect to /inbox
```

### 3. Connect Gmail
```
Click "Connect Gmail" button
→ Opens Google OAuth consent screen
→ Authorize access
→ Backend stores tokens
→ Emails appear automatically
```

### 4. Verify Connection
Check browser DevTools:
- **Application → Cookies:** Should see httpOnly cookies
- **Network → XHR:** Check /auth/profile returns `gmailAddress`
- **Console:** Should NOT see "Gmail account not connected"

## Development Tips

### Hot Reload
Vite automatically reloads on file changes:
- `.tsx` files → Fast Refresh (preserves state)
- `.css` files → Instant HMR
- `.ts` files → Full reload

### Port Configuration
Change Vite port in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5173,  // Change this
    host: true   // Expose to network
  }
})
```

### Proxy API (Optional)
If CORS issues, proxy API in `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```
Then use `/api` in `VITE_API_BASE_URL`.

### TypeScript Checking
```bash
# Check types without building
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

## Troubleshooting

### Issue: "Network Error" on API calls
**Solution:**
1. Check backend is running on port 3000
2. Verify `VITE_API_BASE_URL` in `.env`
3. Check CORS settings in backend `.env`

### Issue: "Unauthorized 401" errors
**Solution:**
1. Login again (token may have expired)
2. Check cookies in DevTools → Application
3. Clear cookies and re-login

### Issue: "Gmail account not connected"
**Solution:**
1. Complete OAuth flow: `/auth/google/url`
2. Check backend logs for OAuth errors
3. Verify Google OAuth credentials in backend `.env`

### Issue: Hot reload not working
**Solution:**
```bash
rm -rf node_modules/.vite
npm run dev
```

### Issue: Build fails with TypeScript errors
**Solution:**
```bash
# Fix individual errors or temporarily:
npm run build -- --mode development
```

### Issue: Emails not loading after OAuth
**Solution:**
1. Check Network tab for /emails API call
2. Verify response has `emails` array
3. Check `pagination.total` > 0
4. Inspect backend Gmail API scopes

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Features
- ES2020 syntax
- CSS Grid & Flexbox
- localStorage API
- Fetch API
- WebSocket (for future real-time features)

## Production Build

### Build for Production
```bash
npm run build
```

Output in `dist/` directory:
```
dist/
├── assets/
│   ├── index-[hash].js    # Main bundle
│   ├── index-[hash].css   # Styles
│   └── vendor-[hash].js   # Dependencies
├── index.html
└── _redirects             # For SPA routing
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure environment variables in Vercel dashboard:
- `VITE_API_BASE_URL=https://your-backend.com`
- `VITE_GOOGLE_CLIENT_ID=...`

### Deploy to Netlify
```bash
# Build
npm run build

# Drag dist/ folder to Netlify dashboard
# Or use CLI:
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

## Environment Variables Reference

### Required
- `VITE_API_BASE_URL` - Backend API URL (e.g., `http://localhost:3000`)

### Optional
- `VITE_GOOGLE_CLIENT_ID` - For Google OAuth button UI

### Usage in Code
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Accessing env vars
console.log(import.meta.env.MODE);  // development | production
console.log(import.meta.env.DEV);   // boolean
console.log(import.meta.env.PROD);  // boolean
```

## Code Style Guide

### Import Order
```typescript
// 1. React & external libraries
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal modules
import { useAuth } from '../contexts/AuthContext';
import { emailService } from '../services/email.service';

// 3. Components
import { EmailList } from '../components/email/EmailList';

// 4. Types
import type { Email } from '../types/email.types';
```

### Naming Conventions
- Components: `PascalCase.tsx`
- Services: `lowercase.service.ts`
- Hooks: `use` prefix (e.g., `useAuth`)
- Constants: `UPPER_SNAKE_CASE`
- Functions: `camelCase`

### File Organization
```typescript
// Component structure
import statements
interface definitions
component function
helper functions
export
```

## Testing Setup (Future)

### Install Testing Libraries
```bash
npm install -D @testing-library/react @testing-library/jest-dom vitest
```

### Run Tests
```bash
npm run test          # Run once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Getting Help

- **Backend API Docs:** http://localhost:3000/docs
- **React DevTools:** Install browser extension
- **Vite Docs:** https://vitejs.dev
- **TailwindCSS:** https://tailwindcss.com/docs
