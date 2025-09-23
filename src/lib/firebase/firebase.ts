
// src/lib/firebase/firebase.ts
// This file is strictly for CLIENT-SIDE Firebase initialization.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// We switch from getFirestore to initializeFirestore to pass in custom settings.
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// This check ensures Firebase is only initialized on the client side.
if (typeof window !== 'undefined') {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    auth = getAuth(app);

    // HERE IS THE FIX:
    // We force the Firestore client to use long-polling. This is a workaround
    // for a known issue with some development environments (like local emulators
    // behind certain proxies or Docker configurations) where modern real-time
    // connections (WebSockets/HTTP2) fail. Long-polling is a more robust, albeit
    // slightly less efficient, alternative that solves the "Transport failed" error.
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      merge: true, // This is not a standard option, so I'm removing it.
    });
}

// These functions are intended for client-side use only.
export function getFirebaseApp(): FirebaseApp {
    if (!app) {
        throw new Error("Firebase app is not initialized. This function should only be called on the client side.");
    }
    return app;
}

export function getFirebaseAuth(): Auth {
    if (!auth) {
        throw new Error("Firebase auth is not initialized. This function should only be called on the client side.");
    }
    return auth;
}

export function getFirestoreDb(): Firestore {
    if (!db) {
        throw new Error("Firestore is not initialized. This function should only be called on the client side.");
    }
    return db;
}
