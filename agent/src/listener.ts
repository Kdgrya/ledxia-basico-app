import type * as admin from "firebase-admin";
import { processJob } from "./processor";

// IDs de trabajos en proceso, para evitar duplicados.
const processing = new Set<string>();

export function startListener(
  db: admin.firestore.Firestore,
  tenantId: string,
): () => void {
  console.log(`[ledxia-connect] Escuchando trabajos de impresión para tenant: ${tenantId}`);

  const query = db
    .collection("tenants")
    .doc(tenantId)
    .collection("printJobs")
    .where("status", "==", "pending");

  const unsubscribe = query.onSnapshot(
    (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== "added") continue;
        const jobId = change.doc.id;
        if (processing.has(jobId)) continue;
        processing.add(jobId);
        const jobData = change.doc.data();
        processJob(db, tenantId, jobId, jobData).finally(() => {
          processing.delete(jobId);
        });
      }
    },
    (err) => {
      console.error("[ledxia-connect] Error en el listener de Firestore:", err);
    },
  );

  return unsubscribe;
}
