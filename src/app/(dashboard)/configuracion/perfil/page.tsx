import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = { title: "Perfil de la clínica" };

export default function ProfilePage() {
  return (
    <RequireModule module="settings">
      <ProfileClient />
    </RequireModule>
  );
}
