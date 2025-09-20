import { z } from 'genkit';

// ===========================================================================
// Types for fuse-faces.ts
// ===========================================================================

export const FuseFacesInputSchema = z.object({
  image1Uri: z.string().describe("The first image, as a data URI."),
  image2Uri: z.string().describe("The second image, as a data URI."),
});
export type FuseFacesInput = z.infer<typeof FuseFacesInputSchema>;

export const FuseFacesOutputSchema = z.object({
  fusedImageUri: z.string().optional().describe("The generated image with both faces, as a data URI."),
  error: z.string().optional(),
});
export type FuseFacesOutput = z.infer<typeof FuseFacesOutputSchema>;


// ===========================================================================
// Types for generate-kiss-video.ts
// ===========================================================================

// The main input schema for the whole flow is the same as the fuse-faces input
export const GenerateKissVideoInputSchema = FuseFacesInputSchema;
export type GenerateKissVideoInput = z.infer<typeof GenerateKissVideoInputSchema>;

// The final output schema for the video generation flow
export const GenerateKissVideoOutputSchema = z.object({
  videoUri: z.string().optional().describe("The final generated video, as a data URI."),
  sourceImageUri: z.string().optional().describe("The intermediate fused image, for debugging or display."),
  error: z.string().optional(),
  taskId: z.string().optional().describe("The task ID from Pollo AI for video generation."),
  status: z.string().optional().describe("The status from Pollo AI for video generation."),
});
export type GenerateKissVideoOutput = z.infer<typeof GenerateKissVideoOutputSchema>;
