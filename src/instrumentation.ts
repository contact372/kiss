import { register } from 'next/server';
import { configure } from '@genkit-ai/core';
import { vertexAI } from '@genkit-ai/vertexai';

export function register() {
  console.log('[INSTRUMENTATION] Configuring Genkit...');
  configure({
    plugins: [
      vertexAI({
        location: 'europe-west1',
      }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
  });
  console.log('[INSTRUMENTATION] Genkit configured.');
}
