import { EcfClient } from "./ecf-client";

export const metadata = { title: "e-CF / DGII" };

export default function EcfPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">e-CF / DGII</h1>
        <p className="text-sm text-muted-foreground">
          Configuración de comprobantes fiscales electrónicos para la DGII.
        </p>
      </div>
      <EcfClient />
    </div>
  );
}
