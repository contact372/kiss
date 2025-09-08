
'use server';

import { decrementUserCreditsAdmin } from '@/lib/firebase/firebase-admin';

// This action securely provides the API key from the server environment to the client.
export async function getApiKey(): Promise<string | null> {
    return process.env.POLLO_API_KEY || null;
}

export async function decrementCreditsAction(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await decrementUserCreditsAdmin(userId);
        return { success: true };
    } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        console.error('[ACTION_ERROR] Failed to decrement credits:', message);
        return { success: false, error: message };
    }
}
