import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { SystemClient } from "./system-client";

export const metadata: Metadata = { title: "Sistema" };

export default function SistemaPage() {
  return (
    <RequireModule module="settings">
      <SystemClient />
    </RequireModule>
  );
}
