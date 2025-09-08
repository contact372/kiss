
// src/lib/firebase/firebase.ts
// This file is strictly for CLIENT-SIDE Firebase initialization.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore as getClientFirestore, type Firestore } from 'firebase/firestore';
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
    db = getClientFirestore(app);
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
