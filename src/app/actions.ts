
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { pubSubClient } from "@/lib/pubsub";
import { v4 as uuidv4 } from "uuid";
import { CreateKissVideo } from "@/types/creation";

const TOPIC_NAME = process.env.PUB_SUB_TOPIC_NAME || 'video-generation-requests';

export async function createKissVideoAction(createKissVideo: CreateKissVideo) {
  const { userId, image1DataUri, image2_data_uri } = createKissVideo;
  console.log(`[${userId}] Initiating video generation.`);

  // 1. Valider les droits d'accès de l'utilisateur avant de continuer
  const userRef = db.collection('users').doc(userId);
  const generationId = uuidv4(); // Générer l'ID tôt pour les logs

  try {
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`[${generationId}] Document utilisateur non trouvé pour userId: ${userId}`);
      return { error: "Profil utilisateur non trouvé. Veuillez contacter le support." };
    }

    const userData = userDoc.data();
    const credits = userData?.credits ?? 0;
    const accessUntil = userData?.accessUntil?.toDate(); // Convertir le Timestamp Firestore en Date JS

    // Vérifier si la période d'accès a expiré
    if (accessUntil && new Date() > accessUntil) {
      console.log(`[${generationId}] L'accès de l'utilisateur ${userId} a expiré le ${accessUntil.toISOString()}.`);
      // Si l'accès est expiré, mettre les crédits à 0 pour empêcher d'autres tentatives
      if (credits > 0) {
        await userRef.update({ credits: 0 });
      }
      return { error: "Votre période d'accès a expiré. Veuillez renouveler votre plan pour continuer." };
    }

    // Vérifier si l'utilisateur a assez de crédits
    if (credits <= 0) {
      console.log(`[${generationId}] L'utilisateur ${userId} n'a plus de crédits.`);
      return { error: "Vous n'avez plus de crédits. Veuillez renouveler votre plan." };
    }

    // 2. Décrémenter les crédits de l'utilisateur
    await userRef.update({
      credits: FieldValue.increment(-1),
    });
    console.log(`[${generationId}] Crédits de l'utilisateur ${userId} décrémentés. Nouveau solde: ${credits - 1}.`);


    // 3. Créer le document dans Firestore pour le suivi côté client
    await db.collection('videoGenerations').doc(generationId).set({
      userId: userId,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[${generationId}] Document Firestore créé avec le statut: pending.`);

    // 4. Préparer et publier le message à notre worker
    const message = {
      generationId,
      userId,
      image1DataUri,
      image2_data_uri,
    };

    const dataBuffer = Buffer.from(JSON.stringify(message));
    await pubSubClient.topic(TOPIC_NAME).publishMessage({ data: dataBuffer });

    console.log(`[${generationId}] Message publié sur le topic: ${TOPIC_NAME}.`);

    revalidatePath("/");

    // 5. Renvoyer l'ID au client
    return {
      generationId: generationId,
    };

  } catch (error) {
    console.error(`[${generationId}] Une erreur est survenue lors de l'initiation de la génération de la vidéo:`, error);
    return {
      error: "Une erreur inattendue est survenue. Veuillez réessayer ou contacter le support.",
    };
  }
}
