/**
 * MoveCare AI Frontend Configuration
 * Single source of truth for API base URL and client credentials.
 *
 * In production (Vercel build):
 * - Reads VITE_API_BASE_URL if configured.
 * - Defaults to https://movecare-ai-backend.onrender.com/api in production mode.
 *
 * In local development:
 * - Reads VITE_API_BASE_URL if configured in .env.
 * - Defaults to http://localhost:5000/api in development mode.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://movecare-ai-backend.onrender.com/api'
    : 'http://localhost:5000/api')

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
