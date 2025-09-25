import { configure } from '@genkit-ai/core';
import { vertexAI } from '@genkit-ai/vertexai';

// This file is executed once per server startup.
// We configure Genkit here.

console.log('[INSTRUMENTATION] Starting Genkit configuration...');

configure({
  plugins: [
    vertexAI({
      location: 'europe-west1',
    }),
  ],
  logLevel: 'debug',
  // Disable tracing and metrics to avoid issues with Next.js bundling.
  enableTracingAndMetrics: false,
});

console.log('[INSTRUMENTATION] Genkit configuration complete.');
