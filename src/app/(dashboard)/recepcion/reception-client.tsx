"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Building2,
  ClipboardList,
  PhoneCall,
  Plus,
  Ticket,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { subscribeInvoices, STATUS_LABEL, STATUS_VARIANT } from "@/lib/data/billing";
import { formatPrice } from "@/lib/data/services";
import { BRAND } from "@/lib/brand";
import type { Invoice } from "@/lib/types";
import { NewOrderSheet } from "@/components/reception/new-order-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function relativeTime(ts: number, now: number): string {
  const ms = now - ts;
  if (ms < 60_000) return "ahora";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export function ReceptionClient() {
  const { tenantId, displayName } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [now, setNow] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Cambia al abrir para remontar el sheet con estado limpio.
  const [sheetKey, setSheetKey] = useState(0);

  function openSheet() {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  useEffect(() => {
    if (!tenantId) return;
    return subscribeInvoices(tenantId, setInvoices);
  }, [tenantId]);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // F1 abre el sheet de orden, F5 refresca.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "F1") {
        e.preventDefault();
        openSheet();
      } else if (e.key === "F5") {
        e.preventDefault();
        router.refresh();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const totals = useMemo(() => {
    const todayStart = startOfToday();
    const todays = invoices.filter((i) => (i.issuedAt ?? 0) >= todayStart);
    const patientsToday = new Set(
      todays.map((i) => i.patientId || i.companyId || i.id),
    ).size;
    const urgent = invoices.filter((i) =>
      (i.notes ?? "").toLowerCase().includes("emergencia"),
    ).length;
    const pending = invoices.filter((i) => i.status === "pending").length;
    return {
      ordersToday: todays.length,
      patientsToday,
      waiting: 0,
      inProgress: pending,
      urgent,
    };
  }, [invoices]);

  // Recientes = últimas 24h; luego pasan al historial.
  const recentOrders = useMemo(() => {
    const cutoff = Date.now() - DAY_MS;
    return invoices
      .filter((i) => (i.issuedAt ?? 0) >= cutoff)
      .sort((a, b) => (b.issuedAt ?? 0) - (a.issuedAt ?? 0));
  }, [invoices]);

  return (
    <div className="-m-6 flex h-[calc(100vh-0px)] min-h-[calc(100dvh-6.5rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KpiCard icon={ClipboardList} label="Órdenes hoy" value={totals.ordersToday} tint="indigo" />
          <KpiCard icon={Users} label="Pacientes hoy" value={totals.patientsToday} tint="sky" />
          <KpiCard icon={Ticket} label="En espera" value={totals.waiting} tint="violet" />
          <KpiCard icon={PhoneCall} label="En atención" value={totals.inProgress} tint="emerald" />
          <KpiCard icon={AlertCircle} label="Urgentes" value={totals.urgent} tint="rose" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <POSButton onClick={openSheet} icon={Plus} label="NUEVA ORDEN" hotkey="F1" primary />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-4 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--brand-primary,#00A99D)]/10 text-[color:var(--brand-primary,#00A99D)]">
                <ClipboardList className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight tracking-tight">
                  Órdenes recientes
                </h3>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  Últimas 24h · luego pasan al historial
                </p>
              </div>
              <Badge className="ml-auto border-0 bg-[color:var(--brand-primary,#00A99D)]/10 text-xs text-[color:var(--brand-primary,#00A99D)]">
                {recentOrders.length}
              </Badge>
              <Link href="/facturacion">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-muted-foreground hover:text-[color:var(--brand-primary,#00A99D)]"
                >
                  Ver todas
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border-b bg-slate-50/40 px-3 py-2 dark:bg-slate-950/10">
              <KindChip active label="Todas" count={recentOrders.length} />
              <KindChip
                label="Servicios"
                icon={ClipboardList}
                count={recentOrders.length}
              />
            </div>

            <div className="max-h-[520px] divide-y overflow-y-auto">
              {recentOrders.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <ClipboardList className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                  <div className="text-sm text-muted-foreground">No hay órdenes</div>
                  <Button
                    size="sm"
                    onClick={openSheet}
                    className="mt-3 bg-[color:var(--brand-accent,#eb3c5c)] text-white hover:bg-[color:var(--brand-accent,#eb3c5c)]/85"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Crear orden
                  </Button>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    now={now}
                    onOpen={() => router.push(`/facturacion/${order.id}`)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-4 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--brand-primary,#00A99D)]/10 text-[color:var(--brand-primary,#00A99D)]">
                <Ticket className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-sm font-semibold tracking-tight">Tickets en cola</h3>
              <Badge className="ml-auto border-0 bg-[color:var(--brand-primary,#00A99D)]/10 text-xs text-[color:var(--brand-primary,#00A99D)]">
                0
              </Badge>
            </div>
            <div className="px-4 py-12 text-center">
              <Ticket className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
              <div className="text-sm text-muted-foreground">No hay tickets en espera</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 border-t bg-slate-900 px-4 py-2 text-[11px] text-slate-100">
        <div className="flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold">Recepción activa</span>
          {displayName && (
            <span className="hidden text-slate-400 md:inline">· {displayName}</span>
          )}
        </div>
        <HotkeyHint k="F1" label="Nueva orden" />
        <HotkeyHint k="F5" label="Refrescar" />
        <div className="ml-auto flex items-center gap-2 text-slate-400">
          <span className="hidden font-semibold md:inline">{BRAND.name}</span>
          <span className="opacity-50">·</span>
          <span className="font-mono">v1.0</span>
        </div>
      </div>

      <NewOrderSheet
        key={sheetKey}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={(id) => router.push(`/facturacion/${id}`)}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tint: "indigo" | "sky" | "violet" | "emerald" | "rose";
}) {
  const palette = {
    indigo: {
      text: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      border: "border-l-indigo-500",
    },
    sky: {
      text: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/30",
      border: "border-l-sky-500",
    },
    violet: {
      text: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-l-violet-500",
    },
    emerald: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-l-emerald-500",
    },
    rose: {
      text: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-l-rose-500",
    },
  }[tint];

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-l-4 bg-card px-3 py-2.5",
        palette.border,
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", palette.bg)}>
        <Icon className={cn("h-4 w-4", palette.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 truncate text-base font-bold leading-tight tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function POSButton({
  onClick,
  icon: Icon,
  label,
  hotkey,
  primary,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hotkey: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative h-20 w-full overflow-hidden rounded-xl text-white transition-all",
        "hover:-translate-y-0.5 active:translate-y-0",
        primary
          ? "bg-[color:var(--brand-accent,#eb3c5c)] shadow-[0_12px_28px_-12px_rgba(235,60,92,0.4)] hover:bg-[color:var(--brand-accent,#eb3c5c)]/90"
          : "shadow-[0_8px_22px_-12px_rgba(36,62,99,0.35)] hover:shadow-[0_14px_28px_-12px_rgba(36,62,99,0.45)]",
      )}
      style={
        primary
          ? undefined
          : { background: "linear-gradient(135deg, var(--brand-primary, #00A99D) 0%, #1B3050 100%)" }
      }
    >
      <div className="absolute right-2 top-1.5 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
        {hotkey}
      </div>
      <div className="flex h-full flex-col items-center justify-center gap-1.5">
        <Icon className="h-6 w-6" />
        <span className="text-sm font-semibold tracking-wide">{label}</span>
      </div>
    </button>
  );
}

function KindChip({
  active,
  label,
  icon: Icon,
  count,
}: {
  active?: boolean;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count: number;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold",
        "h-7",
        active
          ? "border-[color:var(--brand-primary,#00A99D)] bg-[color:var(--brand-primary,#00A99D)] text-white"
          : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] tabular-nums",
          active ? "bg-white/25" : "bg-slate-200/70 dark:bg-slate-800/70",
        )}
      >
        {count}
      </span>
    </span>
  );
}

function OrderRow({
  order,
  now,
  onOpen,
}: {
  order: Invoice;
  now: number;
  onOpen: () => void;
}) {
  const isCompany = !!order.companyName;
  const clientName = order.companyName || order.patientName || "Cliente";
  const itemsCount = order.items?.length ?? 0;
  const isEmergency = (order.notes ?? "").toLowerCase().includes("emergencia");
  const Icon = isCompany ? Building2 : ClipboardList;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
        isEmergency
          ? "border-l-4 border-l-rose-600 bg-rose-50/60 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30"
          : "hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          isCompany
            ? "bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold">{clientName}</span>
          {isEmergency && (
            <Badge className="h-4 animate-pulse border-0 bg-rose-600 px-1.5 text-[9px] font-bold text-white">
              EMERGENCIA
            </Badge>
          )}
          <Badge
            variant={STATUS_VARIANT[order.status] ?? "secondary"}
            className="h-4 px-1.5 text-[10px]"
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate font-mono text-xs text-muted-foreground">
          <span>{order.invoiceNumber || "—"}</span>
          <span className="opacity-40">·</span>
          <span>
            {itemsCount} {itemsCount === 1 ? "ítem" : "ítems"}
          </span>
          <span className="opacity-40">·</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>
      <div
        className="ml-2 shrink-0 text-xs tabular-nums text-muted-foreground"
        suppressHydrationWarning
      >
        {now && order.issuedAt ? relativeTime(order.issuedAt, now) : ""}
      </div>
    </button>
  );
}

function HotkeyHint({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold">
        {k}
      </span>
      <span className="hidden text-slate-400 md:inline">{label}</span>
    </div>
  );
}
