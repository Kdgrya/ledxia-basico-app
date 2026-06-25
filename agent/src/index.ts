import "dotenv/config";
import * as admin from "firebase-admin";
import { startListener } from "./listener";

const tenantId = process.env.TENANT_ID;
if (!tenantId) {
  console.error("[ledxia-connect] ERROR: TENANT_ID no está configurado en el .env");
  process.exit(1);
}

// firebase-admin uses GOOGLE_APPLICATION_CREDENTIALS automatically.
admin.initializeApp();
const db = admin.firestore();

startListener(db, tenantId);

// Mantener el proceso vivo.
process.on("SIGINT", () => {
  console.log("\n[ledxia-connect] Detenido.");
  process.exit(0);
});
