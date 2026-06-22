"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, User, WalletCards, X } from "lucide-react";
import { useAuth } from "@/context/auth";
import { navItemsByRole } from "@/utils/navItems";

const HIDDEN_ON = ["/login", "/register"];

export default function Navbar() {
  const pathname = usePathname();
  const { user, role, loading, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;

    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  if (HIDDEN_ON.includes(pathname)) {
    return null;
  }

  const navItems = role ? navItemsByRole[role] : [];

  return (
    <>
      <header className="relative z-40 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-xl sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-4">
          <Link href={user ? "/user" : "/login"} className="flex shrink-0 items-center" aria-label="CornShirt">
            <Image
              src="/CornShirt-Logo.png"
              alt="CornShirt"
              width={168}
              height={52}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          {!loading && !user && (
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/user"
                className="text-xs font-black uppercase tracking-wide text-slate-700 transition hover:text-slate-950"
              >
                Browse Events
              </Link>
              <Link href="/login" className="btn-primary flex items-center justify-center text-xs">
                Sign In
              </Link>
            </div>
          )}

          {!loading && user && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="hidden h-10 shrink-0 items-center gap-2 rounded-lg bg-yellow-400 px-5 text-xs font-black uppercase text-slate-950 shadow-[0_10px_28px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300 sm:flex"
              >
                <WalletCards className="h-4 w-4" aria-hidden="true" />
                Connect Wallet
              </button>
              <Link
                href="/profile"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-600"
                aria-label="Profile"
              >
                <User className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-600"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </nav>
      </header>

      {user && (
        <>
          <div
            className={`fixed inset-0 z-50 bg-black/40 transition-opacity ${
              drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`fixed right-0 top-0 z-50 h-full w-72 max-w-[85vw] transform bg-white shadow-[0_0_60px_rgba(15,23,42,0.25)] transition-transform duration-300 ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition ${
                      active
                        ? "bg-slate-950 text-white"
                        : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
