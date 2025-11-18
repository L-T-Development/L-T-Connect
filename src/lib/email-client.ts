import 'server-only';
import { Resend } from 'resend';

/**
 * Resend email client initialization
 * Make sure RESEND_API_KEY is set in .env.local
 * 
 * IMPORTANT: This module should ONLY be imported in server-side code
 * (API routes, Server Actions, etc.), never in client components or hooks.
 * The 'server-only' import ensures this at build time.
 */

if (!process.env.RESEND_API_KEY) {
  throw new Error('⚠️ RESEND_API_KEY is not set in .env.local');
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error('⚠️ RESEND_FROM_EMAIL is not set in .env.local');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Default sender email
 * Read directly from environment variables
 */
export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

/**
 * App configuration for emails
 */
export const EMAIL_CONFIG = {
  appName: process.env.NEXT_PUBLIC_APP_NAME!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  supportEmail: process.env.SUPPORT_EMAIL!,
};
