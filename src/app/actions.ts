
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { pubSubClient } from "@/lib/pubsub"; // Import du client Pub/Sub
import { v4 as uuidv4 } from "uuid";
import { CreateKissVideo } from "@/types/creation";

const TOPIC_NAME = process.env.PUB_SUB_TOPIC_NAME || 'video-generation-requests';

export async function createKissVideoAction(createKissVideo: CreateKissVideo) {
  const { userId, image1DataUri, image2_data_uri } = createKissVideo;
  console.log(`[${userId}] Initiating video generation.`);

  // 1. Créer un ID de génération unique
  const generationId = uuidv4();

  try {
    // 2. Créer immédiatement le document dans Firestore pour le suivi côté client
    await db.collection('videoGenerations').doc(generationId).set({
      userId: userId,
      status: 'pending', // Le statut initial est "en attente"
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[${generationId}] Firestore document created with status: pending.`);

    // 3. Préparer le message à envoyer à notre worker
    const message = {
      generationId,
      userId,
      image1DataUri,
      image2_data_uri,
    };

    // 4. Publier le message dans le topic Pub/Sub
    const dataBuffer = Buffer.from(JSON.stringify(message));
    await pubSubClient.topic(TOPIC_NAME).publishMessage({ data: dataBuffer });

    console.log(`[${generationId}] Message published to topic: ${TOPIC_NAME}.`);

    revalidatePath("/");

    // 5. Renvoyer l'ID au client, qui va commencer à écouter le document Firestore.
    return {
      generationId: generationId,
    };

  } catch (error) {
    console.error(`[${generationId}] Failed to initiate video generation:`, error);
    // En cas d'erreur, on essaie de nettoyer le document Firestore créé
    await db.collection('videoGenerations').doc(generationId).delete().catch(() => {});
    return {
      error: "Failed to start the generation process. Please try again.",
    };
  }
}

