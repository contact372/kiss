
import { PubSub } from '@google-cloud/pubsub';

// Crée un client Pub/Sub unique qui sera réutilisé.
// Le client trouvera automatiquement les informations d'authentification
// dans l'environnement de Google Cloud.
export const pubSubClient = new PubSub();
