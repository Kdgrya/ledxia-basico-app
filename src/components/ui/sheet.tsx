"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Panel a pantalla completa que sube desde abajo; para flujos que no caben en un diálogo.
export function Sheet({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  // Cierra con Escape y bloquea el scroll del body mientras está abierto.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
      <div className="flex shrink-0 items-center gap-3 border-b bg-muted/20 px-4 py-3 md:px-6">
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary, #00A99D) 0%, #2E5180 100%)",
            }}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-tight">{title}</h2>
          {description && (
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {headerExtra}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={onClose}
        >
          <X className="mr-1 h-4 w-4" />
          Cerrar
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {footer && (
        <div className="shrink-0 border-t bg-background px-4 py-3 md:px-6">
          {footer}
        </div>
      )}
    </div>,
    document.body,
  );
}

// Contenedor centrado y con ancho máximo para secciones del sheet.
export function SheetSection({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl px-4 py-5 md:px-6", className)}>
      {children}
    </div>
  );
}
