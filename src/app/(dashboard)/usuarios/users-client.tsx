"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { createUserFn, updateUserFn } from "@/lib/firebase/functions";
import { useAuth } from "@/lib/auth/context";
import { ALL_MODULES, BUILTIN_ROLES, permissionsForRole, type ModuleKey } from "@/lib/modules";
import type { ClinicUser } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function UsersClient() {
  const { tenantId } = useAuth();
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicUser | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const ref = collection(db, "tenants", tenantId, "users");
    return onSnapshot(
      ref,
      (snap) => {
        setUsers(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<ClinicUser, "id">) }))
            .sort((a, b) => a.displayName.localeCompare(b.displayName)),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [tenantId]);

  async function toggleActive(u: ClinicUser) {
    try {
      await updateUserFn({ uid: u.id, active: !u.active });
      toast.success(u.active ? "Usuario desactivado" : "Usuario activado");
    } catch {
      toast.error("No se pudo actualizar el usuario");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Personal de la clínica y sus permisos por módulo.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo usuario
        </Button>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aún no hay usuarios.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const perms = u.permissions ?? permissionsForRole(u.role);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.displayName}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{BUILTIN_ROLES[u.role]?.label ?? u.role}</TableCell>
                    <TableCell className="text-muted-foreground">{perms.length}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "default" : "secondary"}>
                        {u.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(u);
                          setDialogOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                        {u.active ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UserDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editing}
      />
    </div>
  );
}

function UserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: ClinicUser | null;
}) {
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [role, setRole] = useState(user?.role ?? "recepcion");
  const [perms, setPerms] = useState<ModuleKey[]>(
    user?.permissions ?? permissionsForRole(user?.role ?? "recepcion"),
  );
  const [saving, setSaving] = useState(false);

  function onRoleChange(next: string) {
    setRole(next);
    // Pre-fill modules from the role's defaults when switching roles.
    setPerms(permissionsForRole(next));
  }

  function toggle(mod: ModuleKey, checked: boolean) {
    setPerms((p) => (checked ? [...new Set([...p, mod])] : p.filter((m) => m !== mod)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && user) {
        await updateUserFn({ uid: user.id, role, permissions: perms, displayName });
        toast.success("Usuario actualizado");
      } else {
        await createUserFn({ email: email.trim(), password, displayName, role, permissions: perms });
        toast.success("Usuario creado");
      }
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualiza el rol y los permisos." : "Crea una cuenta para tu personal."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña temporal</Label>
                <Input
                  id="password"
                  type="text"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => onRoleChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {Object.entries(BUILTIN_ROLES).map(([key, r]) => (
                <option key={key} value={key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
