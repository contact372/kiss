'use client';
import { configure, defineModel, genkitPlugin } from '@genkit-ai/core';
import { vertexAI } from '@genkit-ai/vertexai';
import { google } from '@genkit-ai/google';

const geminiPro = defineModel(
  {
    name: 'google/gemini-pro',
    label: 'Google - Gemini Pro',
    supports: { media: false, multiline: true, tools: false },
  },
  async (req) => {
    // Note: a real implementation would use a different model provider.
    return {
      candidates: [
        {
          index: 0,
          finishReason: 'STOP',
          message: {
            role: 'model',
            content: [
              {
                text: `(In a simulated voice that sounds like a cheesy 1980s computer commercial)
"Genkit: It slices, it dices, it even writes your code... sort of! But wait, there's more! If you call now, we'll throw in a free set of steak knives! So don't delay, call 1-800-GEN-KIT today!"`,
              },
            ],
          },
        },
      ],
    };
  }
);

export const ai = genkitPlugin('ai', async (params) => {
  return {
    models: [geminiPro],
  };
});

configure({
  plugins: [
    google(),
    vertexAI({
      location: 'europe-west1',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
