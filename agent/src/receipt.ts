import { EscPos } from "./escpos";

function fmt(n: unknown): string {
  const num = typeof n === "number" ? n : parseFloat(String(n ?? 0));
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

function padLine(left: string, right: string, width = 32): string {
  const gap = width - left.length - right.length;
  return gap > 0 ? left + " ".repeat(gap) + right : left.slice(0, width - right.length - 1) + " " + right;
}

function formatDate(val: unknown): string {
  try {
    // Timestamp de Firestore serializado como {_seconds, _nanoseconds}
    if (val && typeof val === "object" && "_seconds" in (val as Record<string, unknown>)) {
      const ts = val as { _seconds: number };
      return new Date(ts._seconds * 1000).toLocaleString("es-DO");
    }
    if (val instanceof Date) return val.toLocaleString("es-DO");
    if (typeof val === "string" || typeof val === "number") {
      return new Date(val).toLocaleString("es-DO");
    }
    return String(val ?? "");
  } catch {
    return "";
  }
}

// Genera los bytes ESC/POS de un recibo de factura.
export function renderReceipt(payload: {
  invoice: Record<string, unknown>;
  printer: Record<string, unknown>;
}): Buffer {
  const inv = payload.invoice;
  const profile = (inv.clinicProfile ?? {}) as Record<string, unknown>;
  const p = new EscPos();

  const tenantName =
    (typeof profile.name === "string" && profile.name.trim())
    || (typeof inv.tenantName === "string" && inv.tenantName.trim())
    || "Clínica";

  const tenantSubtitle =
    typeof profile.subtitle === "string" ? profile.subtitle.trim() : "";
  const tenantRnc =
    typeof profile.rnc === "string" ? profile.rnc.trim() : "";
  const tenantPhone =
    typeof profile.phone === "string" ? profile.phone.trim() : "";
  const tenantAddress =
    typeof profile.address === "string" ? profile.address.trim() : "";

  // Encabezado
  p.align("center")
    .bold(true)
    .size(2, 2)
    .line(tenantName)
    .size(1, 1)
    .bold(false);

  if (tenantSubtitle) p.line(tenantSubtitle);
  if (tenantRnc) p.line(`RNC: ${tenantRnc}`);
  if (tenantPhone) p.line(`Tel: ${tenantPhone}`);
  if (tenantAddress) p.line(tenantAddress);

  p.align("left");
  p.rule();

  // Datos de la factura
  p.align("left");
  const invoiceNum = String(inv.invoiceNumber ?? inv.id ?? "—");
  p.line(`Factura: ${invoiceNum}`);
  p.line(`Fecha:   ${formatDate(inv.issuedAt)}`);

  const patient = String(inv.patientName ?? "—");
  p.line(`Paciente: ${patient}`);

  p.rule();

  // Líneas
  const items = Array.isArray(inv.items) ? (inv.items as Record<string, unknown>[]) : [];
  for (const item of items) {
    const desc = String(item.description ?? "").slice(0, 22);
    const qty = String(item.quantity ?? 1);
    const total = `RD$${fmt(item.total)}`;
    p.line(`${desc}`);
    p.line(padLine(`  x${qty}  @RD$${fmt(item.unitPrice)}`, total));
  }

  p.rule();

  // Totales
  const subtotal = Number(inv.subtotal ?? 0);
  const tax = Number(inv.taxAmount ?? 0);
  const total = Number(inv.total ?? 0);

  p.line(padLine("Subtotal", `RD$${fmt(subtotal)}`));
  if (tax > 0) p.line(padLine("ITBIS (18%)", `RD$${fmt(tax)}`));
  p.bold(true).line(padLine("TOTAL", `RD$${fmt(total)}`)).bold(false);

  // Estado de pago
  p.rule();
  const status = String(inv.status ?? "");
  const statusLabel =
    status === "paid" ? "PAGADO" : status === "pending" ? "PENDIENTE" : status.toUpperCase();
  p.align("center").bold(true).line(statusLabel).bold(false).align("left");

  // Pie
  p.rule().align("center").line("Gracias por su visita").feed(1);

  p.cut();

  return p.build();
}
