"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { NAV_BY_ROLE, type Role } from "./navConfig";

interface RoleNavProps {
  role: Role;
}

/**
 * Slim top bar with a hamburger button (all screen sizes) that opens a
 * role-aware slide-out drawer. Replaces the persistent dashboard sidebar.
 */
export default function RoleNav({ role }: RoleNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const { items } = NAV_BY_ROLE[role];

  const close = useCallback(() => setOpen(false), []);

  // Close on Escape and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/visitor");
  }

  function isActive(href: string) {
    // Exact match for the dashboard root, prefix match for sub-pages.
    if (href === `/${role}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="app-topbar">
        <Link href={`/${role}`} className="app-topbar-brand">
          <Image
            src="/CornShirt Hub.png"
            alt="CornShirt"
            width={190}
            height={50}
            priority
          />
        </Link>

        <div className="app-topbar-actions">
          <button
            type="button"
            className="hamburger"
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="role-nav-drawer"
            onClick={() => setOpen(true)}
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      <div
        className={`nav-overlay${open ? " open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        id="role-nav-drawer"
        className={`nav-drawer${open ? " open" : ""}`}
        aria-label="Main navigation"
        aria-hidden={!open}
      >
        <div className="nav-drawer-head">
          <button
            type="button"
            className="hamburger"
            aria-label="Close navigation menu"
            onClick={close}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="side-nav">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? "active" : undefined}
              tabIndex={open ? 0 : -1}
              onClick={close}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="nav-signout"
          onClick={handleSignOut}
          tabIndex={open ? 0 : -1}
        >
          <LogOut size={20} />
          Sign out
        </button>
      </aside>
    </>
  );
}
