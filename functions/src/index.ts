import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
// @ts-ignore (dgii-ecf sin tipos)
import { ECF, ENVIRONMENT, P12Reader, Signature, Transformer, convertECF32ToRFCE } from "dgii-ecf";

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();
const bootstrapSecret = defineSecret("BOOTSTRAP_SECRET");

// Roles predefinidos → permisos de módulo.
const BUILTIN_ROLES: Record<string, string[]> = {
  admin: ["dashboard", "patients", "reception", "billing", "printing", "users", "settings"],
  recepcion: ["dashboard", "patients", "reception", "billing"],
  cajera: ["dashboard", "billing", "printing"],
};

// Secuencias e-CF que se aprovisionan por clínica.
const DEFAULT_SEQUENCES = [
  { ncfType: "B02", prefix: "E32", current: 1, max: 9999999999 }, // Consumo electrónico
  { ncfType: "B01", prefix: "E31", current: 1, max: 9999999999 }, // Crédito fiscal electrónico
];

// Tipo de NCF → código de tipo de documento e-CF de la DGII.
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  B01: "31",
  B02: "32",
  B04: "34",
};

function requireAdmin(token: Record<string, unknown> | undefined): {
  tenantId: string;
} {
  if (!token) throw new HttpsError("unauthenticated", "Inicia sesión.");
  if (token.role !== "admin")
    throw new HttpsError("permission-denied", "Solo administradores pueden hacer esto.");
  const tenantId = token.tenantId;
  if (typeof tenantId !== "string")
    throw new HttpsError("failed-precondition", "Tu cuenta no tiene una clínica asignada.");
  return { tenantId };
}

function requireTenant(token: Record<string, unknown> | undefined): {
  tenantId: string;
} {
  if (!token) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const tenantId = token.tenantId;
  if (typeof tenantId !== "string")
    throw new HttpsError("failed-precondition", "Tu cuenta no tiene una clínica asignada.");
  return { tenantId };
}

