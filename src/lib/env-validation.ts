/**
 * Environment variable validation utility
 * Validates required environment variables at startup
 * Provides clear error messages for missing variables
 */

const requiredEnvVars = [
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID',
    'NEXT_PUBLIC_APPWRITE_STORAGE_ID',
    'APPWRITE_API_KEY',
] as const;

const optionalEnvVars = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_APP_NAME',
    'SUPPORT_EMAIL',
] as const;

/**
 * Validate required environment variables
 * Throws error if any required variable is missing
 * Warns about missing optional variables
 */
export function validateEnv(): void {
    const missing: string[] = [];

    // Check required variables
    requiredEnvVars.forEach((envVar) => {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    });

    if (missing.length > 0) {
        throw new Error(
            `❌ Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
            'Please check your .env.local file and ensure all required variables are set.'
        );
    }

    // Warn about optional variables
    if (process.env.NODE_ENV === 'development') {
        optionalEnvVars.forEach((envVar) => {
            if (!process.env[envVar]) {
                console.warn(`⚠️  Optional environment variable not set: ${envVar}`);
            }
        });
    }

    if (process.env.NODE_ENV === 'development') {
        console.log('✅ Environment variables validated successfully');
    }
}

/**
 * Get environment variable with validation
 * Throws error if variable is not set
 */
export function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
}

/**
 * Get optional environment variable with default
 */
export function getOptionalEnv(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
}
