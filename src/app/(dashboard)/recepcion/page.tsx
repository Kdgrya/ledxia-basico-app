import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { ReceptionClient } from "./reception-client";

export const metadata: Metadata = { title: "Recepción" };

export default function ReceptionPage() {
  return (
    <RequireModule module="reception">
      <ReceptionClient />
    </RequireModule>
  );
}
