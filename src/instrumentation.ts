
// src/instrumentation.ts
// This `register` function is executed by Next.js once on the server at startup.

export async function register() {
  console.log('[INSTRUMENTATION] Executing Genkit configuration...');
  try {
    // Use dynamic import to avoid static analysis issues during build.
    const { configure } = await import('@genkit-ai/core');
    const { vertexAI } = await import('@genkit-ai/vertexai');

    console.log('[INSTRUMENTATION] Attempting to configure Genkit...');
    
    configure({
      plugins: [
        vertexAI({
          location: 'europe-west1',
        }),
      ],
      logLevel: 'debug',
      // This is the critical part: disable tracing to prevent the 'stream' module error.
      enableTracingAndMetrics: false,
    });

    console.log('[INSTRUMENTATION] Genkit configured successfully.');

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[INSTRUMENTATION_ERROR] Failed to configure Genkit: ${errorMessage}`, e);
  }
}
