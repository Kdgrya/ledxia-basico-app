import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { TemplateClient } from "./template-client";

export const metadata: Metadata = { title: "Plantillas de impresión" };

export default function PlantillasPage() {
  return (
    <RequireModule module="settings">
      <TemplateClient />
    </RequireModule>
  );
}
