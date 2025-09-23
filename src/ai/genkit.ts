import { configure } from '@genkit-ai/core';
import { vertexAI } from '@genkit-ai/vertexai';

// This configures Genkit to use the Vertex AI plugin.
// All calls to 'generate' will now go through Vertex AI,
// using the project's billing and authentication.
configure({
  plugins: [
    vertexAI({
      location: 'europe-west1', // Your specified location
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
