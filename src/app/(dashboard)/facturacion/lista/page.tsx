import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { InvoicesClient } from "../invoices-client";

export const metadata: Metadata = { title: "Facturas" };

export default function InvoicesListPage() {
  return (
    <RequireModule module="billing">
      <InvoicesClient />
    </RequireModule>
  );
}
