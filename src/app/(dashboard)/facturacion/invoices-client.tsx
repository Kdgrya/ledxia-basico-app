"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import {
  subscribeInvoices,
  STATUS_LABEL,
  STATUS_VARIANT,
} from "@/lib/data/billing";
import { formatPrice } from "@/lib/data/services";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function InvoicesClient() {
  const { tenantId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    return subscribeInvoices(tenantId, (invs) => {
      setInvoices(invs);
      setLoading(false);
    });
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Facturación</h2>
          <p className="text-sm text-muted-foreground">Historial de facturas y cargos.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aún no hay facturas. Empieza desde Recepción.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {inv.invoiceNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{inv.patientName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(inv.issuedAt).toLocaleDateString("es-DO")}
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(inv.total)}</TableCell>
                  <TableCell className="text-right">{formatPrice(inv.paidAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[inv.status]}>
                      {STATUS_LABEL[inv.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" render={<Link href={`/facturacion/${inv.id}`} />}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
