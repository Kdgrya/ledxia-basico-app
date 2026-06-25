import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Authenticated area. AuthGuard bounces anon users to /login; DashboardShell
// renders the sidebar/topbar from the signed-in user's permissions.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
