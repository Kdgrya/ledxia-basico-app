import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Receipt,
  Printer,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";

// Módulos del sistema. Cada rol otorga un subconjunto; la UI oculta lo que el
// usuario no puede ver y las reglas de Firestore / Cloud Functions protegen lo sensible.
export const SYSTEM_MODULES = [
  "dashboard",
  "patients",
  "reception",
  "billing",
  "printing",
  "users",
  "settings",
] as const;

export type ModuleKey = (typeof SYSTEM_MODULES)[number];

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  path: string;
  icon: LucideIcon;
  // Módulo válido para permisos pero no se muestra en el menú lateral.
  hidden?: boolean;
}

export const MODULES: Record<ModuleKey, ModuleMeta> = {
  dashboard: { key: "dashboard", label: "Inicio", path: "/dashboard", icon: LayoutDashboard },
  patients: { key: "patients", label: "Pacientes", path: "/pacientes", icon: Users },
  reception: { key: "reception", label: "Recepción", path: "/recepcion", icon: ClipboardList },
  billing: { key: "billing", label: "Facturación", path: "/facturacion", icon: Receipt },
  printing: { key: "printing", label: "Impresión", path: "/impresion", icon: Printer, hidden: true },
  users: { key: "users", label: "Usuarios", path: "/usuarios", icon: Shield },
  settings: { key: "settings", label: "Configuración", path: "/configuracion", icon: Settings },
};

// Todos los módulos, incluidos los ocultos.
export const ALL_MODULES: ModuleMeta[] = SYSTEM_MODULES.map((k) => MODULES[k]);

// Módulos visibles en el menú lateral.
export const MODULE_LIST: ModuleMeta[] = ALL_MODULES.filter((m) => !m.hidden);

// Roles predefinidos y los módulos que otorgan.
export const BUILTIN_ROLES: Record<string, { label: string; permissions: ModuleKey[] }> = {
  admin: { label: "Administrador", permissions: [...SYSTEM_MODULES] as ModuleKey[] },
  recepcion: {
    label: "Recepción",
    permissions: ["dashboard", "patients", "reception", "billing"],
  },
  cajera: { label: "Caja", permissions: ["dashboard", "billing", "printing"] },
};

export function permissionsForRole(role: string, custom?: ModuleKey[]): ModuleKey[] {
  if (custom && custom.length) return custom;
  return BUILTIN_ROLES[role]?.permissions ?? ["dashboard"];
}
