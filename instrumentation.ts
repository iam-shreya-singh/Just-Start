// =============================================================================
// Next.js Instrumentation — Just Start (Phase 5)
// =============================================================================
// Runs once when the Next.js server starts (in production).
// Used for environment validation and startup diagnostics.
// =============================================================================

export async function register() {
  // Only run on the server (not during build or on client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv, logEnvSummary } = await import('@/lib/env');

    // Validate environment and log summary at startup
    const result = validateEnv();

    if (!result.valid) {
      console.error(
        '[Instrumentation] Environment validation failed!',
        '\n  Missing:', result.missing.join(', '),
        '\n  Invalid:', result.invalid.map((i) => `${i.name}: ${i.error}`).join('; ')
      );
    }

    if (result.productionWarnings.length > 0) {
      console.warn(
        '[Instrumentation] Production warnings:',
        result.productionWarnings.join(', ')
      );
    }

    // Log configuration summary (masks secrets)
    logEnvSummary();

    // Ensure Prisma client is generated
    try {
      const { db } = await import('@/lib/db');
      // Test connection
      await db.$queryRaw`SELECT 1`;
      console.log('[Instrumentation] Database connection OK');
    } catch (error) {
      console.warn(
        '[Instrumentation] Database connection failed — app will use fallbacks where possible:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
