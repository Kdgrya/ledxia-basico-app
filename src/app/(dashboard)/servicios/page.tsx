import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { ServicesClient } from "./services-client";

export const metadata: Metadata = { title: "Servicios" };

export default function ServicesPage() {
  return (
    <RequireModule module="reception">
      <ServicesClient />
    </RequireModule>
  );
}
