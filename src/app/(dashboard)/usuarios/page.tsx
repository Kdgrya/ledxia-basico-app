import type { Metadata } from "next";
import { RequireModule } from "@/components/auth/auth-guard";
import { UsersClient } from "./users-client";

export const metadata: Metadata = { title: "Usuarios" };

export default function UsersPage() {
  return (
    <RequireModule module="users">
      <UsersClient />
    </RequireModule>
  );
}
