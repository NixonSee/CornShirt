"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, LogOut, Menu, UserRound, X } from "lucide-react";
import { NAV_BY_AUDIENCE, type NavAudience, type Role } from "../navConfig";
import { useScrollDirection } from "./useScrollDirection";

export interface SiteNavProps {
  /** Authenticated dashboard role. Omitted or null renders the public navbar. */
  role?: Role | null;
  /** Legacy visitor hint that forces the About link active. Public pages only. */
  active?: "about";
  /** Login destination for the public CTA; carries ?returnTo= on event pages. */
  loginHref?: string;
}

/**
 * The single navbar for every surface: logo on the left, a centre pill of links
 * with a filled active pill, and a rounded action pill on the right. Below the
 * pill breakpoint it collapses to the hamburger drawer.
 *
 * The bar is fixed and hides on scroll-down / reveals on scroll-up, so it also
 * renders its own spacer to replace the flow it used to occupy when sticky.
 */
export default function SiteNav({
  role = null,
  active,
  loginHref = "/login",
}: SiteNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { hidden, atTop } = useScrollDirection();

  const audience: NavAudience = role ?? "visitor";
  const isVisitor = audience === "visitor";
  const { items } = NAV_BY_AUDIENCE[audience];
  const homeHref = isVisitor ? "/visitor" : `/${audience}`;

  // Profile moves out of the centre pill and into the account menu, which is
  // also the only place to sign out. The drawer still lists every item.
  const profileItem = items.find((item) => item.href.endsWith("/profile"));
  const pillItems = items.filter((item) => item !== profileItem);

  const close = useCallback(() => setOpen(false), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Never slide the bar away while the drawer is open.
  const barHidden = hidden && !open;

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

  // Close the account menu on outside click, on Escape, and on navigation.
  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) closeMenu();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  async function handleSignOut() {
    // Imported lazily so the Supabase client stays out of the public bundle.
    const { supabase } = await import("@/lib/supabaseClient");
    await supabase.auth.signOut();
    router.replace("/visitor");
  }

  function isActive(href: string) {
    if (isVisitor && active === "about") return href === "/visitor/about";
    // Exact match for the dashboard root, prefix match for sub-pages.
    if (href === homeHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const headerClass = [
    "app-topbar", // legacy: base styles + the `> .app-topbar` mobile rules
    "sitenav",
    isVisitor && "visitor-nav", // legacy: 6 x body/html:has(.visitor-nav) rules
    barHidden && "is-hidden",
    atTop && "is-top",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={headerClass} data-audience={audience}>
        <Link
          href={homeHref}
          className={`app-topbar-brand sitenav-brand${
            isVisitor ? " visitor-nav-brand" : ""
          }`}
        >
          <Image
            src="/CornShirt_Hub-removedbg.png"
            alt="CornShirt"
            width={190}
            height={60}
            priority
          />
        </Link>

        <nav className="sitenav-pill" aria-label="Primary navigation">
          {pillItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`sitenav-pill-link${isActive(href) ? " is-active" : ""}`}
              aria-current={isActive(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div
          className={`app-topbar-actions sitenav-actions${
            isVisitor ? " visitor-nav-actions" : ""
          }`}
        >
          {isVisitor ? (
            <Link className="sitenav-cta" href={loginHref}>
              <LogIn size={16} aria-hidden="true" />
              <span>Log In</span>
            </Link>
          ) : (
            <div className="sitenav-account" ref={accountRef}>
              <button
                type="button"
                className={`sitenav-cta sitenav-account-trigger${
                  menuOpen ? " open" : ""
                }`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <UserRound size={16} aria-hidden="true" />
                <span>Profile</span>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className={`sitenav-account-chevron${menuOpen ? " open" : ""}`}
                />
              </button>

              <div
                className={`sitenav-menu${menuOpen ? " open" : ""}`}
                role="menu"
                aria-hidden={!menuOpen}
              >
                {profileItem ? (
                  <Link
                    role="menuitem"
                    href={profileItem.href}
                    className={`sitenav-menu-item${
                      isActive(profileItem.href) ? " is-active" : ""
                    }`}
                    tabIndex={menuOpen ? 0 : -1}
                    onClick={closeMenu}
                  >
                    <UserRound size={16} aria-hidden="true" />
                    {profileItem.label}
                  </Link>
                ) : null}

                <button
                  type="button"
                  role="menuitem"
                  className="sitenav-menu-item sitenav-menu-signout"
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={handleSignOut}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="hamburger sitenav-burger"
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="site-nav-drawer"
            onClick={() => setOpen(true)}
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      {/* Replaces the document flow the bar occupied before it became fixed. */}
      <div className="sitenav-spacer" aria-hidden="true" />

      <div
        className={`nav-overlay${open ? " open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        id="site-nav-drawer"
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

        {/*
          Organizer and customer routes retain the legacy `.side-nav` route
          marker used by their page-specific responsive CSS. Admin routes use
          the unified dashboard theme and intentionally opt out of those old
          amber route themes through the separate `.admin-side-nav` class.
        */}
        <nav className={role === "admin" ? "admin-side-nav" : "side-nav"}>
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

        {isVisitor ? (
          <Link
            className="nav-signout"
            href={loginHref}
            tabIndex={open ? 0 : -1}
            onClick={close}
          >
            <LogIn size={20} />
            Log In
          </Link>
        ) : (
          <button
            type="button"
            className="nav-signout"
            onClick={handleSignOut}
            tabIndex={open ? 0 : -1}
          >
            <LogOut size={20} />
            Sign out
          </button>
        )}
      </aside>
    </>
  );
}
