"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import type { ModuleKey } from "@/lib/modules";

function FullscreenSpinner() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Redirige a /login si no hay sesión.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <FullscreenSpinner />;
  return <>{children}</>;
}

// Protege una página de módulo; sin permiso, vuelve a /dashboard.
export function RequireModule({
  module,
  children,
}: {
  module: ModuleKey;
  children: React.ReactNode;
}) {
  const { loading, permissions } = useAuth();
  const router = useRouter();
  const allowed = permissions.includes(module);

  useEffect(() => {
    if (!loading && !allowed) router.replace("/dashboard");
  }, [loading, allowed, router]);

  if (loading || !allowed) return <FullscreenSpinner />;
  return <>{children}</>;
}
