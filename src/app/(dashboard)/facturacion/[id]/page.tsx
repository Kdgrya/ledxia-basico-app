import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { InvoiceDetailClient } from "./invoice-detail-client";

export const metadata: Metadata = { title: "Detalle de factura" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RequireModule module="billing">
      <InvoiceDetailClient invoiceId={id} />
    </RequireModule>
  );
}
