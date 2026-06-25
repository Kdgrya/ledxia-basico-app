import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { PatientsClient } from "./patients-client";

export const metadata: Metadata = { title: "Pacientes" };

export default function PatientsPage() {
  return (
    <RequireModule module="patients">
      <PatientsClient />
    </RequireModule>
  );
}
