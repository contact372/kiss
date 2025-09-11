'use server';

// This file contains the server-side logic for interacting with the Pollo.ai API.

async function pollForVideo(taskId: string, apiKey: string): Promise<{ videoUrl?: string, error?: string }> {
    let attempts = 0;
    const maxAttempts = 90; // Poll for up to 3 minutes (90 * 2s)
    const interval = 2000; // 2 seconds
    console.log(`[POLLO_POLL_START] Starting polling for task ID: ${taskId}`);

    while (attempts < maxAttempts) {
        try {
            console.log(`[POLLO_POLL_ATTEMPT] Polling attempt ${attempts + 1}/${maxAttempts} for task: ${taskId}`);
            const statusResponse = await fetch(`https://api.pollo.ai/v1/task/${taskId}`, {
                method: 'GET',
                headers: { 'x-api-key': apiKey },
            });

            if (!statusResponse.ok) {
                const errorBody = await statusResponse.text();
                console.error(`[POLLO_POLL_ERROR] Polling failed with status ${statusResponse.status}:`, errorBody);
                return { error: `Polling failed with status: ${statusResponse.status}` };
            }

            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
                console.log('[POLLO_POLL_SUCCESS] Task completed!', statusData);
                return { videoUrl: statusData.output.video_url };
            } else if (statusData.status === 'failed') {
                 console.error('[POLLO_POLL_ERROR] Video generation failed on Pollo.ai:', statusData);
                return { error: 'Video generation failed on the provider.' };
            }
            // If status is 'processing' or 'pending', continue polling
             console.log(`[POLLO_POLL_STATUS] Task status is '${statusData.status}'. Continuing to poll.`);
        } catch (error) {
            console.error('[POLLO_POLL_ERROR] Unhandled exception during polling:', error);
            const message = error instanceof Error ? error.message : 'Unknown polling error';
            return { error: message };
        }

        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }

    console.warn(`[POLLO_POLL_WARN] Polling timed out for task ID: ${taskId}`);
    return { error: 'Video generation timed out.' };
}

export async function generateVideoServerSide(combinedImageUri: string): Promise<{ videoUrl?: string, error?: string }> {
  console.log('[POLLO_ACTION_START] generateVideoServerSide invoked.');
  const apiKey = process.env.POLLO_API_KEY;
  if (!apiKey) {
    console.error('[POLLO_ACTION_FATAL] POLLO_API_KEY environment variable is not set or not accessible.');
    return { error: 'API key is not configured on the server.' };
  }
   console.log('[POLLO_ACTION_LOG] POLLO_API_KEY found.');

  try {
    console.log('[POLLO_ACTION_LOG] Sending task creation request to Pollo.ai...');
    const startResponse = await fetch('https://api.pollo.ai/v1/run/kling', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt: 'make the two people in the image kiss passionately, 4k, cinematic, high quality',
        image_url: combinedImageUri,
        negative_prompt: 'ugly, disfigured, low quality, blurry',
        fps: 24,
        motion: 3,
      }),
    });

    if (!startResponse.ok) {
        const errorBody = await startResponse.text();
        console.error(`[POLLO_ACTION_ERROR] Failed to start task with status ${startResponse.status}:`, errorBody);
        return { error: `Failed to start video generation: ${startResponse.statusText}` };
    }
    
    const startData = await startResponse.json();
    const taskId = startData.task_id;

    if (!taskId) {
        console.error('[POLLO_ACTION_ERROR] Pollo.ai response did not include a task ID.');
        return { error: "Video provider did not return a task ID." };
    }
    console.log(`[POLLO_ACTION_LOG] Task created successfully with ID: ${taskId}.`);

    return await pollForVideo(taskId, apiKey);

  } catch (error) {
    console.error('[POLLO_ACTION_FATAL] Unhandled exception in generateVideoServerSide:', error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { error: message };
  }
}
