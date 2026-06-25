"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { permissionsForRole, type ModuleKey } from "@/lib/modules";

interface AuthValue {
  user: User | null;
  loading: boolean;
  tenantId?: string;
  role?: string;
  displayName?: string;
  permissions: ModuleKey[];
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string>();
  const [role, setRole] = useState<string>();
  const [displayName, setDisplayName] = useState<string>();
  const [permissions, setPermissions] = useState<ModuleKey[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setTenantId(undefined);
        setRole(undefined);
        setDisplayName(undefined);
        setPermissions([]);
        setLoading(false);
        return;
      }
      // Los claims llevan el tenant y el rol (los fijan las Cloud Functions).
      const token = await u.getIdTokenResult();
      const tid = token.claims.tenantId as string | undefined;
      const r = (token.claims.role as string | undefined) ?? "admin";
      setTenantId(tid);
      setRole(r);

      // El doc del usuario tiene el nombre y los módulos propios.
      let name = u.displayName ?? u.email ?? "Usuario";
      let custom: ModuleKey[] | undefined;
      if (tid) {
        const snap = await getDoc(doc(db, "tenants", tid, "users", u.uid)).catch(() => null);
        const data = snap?.data();
        if (data?.displayName) name = data.displayName as string;
        if (Array.isArray(data?.permissions)) custom = data.permissions as ModuleKey[];
      }
      setDisplayName(name);
      setPermissions(permissionsForRole(r, custom));
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      tenantId,
      role,
      displayName,
      permissions,
      signOut: () => firebaseSignOut(auth),
    }),
    [user, loading, tenantId, role, displayName, permissions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
