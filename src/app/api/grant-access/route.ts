
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// --- Configuration du Firebase Admin SDK ---
// Cette section vérifie si l'app a déjà été initialisée.
// C'est crucial dans l'environnement serverless de Next.js pour éviter les erreurs.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://gemini-api.firebaseio.com`
  });
}

/**
 * Cette fonction est notre nouvel "endpoint" API.
 * Elle remplace entièrement la Cloud Function.
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

    // 3. Mettre à jour le document de l'utilisateur dans Firestore.
    const userRef = admin.firestore().collection("users").doc(uid);
    
    // Utiliser une transaction pour la sécurité des données.
    await admin.firestore().runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentCredits = userDoc.data()?.credits || 0;
      const newCredits = currentCredits + 100; // Ajoute 100 crédits

      transaction.update(userRef, {
        hasPaid: true,
        credits: newCredits,
      });
    });

    // 4. Renvoyer une réponse de succès.
    return NextResponse.json({ success: true, message: 'User credits updated successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error('--- ERROR IN /api/grant-access ---', error);
    // Gérer les erreurs spécifiques (token invalide, etc.)
    if (error.code && error.code.startsWith('auth/')) {
      return NextResponse.json({ success: false, message: 'Forbidden: Invalid authentication token.' }, { status: 403 });
    }
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
