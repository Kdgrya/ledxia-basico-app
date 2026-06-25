import type * as admin from "firebase-admin";
import { renderReceipt } from "./receipt";
import { sendToPrinter, type PrinterTarget } from "./printing";

// ESC/POS cash-drawer kick (pin 2)
const CASH_DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

export async function processJob(
  db: admin.firestore.Firestore,
  tenantId: string,
  jobId: string,
  jobData: admin.firestore.DocumentData,
): Promise<void> {
  const jobRef = db.collection("tenants").doc(tenantId).collection("printJobs").doc(jobId);

  try {
    const payload = jobData.payload as {
      invoice: Record<string, unknown>;
      printer: Record<string, unknown>;
    };

    if (!payload?.invoice || !payload?.printer) {
      throw new Error("El trabajo de impresión no tiene payload válido.");
    }

    const printerData = payload.printer;
    const openCashDrawer = Boolean(jobData.openCashDrawer);
    const copies = Math.max(1, Number(jobData.copies ?? 1));

    // Agregar el perfil de la clínica desde Firestore
    let clinicProfile: Record<string, unknown> = {};
    try {
      const profileSnap = await db
        .collection("tenants").doc(tenantId)
        .collection("settings").doc("profile")
        .get();
      if (profileSnap.exists) clinicProfile = profileSnap.data() as Record<string, unknown>;
    } catch { /* no bloqueante */ }

    const enrichedPayload = {
      invoice: { ...payload.invoice, clinicProfile },
      printer: payload.printer,
    };

    // Generar los bytes del recibo
    const receiptBytes = renderReceipt(enrichedPayload);

    const target: PrinterTarget = {
      connection: (printerData.connection as PrinterTarget["connection"]) ?? null,
      ipAddress: (printerData.ipAddress as string | null) ?? null,
      port: printerData.port != null ? Number(printerData.port) : null,
      systemName: (printerData.systemName as string | null) ?? null,
    };

    // Mark as printing
    await jobRef.set({ status: "printing" }, { merge: true });

    // Send each copy
    for (let i = 0; i < copies; i++) {
      await sendToPrinter(target, receiptBytes);
    }

    // Open cash drawer if requested and available
    if (openCashDrawer && printerData.hasCashDrawer) {
      await sendToPrinter(target, CASH_DRAWER_KICK);
    }

    // Mark done
    await jobRef.set(
      {
        status: "done",
        processedAt: Date.now(),
      },
      { merge: true },
    );

    console.log(`[ledxia-connect] Trabajo ${jobId} completado.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ledxia-connect] Error en trabajo ${jobId}:`, msg);
    await jobRef.set(
      {
        status: "failed",
        processedAt: Date.now(),
        error: msg,
      },
      { merge: true },
    );
  }
}
