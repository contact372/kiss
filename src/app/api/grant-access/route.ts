
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// --- Configuration du Firebase Admin SDK ---
// On vérifie si l'app a déjà été initialisée pour éviter les erreurs.
if (!admin.apps.length) {
  // Lorsqu'on est sur Google Cloud (Cloud Run), appeler initializeApp() sans argument
  // permet au SDK de découvrir automatiquement la configuration du projet depuis l'environnement.
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
    
    await admin.firestore().runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentCredits = userDoc.data()?.credits || 0;
      const newCredits = currentCredits + 100;

      // LA CORRECTION CLÉ EST ICI :
      // On utilise .set() avec { merge: true } au lieu de .update().
      // Cela crée le document s'il n'existe pas, et le met à jour s'il existe.
      // C'est ce qu'on appelle un "upsert".
      transaction.set(userRef, {
        hasPaid: true,
        credits: newCredits,
      }, { merge: true });
    });

    // 4. Renvoyer une réponse de succès.
    return NextResponse.json({ success: true, message: 'User credits updated successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error('--- ERROR IN /api/grant-access ---', error);
    
    // Correction de la gestion d'erreur : on vérifie que error.code est bien une chaîne.
    if (typeof error.code === 'string' && error.code.startsWith('auth/')) {
      return NextResponse.json({ success: false, message: `Forbidden: Invalid authentication token. (Reason: ${error.message})` }, { status: 403 });
    }
    
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
