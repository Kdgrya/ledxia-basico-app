import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  SlidersHorizontal,
  FileText,
  Printer,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import { RequireModule } from "@/components/auth/auth-guard";

export const metadata: Metadata = { title: "Configuración" };

const SECTIONS = [
  {
    label: "Perfil de la clínica",
    description: "Nombre, logo, color, RNC y datos de contacto.",
    path: "/configuracion/perfil",
    icon: Building2,
  },
  {
    label: "Sistema",
    description: "Moneda, ITBIS, numeración de facturas y zona horaria.",
    path: "/configuracion/sistema",
    icon: SlidersHorizontal,
  },
  {
    label: "Plantillas de impresión",
    description: "Diseño del recibo / factura térmica.",
    path: "/configuracion/plantillas",
    icon: FileText,
  },
  {
    label: "Impresoras",
    description: "Impresoras de recibos y trabajos de impresión.",
    path: "/configuracion/impresion",
    icon: Printer,
  },
  {
    label: "e-CF / DGII",
    description: "Comprobantes fiscales electrónicos y secuencias NCF.",
    path: "/configuracion/ecf",
    icon: FileCheck,
  },
];

export default function ConfiguracionPage() {
  return (
    <RequireModule module="settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Administra el perfil, el sistema y los documentos de tu clínica.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.path}
                href={s.path}
                className="group flex items-start gap-4 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:ring-primary/40"
              >
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{s.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {s.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 flex-none text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
    </RequireModule>
  );
}
