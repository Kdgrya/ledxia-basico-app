"use client";

import { useAuth } from "@/lib/auth/context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { permissions, displayName, signOut } = useAuth();
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar allowed={permissions} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={displayName} onSignOut={signOut} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  );
}
