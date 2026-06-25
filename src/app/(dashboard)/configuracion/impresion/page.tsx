import { PrintingClient } from "./printing-client";

export const metadata = { title: "Impresoras" };

export default function ImpresionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impresoras</h1>
        <p className="text-sm text-muted-foreground">
          Configura las impresoras de recibos y los trabajos de impresión recientes.
        </p>
      </div>
      <PrintingClient />
    </div>
  );
}