// Crea una clínica nueva y su primer administrador. Protegida por BOOTSTRAP_SECRET
// porque corre antes de que exista ningún usuario.
export const bootstrapClinic = onRequest({ secrets: [bootstrapSecret] }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method-not-allowed" });
    return;
  }
  const secret = req.header("x-setup-secret");
  const expectedSecret = bootstrapSecret.value();
  if (!expectedSecret || secret !== expectedSecret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const { clinicName, adminEmail, adminPassword, adminName } = (req.body ?? {}) as Record<
    string,
    string
  >;
  if (!clinicName || !adminEmail || !adminPassword) {
    res.status(400).json({ error: "missing-fields" });
    return;
  }

  const tenantRef = db.collection("tenants").doc();
  const tid = tenantRef.id;
  await tenantRef.set({
    name: clinicName,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  const batch = db.batch();
  for (const [name, permissions] of Object.entries(BUILTIN_ROLES)) {
    batch.set(tenantRef.collection("roles").doc(name), {
      name,
      label: name,
      permissions,
      isBuiltin: true,
    });
  }
  for (const seq of DEFAULT_SEQUENCES) {
    batch.set(tenantRef.collection("fiscalSequences").doc(seq.ncfType), seq);
  }
  await batch.commit();

  const userRecord = await adminAuth.createUser({
    email: adminEmail,
    password: adminPassword,
    displayName: adminName ?? "Administrador",
  });
  await adminAuth.setCustomUserClaims(userRecord.uid, { tenantId: tid, role: "admin" });
  await tenantRef.collection("users").doc(userRecord.uid).set({
    email: adminEmail,
    displayName: adminName ?? "Administrador",
    role: "admin",
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.json({ tenantId: tid, uid: userRecord.uid });
});

// Crea un usuario del personal en la clínica del llamante (solo admin).
export const createUser = onCall(async (request) => {
  const { tenantId } = requireAdmin(request.auth?.token);
  const { email, password, displayName, role, permissions } = (request.data ?? {}) as {
    email?: string;
    password?: string;
    displayName?: string;
    role?: string;
    permissions?: string[];
  };
  if (!email || !password || !role)
    throw new HttpsError("invalid-argument", "Faltan correo, contraseña o rol.");

  const userRecord = await adminAuth.createUser({
    email,
    password,
    displayName: displayName ?? email,
  });
  await adminAuth.setCustomUserClaims(userRecord.uid, { tenantId, role });
  await db.collection("tenants").doc(tenantId).collection("users").doc(userRecord.uid).set({
    email,
    displayName: displayName ?? email,
    role,
    ...(Array.isArray(permissions) ? { permissions } : {}),
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { uid: userRecord.uid };
});

// Actualiza rol/permisos/estado de un usuario (solo admin).
export const updateUser = onCall(async (request) => {
  const { tenantId } = requireAdmin(request.auth?.token);
  const { uid, role, permissions, active, displayName } = (request.data ?? {}) as {
    uid?: string;
    role?: string;
    permissions?: string[];
    active?: boolean;
    displayName?: string;
  };
  if (!uid) throw new HttpsError("invalid-argument", "Falta el identificador del usuario.");

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (role) {
    updates.role = role;
    await adminAuth.setCustomUserClaims(uid, { tenantId, role });
  }
  if (Array.isArray(permissions)) updates.permissions = permissions;
  if (typeof active === "boolean") {
    updates.active = active;
    await adminAuth.updateUser(uid, { disabled: !active });
  }
  if (displayName) updates.displayName = displayName;

  await db
    .collection("tenants")
    .doc(tenantId)
    .collection("users")
    .doc(uid)
    .set(updates, { merge: true });
  return { ok: true };
});

// e-CF

// Guarda la configuración fiscal (RNC, razón social, ambiente). Solo admin.
export const saveEcfConfig = onCall(async (request) => {
  const { tenantId } = requireAdmin(request.auth?.token);
  const { rnc, businessName, environment } = (request.data ?? {}) as {
    rnc?: string;
    businessName?: string;
    environment?: string;
  };
  if (!rnc || !businessName) {
    throw new HttpsError("invalid-argument", "RNC y razón social son requeridos.");
  }

  const configRef = db.collection("tenants").doc(tenantId).collection("ecfConfig").doc("config");
  await configRef.set(
    {
      rnc,
      businessName,
      environment: environment ?? "CerteCF",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true };
});

// Sube y valida un certificado P12. El certificado nunca sale del servidor. Solo admin.
export const uploadCertificate = onCall(async (request) => {
  const { tenantId } = requireAdmin(request.auth?.token);
  const { certBase64, passphrase } = (request.data ?? {}) as {
    certBase64?: string;
    passphrase?: string;
  };
  if (!certBase64 || !passphrase) {
    throw new HttpsError("invalid-argument", "Faltan el certificado o la contraseña.");
  }

  let certExpiresAt: string | null = null;
  try {
    const reader = new P12Reader(passphrase);
    const info = reader.getCertificateInfoFromBase64(certBase64);
    certExpiresAt = info?.validTo ? new Date(info.validTo).toISOString() : null;
    const keys = reader.getKeyFromStringBase64(certBase64);
    if (!keys?.key || !keys?.cert) {
      throw new Error("cert/key no extraíble");
    }
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "No se pudo leer el certificado. Verifica el archivo .p12 y la contraseña.",
    );
  }

  const configRef = db.collection("tenants").doc(tenantId).collection("ecfConfig").doc("config");
  await configRef.set(
    {
      certBase64,
      certPassphrase: passphrase,
      certExpiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true, certExpiresAt };
});

// Activa o desactiva el e-CF del tenant. Solo admin.
export const activateEcf = onCall(async (request) => {
  const { tenantId } = requireAdmin(request.auth?.token);
  const { isActive } = (request.data ?? {}) as { isActive?: boolean };
  if (typeof isActive !== "boolean") {
    throw new HttpsError("invalid-argument", "Se requiere el campo isActive (boolean).");
  }

  const configRef = db.collection("tenants").doc(tenantId).collection("ecfConfig").doc("config");
  const snap = await configRef.get();

  if (isActive) {
    if (!snap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Configura el RNC y la razón social antes de activar.",
      );
    }
    const data = snap.data() ?? {};
    if (!data.certBase64) {
      throw new HttpsError(
        "failed-precondition",
        "Sube el certificado P12 antes de activar el e-CF.",
      );
    }
  }

  await configRef.set({ isActive, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
});

// Asigna un eNCF a la factura y la transmite a la DGII (solo facturas fiscales).
export const submitEcf = onCall(async (request) => {
  const { tenantId } = requireTenant(request.auth?.token);
  const { invoiceId } = (request.data ?? {}) as { invoiceId?: string };
  if (!invoiceId) throw new HttpsError("invalid-argument", "Falta el ID de la factura.");

  const tenantRef = db.collection("tenants").doc(tenantId);

  // Leer factura
  const invoiceRef = tenantRef.collection("invoices").doc(invoiceId);
  const invoiceSnap = await invoiceRef.get();
  if (!invoiceSnap.exists) throw new HttpsError("not-found", "Factura no encontrada.");
  const invoice = invoiceSnap.data() as Record<string, unknown>;

  // Solo facturas fiscales
  if (invoice.fiscalRegime !== "fiscal") {
    throw new HttpsError(
      "failed-precondition",
      "Documento genérico (no fiscal): no se transmite a la DGII.",
    );
  }

  // Leer configuración
  const configSnap = await tenantRef.collection("ecfConfig").doc("config").get();
  if (!configSnap.exists) {
    throw new HttpsError("failed-precondition", "e-CF no configurado para esta clínica.");
  }
  const config = configSnap.data() as Record<string, unknown>;
  if (!config.isActive) {
    throw new HttpsError("failed-precondition", "e-CF no está activo. Actívalo en Ajustes.");
  }
  if (!config.certBase64 || !config.certPassphrase) {
    throw new HttpsError("failed-precondition", "Certificado P12 no configurado.");
  }

  const ncfType = (invoice.ncfType as string) ?? "B02";

  // Reservar el siguiente número de secuencia
  let encf = "";
  await db.runTransaction(async (tx) => {
    const seqRef = tenantRef.collection("fiscalSequences").doc(ncfType);
    const seqSnap = await tx.get(seqRef);
    if (!seqSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        `No existe secuencia NCF para el tipo ${ncfType}.`,
      );
    }
    const seq = seqSnap.data() as { prefix: string; current: number; max: number };
    if (seq.current > seq.max) {
      throw new HttpsError("resource-exhausted", "La secuencia NCF está agotada.");
    }
    const newCurrent = seq.current + 1;
    encf = seq.prefix + String(newCurrent).padStart(10, "0");
    tx.update(seqRef, { current: newCurrent });
  });

  // Marcar la factura con eNCF pendiente
  await invoiceRef.set({ ecf: { ncf: encf, status: "pending" } }, { merge: true });

  // Crear documento de envío
  const submissionRef = tenantRef.collection("ecfSubmissions").doc();
  await submissionRef.set({
    invoiceId,
    encf,
    status: "pending",
    attempts: 0,
    sentAt: null,
    resolvedAt: null,
    trackId: null,
    lastError: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Enviar; capturamos el error sin relanzar para poder devolver el encf
  let trackId: string | null = null;
  let finalStatus = "pending";
  try {
    trackId = await initAndSend(
      tenantRef,
      submissionRef,
      invoiceRef,
      encf,
      invoice,
      config,
      ncfType,
    );
    finalStatus = "sent";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await submissionRef.set(
      {
        status: "error",
        lastError: msg,
        attempts: FieldValue.increment(1),
      },
      { merge: true },
    );
    finalStatus = "error";
  }

  return { encf, trackId, status: finalStatus };
});

// Construye el payload e-CF, lo firma y lo envía; actualiza envío y factura si tiene éxito.
async function initAndSend(
  tenantRef: FirebaseFirestore.DocumentReference,
  submissionRef: FirebaseFirestore.DocumentReference,
  invoiceRef: FirebaseFirestore.DocumentReference,
  encf: string,
  invoice: Record<string, unknown>,
  config: Record<string, unknown>,
  ncfType: string,
): Promise<string | null> {
  // Cliente e-CF
  const reader = new P12Reader(config.certPassphrase as string);
  const certs = reader.getKeyFromStringBase64(config.certBase64 as string);
  if (!certs?.key || !certs?.cert) {
    throw new Error("No se pudo extraer la clave del certificado P12.");
  }

  const envStr = (config.environment as string) ?? "CerteCF";
  const env: ENVIRONMENT = envStr === "eCF" ? ENVIRONMENT.PROD : ENVIRONMENT.CERT;
  const ecfClient = new ECF(certs, env);
  await ecfClient.authenticate();

  // Vencimiento de la secuencia (FechaVencimientoSecuencia)
  const seqSnap = await tenantRef.collection("fiscalSequences").doc(ncfType).get();
  const seqExpiry: string | null = seqSnap.exists
    ? ((seqSnap.data() as Record<string, unknown>).expiryDate as string | null) ?? null
    : null;

  const ecfType = DOCUMENT_TYPE_MAP[ncfType] ?? "32";
  const ecfData = buildEcfJson(invoice, config, ecfType, encf, seqExpiry);

  const transformer = new Transformer();
  const xml = transformer.json2xml(ecfData);

  const signature = new Signature(certs.key as string, certs.cert as string);
  const signedXml = signature.signXml(xml, "ECF");

  const fileName = `${config.rnc as string}${encf}.xml`;

  // Send: Consumo (E32) < 250K → RFCE summary; else full document
  let response: Record<string, unknown> | undefined;
  if (ecfType === "32" && Number(invoice.total ?? 0) < 250000) {
    const rfce = convertECF32ToRFCE(signedXml) as { xml: string; securityCode?: string };
    const signedRfce = signature.signXml(rfce.xml, "RFCE");
    response = (await ecfClient.sendSummary(signedRfce, fileName)) as
      | Record<string, unknown>
      | undefined;
  } else {
    response = (await ecfClient.sendElectronicDocument(signedXml, fileName)) as
      | Record<string, unknown>
      | undefined;
  }

  const trackId = (response?.trackId as string) ?? null;

  await submissionRef.set(
    {
      status: "sent",
      trackId,
      sentAt: Date.now(),
      signedXml,
      attempts: FieldValue.increment(1),
      lastError: null,
    },
    { merge: true },
  );

  await invoiceRef.set(
    { ecf: { ncf: encf, trackId, status: "sent" } },
    { merge: true },
  );

  return trackId;
}

// Tarea programada: consulta el estado en la DGII de los envíos "sent". Cada 5 minutos.
export const pollEcfStatus = onSchedule("every 5 minutes", async () => {
  const activeConfigs = await db
    .collectionGroup("ecfConfig")
    .where("isActive", "==", true)
    .get();

  for (const configDoc of activeConfigs.docs) {
    const tenantId = configDoc.ref.parent.parent?.id;
    if (!tenantId) continue;

    const config = configDoc.data();
    if (!config.certBase64 || !config.certPassphrase) continue;

    const tenantRef = db.collection("tenants").doc(tenantId);

    // Envíos en estado "sent" de este tenant
    const sentSnap = await tenantRef
      .collection("ecfSubmissions")
      .where("status", "==", "sent")
      .get();

    if (sentSnap.empty) continue;

    // Cliente e-CF, una vez por tenant
    let ecfClient: InstanceType<typeof ECF> | null = null;
    try {
      const reader = new P12Reader(config.certPassphrase as string);
      const certs = reader.getKeyFromStringBase64(config.certBase64 as string);
      if (!certs?.key || !certs?.cert) continue;

      const envStr = (config.environment as string) ?? "CerteCF";
      const env: ENVIRONMENT = envStr === "eCF" ? ENVIRONMENT.PROD : ENVIRONMENT.CERT;
      ecfClient = new ECF(certs, env);
      await ecfClient.authenticate();
    } catch {
      continue; // omitir tenant si falla la autenticación
    }

    for (const submissionDoc of sentSnap.docs) {
      const submission = submissionDoc.data();
      const trackId = submission.trackId as string | null;
      if (!trackId) continue;

      try {
        const response = (await ecfClient.statusTrackId(trackId)) as
          | Record<string, unknown>
          | undefined;
        const estado = String(response?.estado ?? "");

        let newStatus: string | null = null;
        if (estado === "Aceptado") newStatus = "accepted";
        else if (estado === "Rechazado") newStatus = "rejected";

        if (newStatus) {
          await submissionDoc.ref.set(
            {
              status: newStatus,
              resolvedAt: Date.now(),
              lastError: estado === "Rechazado" ? (response?.mensajes ?? "Rechazado") : null,
            },
            { merge: true },
          );

          // Actualizar ecf.status de la factura
          const invoiceId = submission.invoiceId as string;
          if (invoiceId) {
            await tenantRef
              .collection("invoices")
              .doc(invoiceId)
              .set({ ecf: { status: newStatus } }, { merge: true });
          }
        }
      } catch {
        // Incrementar intentos y continuar
        await submissionDoc.ref.set(
          { attempts: FieldValue.increment(1) },
          { merge: true },
        );
      }
    }
  }
});

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${date.getFullYear()}`;
}

// Impresión

// Crea un trabajo de impresión para una factura. El agente local recoge el
// trabajo "pending" vía Firestore y envía los bytes a la impresora configurada.
export const createPrintJob = onCall(async (request) => {
  const { tenantId } = requireTenant(request.auth?.token);
  const { invoiceId, printerId, copies, openCashDrawer } = (request.data ?? {}) as {
    invoiceId?: string;
    printerId?: string;
    copies?: number;
    openCashDrawer?: boolean;
  };
  if (!invoiceId) throw new HttpsError("invalid-argument", "Falta el ID de la factura.");
  if (!printerId) throw new HttpsError("invalid-argument", "Falta el ID de la impresora.");

  const tenantRef = db.collection("tenants").doc(tenantId);

  // Leer impresora
  const printerSnap = await tenantRef.collection("printers").doc(printerId).get();
  if (!printerSnap.exists) throw new HttpsError("not-found", "Impresora no encontrada.");
  const printerData = printerSnap.data() as Record<string, unknown>;

  // Leer factura
  const invoiceSnap = await tenantRef.collection("invoices").doc(invoiceId).get();
  if (!invoiceSnap.exists) throw new HttpsError("not-found", "Factura no encontrada.");
  const invoiceData = invoiceSnap.data() as Record<string, unknown>;

  // Crear trabajo de impresión
  const ref = await tenantRef.collection("printJobs").add({
    documentType: "invoice_receipt",
    payload: {
      invoice: { id: invoiceId, ...invoiceData },
      printer: { id: printerId, ...printerData },
    },
    status: "pending",
    printerId,
    copies: copies ?? 1,
    openCashDrawer: openCashDrawer ?? false,
    tenantId,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { jobId: ref.id };
});

// El agente local llama esto para reportar el resultado de un trabajo de impresión.
export const reportPrintResult = onCall(async (request) => {
  const { tenantId } = requireTenant(request.auth?.token);
  const { jobId, status, error } = (request.data ?? {}) as {
    jobId?: string;
    status?: "done" | "failed";
    error?: string;
  };
  if (!jobId) throw new HttpsError("invalid-argument", "Falta el ID del trabajo.");
  if (status !== "done" && status !== "failed") {
    throw new HttpsError("invalid-argument", 'El estado debe ser "done" o "failed".');
  }

  const updates: Record<string, unknown> = {
    status,
    processedAt: FieldValue.serverTimestamp(),
  };
  if (error) updates.error = error;

  await db
    .collection("tenants")
    .doc(tenantId)
    .collection("printJobs")
    .doc(jobId)
    .set(updates, { merge: true });

  return { ok: true };
});

// Construye el JSON e-CF.
function buildEcfJson(
  invoice: Record<string, unknown>,
  config: Record<string, unknown>,
  ecfType: string,
  encf: string,
  seqExpiry: string | null,
): Record<string, unknown> {
  const now = new Date();
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const subtotal = Number(invoice.subtotal ?? 0);
  const total = Number(invoice.total ?? 0);

  const totales: Record<string, unknown> =
    taxAmount > 0
      ? {
          MontoGravadoTotal: subtotal,
          MontoGravadoI1: subtotal,
          ITBIS1: 18,
          TotalITBIS: taxAmount,
          TotalITBIS1: taxAmount,
          MontoTotal: total,
        }
      : {
          MontoExento: total,
          MontoTotal: total,
        };

  const idDoc: Record<string, unknown> = {
    TipoeCF: ecfType,
    eNCF: encf,
    ...(seqExpiry ? { FechaVencimientoSecuencia: formatDate(new Date(seqExpiry)) } : {}),
    IndicadorMontoGravado: taxAmount > 0 ? "1" : "0",
    TipoIngresos: "01",
    TipoPago: "1", // siempre contado
  };

  const buyerName = invoice.patientName as string | undefined;
  const buyerRnc = invoice.patientCedula as string | undefined;
  const requiresBuyer = ecfType === "31";

  const items = (invoice.items as Array<Record<string, unknown>>) ?? [];

  return {
    ECF: {
      Encabezado: {
        Version: "1.0",
        IdDoc: idDoc,
        Emisor: {
          RNCEmisor: config.rnc as string,
          RazonSocialEmisor: config.businessName as string,
          FechaEmision: formatDate(now),
        },
        ...(buyerName && (requiresBuyer || buyerRnc)
          ? {
              Comprador: {
                ...(buyerRnc ? { RNCComprador: buyerRnc } : {}),
                RazonSocialComprador: buyerName,
              },
            }
          : {}),
        Totales: totales,
      },
      DetallesItems: {
        Item: items.map((item, idx) => ({
          NumeroLinea: idx + 1,
          IndicadorFacturacion: Number(item.taxRate ?? 0) > 0 ? "1" : "4",
          NombreItem: item.description as string,
          CantidadItem: Number(item.quantity ?? 1),
          UnidadMedida: "1",
          PrecioUnitarioItem: Number(item.unitPrice ?? 0),
          ...(Number(item.discount ?? 0) > 0 ? { DescuentoMonto: Number(item.discount) } : {}),
          MontoItem: Number(item.total ?? 0),
        })),
      },
      FechaHoraFirma: now.toISOString(),
    },
  };
}
