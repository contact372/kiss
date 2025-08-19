import admin from 'firebase-admin';
import fetch from 'node-fetch';

// --- CONFIGURATION ---
const POLLING_INTERVAL_MS = 5000; // 5 seconds
const POLLO_API_KEY = process.env.POLLO_API_KEY;
const POLLO_BASE_URL = 'https://pollo.ai/api/platform/generation';

if (!POLLO_API_KEY) {
    console.error("FATAL: POLLO_API_KEY environment variable is not set.");
    process.exit(1);
}

// --- FIREBASE INITIALIZATION ---
// Dans un environnement Google Cloud (comme Cloud Run), initializeApp()
// découvre automatiquement les identifiants du projet et s'authentifie.
// Plus besoin de fichier de clé de service !
admin.initializeApp();

const db = admin.firestore();
console.log("Firebase Admin SDK initialized. Worker started in Google Cloud environment.");


async function decrementUserCredits(userId, taskId) {
    const userRef = db.collection('users').doc(userId);
    const taskRef = db.collection('videoTasks').doc(taskId);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User profile does not exist.");
            }

            const currentCredits = userDoc.data().credits || 0;
            if (currentCredits <= 0) {
                // Also ensure their subscription status is marked as false if they have no credits.
                transaction.update(userRef, { isSubscribed: false });
                throw new Error("User has no credits to start generation.");
            }

            // Decrement credits and update the user doc
            transaction.update(userRef, { credits: admin.firestore.FieldValue.increment(-1) });
            // Mark the task as processing since credits were successfully debited
            transaction.update(taskRef, { status: 'processing', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
        console.log(`[CREDIT_SUCCESS] Successfully decremented credits for user ${userId} for task ${taskId}.`);
        return { success: true };
    } catch (error) {
        console.error(`[CREDIT_FAILURE] Failed to decrement credits for user ${userId} for task ${taskId}:`, error.message);
        // Mark the task as failed because credits could not be processed.
        await taskRef.update({
            status: 'failed',
            error: `Credit check failed: ${error.message}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: false, error: error.message };
    }
}


// --- POLLING LOGIC ---

async function checkVideoStatus(polloTaskId) {
    try {
        const statusUrl = `${POLLO_BASE_URL}/tasks/${polloTaskId}`;
        const response = await fetch(statusUrl, { headers: { 'x-api-key': POLLO_API_KEY } });

        if (!response.ok) {
            console.warn(`[POLL_WARN] Pollo status check for task ${polloTaskId} failed with status ${response.status}`);
            const errorText = await response.text();
            // If task is not found (404), it may have been deleted or never created. Mark as failed.
            if (response.status === 404) {
                return { status: 'failed', error: `Task not found on Pollo AI. It may have expired. (${errorText})` };
            }
            return { status: 'processing' };
        }

        const data = await response.json();
        const state = data.status || data.state;

        if (['succeeded', 'completed', 'done'].includes(state)) {
            const videoUrl = data.resultUrl || data.output?.videoUrl || data.url;
            if (!videoUrl) {
                 return { status: 'failed', error: 'Video generation succeeded but no result URL was provided.' };
            }
            return { status: 'succeeded', videoUrl };
        }

        if (['failed', 'error', 'canceled'].includes(state)) {
            const reason = data.error || 'Unknown reason.';
            return { status: 'failed', error: `Video generation failed. Reason: ${reason}` };
        }

        return { status: 'processing' };

    } catch (error) {
        console.error(`[POLL_ERROR] Error in checkVideoStatus for task ${polloTaskId}:`, error);
        return { status: 'processing' };
    }
}

async function processPendingTasks() {
    const tasksSnapshot = await db.collection('videoTasks').where('status', '==', 'pending').get();

    if (tasksSnapshot.empty) {
        return;
    }

    for (const doc of tasksSnapshot.docs) {
        const task = doc.data();
        const firestoreTaskId = doc.id;

        console.log(`[WORKER_PROCESS] New pending task ${firestoreTaskId} for user ${task.userId}. Checking credits...`);

        // First, attempt to decrement credits.
        const creditResult = await decrementUserCredits(task.userId, firestoreTaskId);

        // If credit check/decrement fails, the task is marked as 'failed' and we stop processing it.
        if (!creditResult.success) {
            console.log(`[WORKER_STOP] Stopping processing for task ${firestoreTaskId} due to credit failure.`);
            continue;
        }

        // If credits were successful, the task status is now 'processing', and we will poll it in the next main loop.
        console.log(`[WORKER_CONTINUE] Credits OK for task ${firestoreTaskId}. It is now 'processing'.`);
    }
}

async function processProcessingTasks() {
    const tasksSnapshot = await db.collection('videoTasks').where('status', '==', 'processing').get();

    if (tasksSnapshot.empty) {
        return;
    }

    console.log(`[POLL_INFO] Found ${tasksSnapshot.docs.length} processing tasks. Polling Pollo AI...`);

    for (const doc of tasksSnapshot.docs) {
        const task = doc.data();
        const firestoreTaskId = doc.id;

        console.log(`[POLL_PROCESS] Checking status for Firestore task ${firestoreTaskId} (Pollo ID: ${task.polloTaskId})`);

        const result = await checkVideoStatus(task.polloTaskId);

        if (result.status === 'succeeded') {
            await db.collection('videoTasks').doc(firestoreTaskId).update({
                status: 'succeeded',
                videoUrl: result.videoUrl,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[POLL_SUCCESS] Task ${firestoreTaskId} succeeded. Video URL: ${result.videoUrl}`);

        } else if (result.status === 'failed') {
            await db.collection('videoTasks').doc(firestoreTaskId).update({
                status: 'failed',
                error: result.error,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.error(`[POLL_FAILURE] Task ${firestoreTaskId} failed. Reason: ${result.error}`);
        }
        // If still processing, do nothing and check again on the next interval.
    }
}


// --- MAIN LOOP ---
setInterval(() => {
    // Process new tasks to check and decrement credits
    processPendingTasks().catch(err => {
        console.error("[WORKER_FATAL] Unhandled error in processPendingTasks loop:", err);
    });

    // Poll tasks that are already in the processing state
    processProcessingTasks().catch(err => {
        console.error("[WORKER_FATAL] Unhandled error in processProcessingTasks loop:", err);
    });
}, POLLING_INTERVAL_MS);
