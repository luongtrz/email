import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api',
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  },
  swagger: {
    enabled:
      process.env.SWAGGER_ENABLED === 'true' ||
      process.env.NODE_ENV !== 'production',
    title: process.env.SWAGGER_TITLE || 'TLL API',
    description:
      process.env.SWAGGER_DESCRIPTION || 'TLL Management API Documentation',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    tag: process.env.SWAGGER_TAG || 'tll-api',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
    scopes: process.env.GOOGLE_OAUTH_SCOPES?.split(',') || [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://mail.google.com/', // Full Gmail access (includes read, modify, send, and permanent delete)
    ],
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  },
}));
