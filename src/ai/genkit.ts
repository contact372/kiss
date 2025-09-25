import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This file configures Genkit.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  enableTracing: true,
  logLevel: 'debug',
});
