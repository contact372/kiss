
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// --- Configuration du Firebase Admin SDK ---
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * API endpoint pour mettre à jour le statut d'un utilisateur après paiement.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Extraire le token d'authentification de l'en-tête.
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No Bearer token.' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    // 2. Vérifier le token pour authentifier l'utilisateur.
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 3. Mettre à jour (ou créer) le document de l'utilisateur dans Firestore.
    const userRef = admin.firestore().collection("users").doc(uid);
    
    // On définit les crédits à 15 au lieu de les incrémenter.
    await userRef.set({
        hasPaid: true,
        credits: 15,
      }, { merge: true });

    // 4. Renvoyer une réponse de succès.
    return NextResponse.json({ success: true, message: 'User credits set to 15 successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error('--- ERROR IN /api/grant-access ---', error);
    
    if (typeof error.code === 'string' && error.code.startsWith('auth/')) {
      return NextResponse.json({ success: false, message: `Forbidden: Invalid authentication token. (Reason: ${error.message})` }, { status: 403 });
    }
    
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
