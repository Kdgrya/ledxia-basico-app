"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { Loader2, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import {
  ageFromDob,
  patientFullName,
  patientsCol,
} from "@/lib/data/patients";
import type { Patient } from "@/lib/types";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PatientsClient() {
  const { tenantId } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(patientsCol(tenantId), orderBy("lastName"));
    return onSnapshot(
      q,
      (snap) => {
        setPatients(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Patient, "id">) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [tenantId]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return patients;
    return patients.filter(
      (p) =>
        patientFullName(p).toLowerCase().includes(t) ||
        (p.cedula ?? "").toLowerCase().includes(t),
    );
  }, [patients, term]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pacientes</h2>
          <p className="text-sm text-muted-foreground">Registro de pacientes de la clínica.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo paciente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar por nombre o cédula…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Edad</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {term ? "Sin resultados." : "Aún no hay pacientes."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const age = ageFromDob(p.dob);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{patientFullName(p)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.cedula || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {age != null ? `${age} años` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.phoneMobile || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PatientFormDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenantId={tenantId}
        patient={editing}
      />
    </div>
  );
}
