import {genkit} from 'genkit';
// import {googleAI} from '@genkit-ai/googleai'; // Switched to Vertex AI
import {vertexAI} from '@genkit-ai/vertexai';

// This file configures Genkit to use Vertex AI.
export const ai = genkit({
  plugins: [
    // googleAI(), // Old plugin for Google AI Studio API
    vertexAI(),   // New plugin for Vertex AI, gives access to Imagen
  ],
  enableTracing: true,
  logLevel: 'debug',
});
