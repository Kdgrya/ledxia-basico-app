import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { CashierClient } from "./cashier-client";

export const metadata: Metadata = { title: "Caja" };

export default function BillingPage() {
  return (
    <RequireModule module="billing">
      <CashierClient />
    </RequireModule>
  );
}
