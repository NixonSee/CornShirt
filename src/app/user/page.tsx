//User Dashboard / Event Listing page
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Clock3,
  Heart,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  WalletCards,
} from "lucide-react";
import { drops, filterOptions, type FilterOption } from "./events";

export default function UserDashboardPage() {
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("latest");
  const [favoriteSlugs, setFavoriteSlugs] = useState(
    () => new Set(drops.filter((drop) => drop.favorite).map((drop) => drop.slug)),
  );

  const filteredDrops = useMemo(() => {
    const rankKey =
      selectedFilter === "coming-soon"
        ? "comingSoonRank"
        : selectedFilter === "ending-soon"
          ? "endingSoonRank"
          : "latestRank";

    return [...drops].sort((a, b) => a[rankKey] - b[rankKey]);
  }, [selectedFilter]);

  return (
    <main className="min-h-screen bg-white/95 text-slate-950">
      <section className="relative min-h-[720px] overflow-hidden bg-slate-950 text-white lg:min-h-[900px]">
        <Image
          src="/Background Login Image.png"
          alt="Festival crowd facing a bright concert stage"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,18,0.50)_0%,rgba(4,8,18,0.24)_28%,rgba(4,8,18,0.70)_68%,rgba(4,8,18,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,rgba(34,211,238,0.25),transparent_30%),linear-gradient(90deg,rgba(236,72,153,0.20),transparent_24%,transparent_76%,rgba(234,179,8,0.16))]" />

        <header className="relative z-20 border-b border-white/15 bg-white/95 px-5 py-4 text-slate-950 shadow-[0_14px_60px_rgba(15,23,42,0.20)] backdrop-blur-xl sm:px-8">
          <nav className="mx-auto flex max-w-7xl items-center gap-4">
            <a href="#" className="flex shrink-0 items-center gap-2" aria-label="CornShirt dashboard">
              <Image
                src="/CornShirt-Logo.png"
                alt="CornShirt"
                width={168}
                height={52}
                className="h-10 w-auto object-contain"
                priority
              />
            </a>

            <div className="hidden h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm lg:flex">
              <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-500"
                placeholder="Search events, artists, or venues"
                aria-label="Search events, artists, or venues"
              />
            </div>

            <div className="ml-auto hidden items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-700 md:flex">
              <a className="rounded-md px-3 py-2 text-cyan-600 hover:bg-cyan-50" href="#">
                Explore Events
              </a>
              <a className="rounded-md px-3 py-2 hover:bg-slate-100" href="#">
                My Tickets
              </a>
            </div>

            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-600"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-600"
              aria-label="Tickets"
            >
              <Ticket className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="hidden h-10 shrink-0 items-center gap-2 rounded-lg bg-yellow-400 px-5 text-xs font-black uppercase text-slate-950 shadow-[0_10px_28px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300 sm:flex"
            >
              <WalletCards className="h-4 w-4" aria-hidden="true" />
              Connect Wallet
            </button>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[610px] max-w-7xl flex-col items-center justify-center px-5 pb-28 pt-20 text-center sm:px-8 lg:min-h-[770px]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/35 bg-fuchsia-500/30 px-4 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_32px_rgba(217,70,239,0.35)] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]" />
            Live Now: Genesis Drops
          </div>

          <h1 className="max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-normal text-white sm:text-6xl lg:text-7xl">
            The future of{" "}
            <span className="text-cyan-300 drop-shadow-[0_0_22px_rgba(34,211,238,0.65)]">
              vibing
            </span>{" "}
            is on-chain
          </h1>
          <p className="mt-5 max-w-xl text-sm font-medium leading-6 text-white/85 sm:text-base">
            Secure, verifiable, and collectible event access powered by CornShirt.
          </p>
          <button
            type="button"
            className="mt-10 h-12 min-w-48 rounded-lg border border-cyan-200/40 bg-cyan-300/20 px-8 text-xs font-black uppercase text-white shadow-[0_0_38px_rgba(34,211,238,0.32)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-cyan-300/30"
          >
            Learn More
          </button>
        </div>

        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/45" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/45" />
          <span className="h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95)]" />
        </div>
      </section>

      <section className="bg-white/95 px-5 pb-16 pt-16 sm:px-8">
        <div className="relative z-30 mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                Verified Access
              </p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-normal text-slate-950 sm:text-4xl">
                Upcoming Drops
              </h2>
            </div>
            <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-xs font-black uppercase text-slate-800 shadow-sm transition focus-within:border-cyan-300 focus-within:ring-4 focus-within:ring-cyan-100 sm:self-auto">
              <span className="inline-flex items-center gap-2 text-slate-500">
                <SlidersHorizontal className="h-4 w-4 text-cyan-500" aria-hidden="true" />
                Filter
              </span>
              <span className="relative">
                <select
                  value={selectedFilter}
                  onChange={(event) => setSelectedFilter(event.target.value as FilterOption)}
                  className="h-8 appearance-none rounded-md bg-slate-50 pl-3 pr-8 text-xs font-black uppercase text-slate-950 outline-none"
                  aria-label="Filter concert drops"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
              </span>
            </label>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDrops.map((drop) => (
              <article
                key={drop.title}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.10)] transition hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.16)]"
              >
                <Link href={`/user/concerts/${drop.slug}`} className="block focus:outline-none focus:ring-4 focus:ring-cyan-200">
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                    <Image
                      src="/Background Login Image.png"
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className={`object-cover ${drop.imagePosition} transition duration-500 group-hover:scale-105`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
                    <div className="absolute left-4 top-4">
                      <span className={`rounded px-3 py-1 text-[10px] font-black uppercase ${drop.statusClass}`}>
                        {drop.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase text-cyan-600">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      On-chain verified
                    </div>
                    <h3 className="min-h-16 text-2xl font-black uppercase leading-none tracking-normal text-slate-950">
                      {drop.title}
                    </h3>
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-xs font-bold text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        {drop.date.includes("Left") ? (
                          <Clock3 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        ) : (
                          <CalendarDays className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        )}
                        {drop.date}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        {drop.location}
                      </span>
                    </div>
                    <span className="mt-5 flex h-11 w-full items-center justify-center rounded-lg border border-slate-950 bg-slate-950 px-4 text-xs font-black uppercase text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition group-hover:-translate-y-0.5 group-hover:bg-cyan-500 group-hover:text-slate-950">
                      {drop.action}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setFavoriteSlugs((current) => {
                      const next = new Set(current);

                      if (next.has(drop.slug)) {
                        next.delete(drop.slug);
                      } else {
                        next.add(drop.slug);
                      }

                      return next;
                    });
                  }}
                  className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30"
                  aria-label={`Save ${drop.title}`}
                >
                  <Heart
                    className={`h-4 w-4 ${favoriteSlugs.has(drop.slug) ? "fill-fuchsia-400 text-fuchsia-400" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
