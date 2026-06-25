"use client";

import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar({
  title,
  userName,
  onSignOut,
}: {
  title?: string;
  userName?: string;
  onSignOut?: () => void;
}) {
  const initials = (userName ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={BRAND.icon}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-md md:hidden"
        />
        <h1 className="truncate text-sm font-semibold text-foreground/80">{title ?? ""}</h1>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2" />}>
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-sm">{userName ?? "Usuario"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>{userName ?? "Usuario"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" /> Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
