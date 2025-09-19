'use server';
/**
 * @fileOverview Genkit configuration for the KI-SS AI Next.js application.
 * This file configures the AI/ML models and plugins used throughout the app.
 */

import { configureGenkit } from 'genkit';
import { firebase } from '@genkit-ai/firebase'; // Corrected import
import { nextjs } from '@genkit-ai/next';
import { vertexAI } from '@genkit-ai/vertexai';

// Initialize Genkit with necessary plugins
export const ai = configureGenkit({
  plugins: [
    // Firebase plugin for database and authentication integration
    firebase(),

    // Next.js plugin for server-side and client-side integration
    nextjs(),

    // Explicitly configure the Vertex AI plugin
    vertexAI({
      project: process.env.GCP_PROJECT_ID, // Your Google Cloud project ID
      location: 'us-central1', // The region where your models are deployed
    }),
  ],
  // Log to the console in development, and to Google Cloud Logging in production
  logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Enable OpenTelemetry for tracing in production
  enableTracingAndMetrics: process.env.NODE_ENV === 'production',
});
