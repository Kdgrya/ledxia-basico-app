"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Building2, FileCheck, Printer, FileText, SlidersHorizontal } from "lucide-react";
import { MODULE_LIST, type ModuleKey } from "@/lib/modules";
import { subscribeProfile, type ClinicProfile } from "@/lib/data/settings";
import { useAuth } from "@/lib/auth/context";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SUB_ITEMS: Partial<Record<ModuleKey, { label: string; path: string; icon: React.ComponentType<{ className?: string }> }[]>> = {
  reception: [
  ],
  settings: [
    { label: "Catálogo de servicios", path: "/servicios", icon: BookOpen },
    { label: "Perfil de la clínica", path: "/configuracion/perfil", icon: Building2 },
    { label: "Sistema", path: "/configuracion/sistema", icon: SlidersHorizontal },
    { label: "Plantillas de impresión", path: "/configuracion/plantillas", icon: FileText },
    { label: "Impresoras", path: "/configuracion/impresion", icon: Printer },
    { label: "e-CF / DGII", path: "/configuracion/ecf", icon: FileCheck },
  ],
};

export function Sidebar({ allowed }: { allowed?: ModuleKey[] }) {
  const pathname = usePathname();
  const { tenantId } = useAuth();
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const items = allowed ? MODULE_LIST.filter((m) => allowed.includes(m.key)) : MODULE_LIST;

  useEffect(() => {
    if (!tenantId) return;
    return subscribeProfile(tenantId, setProfile);
  }, [tenantId]);

  const clinicName = profile?.name || "Mi clínica";
  const primaryColor = profile?.primaryColor;

  return (
    <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Image
          src={BRAND.logoWhite}
          alt={BRAND.name}
          width={180}
          height={45}
          priority
          className="h-auto w-36"
        />
        <p className="mt-1 text-[11px] font-medium text-sidebar-foreground/70">
          {BRAND.tagline}
        </p>
        <div className="mt-4 flex min-w-0 items-center gap-2 rounded-md bg-white/8 px-2.5 py-2">
          {profile?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logoUrl}
              alt=""
              className="h-7 w-7 flex-none rounded bg-white object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              className="h-7 w-7 flex-none rounded"
              style={{ backgroundColor: primaryColor ?? "#EB3C5C" }}
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{clinicName}</p>
            {profile?.subtitle && (
              <p className="truncate text-[10px] text-sidebar-foreground/60">{profile.subtitle}</p>
            )}
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((m) => {
          const active = pathname === m.path || (pathname.startsWith(`${m.path}/`) && m.path !== "/dashboard");
          const Icon = m.icon;
          const subs = SUB_ITEMS[m.key] ?? [];
          return (
            <div key={m.key}>
              <Link
                href={m.path}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 flex-none" />
                {m.label}
              </Link>
              {subs.map((sub) => {
                const subActive = pathname === sub.path || pathname.startsWith(`${sub.path}/`);
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.path}
                    href={sub.path}
                    className={cn(
                      "ml-6 flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                      subActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <SubIcon className="h-3.5 w-3.5 flex-none" />
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
