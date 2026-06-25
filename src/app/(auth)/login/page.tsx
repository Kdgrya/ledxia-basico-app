import type { Metadata } from "next";
import Image from "next/image";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,60,92,0.12),_transparent_34rem),linear-gradient(180deg,_#f8fbff_0%,_#eef4f8_100%)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src={BRAND.logo}
            alt={BRAND.name}
            width={256}
            height={65}
            priority
            className="h-auto w-52"
          />
          <p className="mt-3 text-sm font-medium text-muted-foreground">{BRAND.tagline}</p>
          <p className="mt-1 text-sm text-muted-foreground">Accede a tu clínica</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
