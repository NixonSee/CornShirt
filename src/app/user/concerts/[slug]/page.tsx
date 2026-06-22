//Event details page.
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Code2,
  Copy,
  Globe2,
  MapPin,
  Network,
  ShieldCheck,
} from "lucide-react";
import { drops, getDropBySlug } from "../../events";
import SecurePassPanel from "./SecurePassPanel";

export function generateStaticParams() {
  return drops.map((drop) => ({ slug: drop.slug }));
}

export default async function ConcertDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getDropBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative min-h-[500px] overflow-hidden bg-slate-950 text-white">
        <Image
          src="/Background Login Image.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover ${event.imagePosition}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.48)_34%,rgba(15,23,42,0.62)_72%,rgba(15,23,42,0.88)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[500px] max-w-7xl flex-col justify-end px-5 pb-12 sm:px-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-4 py-1 text-xs font-black uppercase text-slate-950">
              Live on Mainnet
            </span>
            <span className="rounded-full bg-black px-4 py-1 text-xs font-black uppercase text-white">
              Limited Tickets
            </span>
          </div>
          <h1 className="mt-6 max-w-5xl text-4xl font-black uppercase leading-none tracking-normal drop-shadow-[0_5px_18px_rgba(0,0,0,0.40)] sm:text-6xl">
            {event.heroTitle}
          </h1>
          <div className="mt-5 flex flex-col gap-3 text-sm font-black uppercase tracking-wide text-white sm:flex-row sm:items-center sm:gap-8">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              {event.fullDate}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-5 w-5" aria-hidden="true" />
              {event.venue}
            </span>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-10">
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:p-7">
              <h2 className="text-3xl font-black tracking-normal text-slate-950">Event Intel</h2>
              <p className="mt-6 max-w-3xl text-base font-medium leading-8 text-slate-900">
                {event.description}
              </p>
            </section>

            <section className="grid gap-6 rounded-lg border border-slate-950 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:grid-cols-3">
              {event.lineup.map((item) => (
                <div key={item.role} className="border-slate-200 sm:border-r sm:last:border-r-0 sm:pr-6">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-950">{item.role}</p>
                  <h3 className="mt-3 text-3xl font-black leading-none tracking-normal text-slate-950">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm font-bold leading-4 text-slate-700">{item.detail}</p>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:p-7">
              <div className="mb-7 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-950">
                <ShieldCheck className="h-4 w-4 text-cyan-600" aria-hidden="true" />
                Smart Contract Transparency
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-600">Contract Address</p>
                  <div className="flex h-12 items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 font-mono text-sm font-black text-slate-950">
                    {event.contractAddress}
                    <Copy className="h-5 w-5 text-slate-600" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-600">Network</p>
                  <div className="flex h-12 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-950">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {event.network}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <SecurePassPanel passes={event.passes} />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm font-medium text-slate-950 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black">CornShirt</p>
            <p className="mt-3">© 2026 CornShirt Protocol. Securely Vibing on the Blockchain.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-black">
            <Link href="/user">Explore Events</Link>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
            <Globe2 className="h-5 w-5" aria-hidden="true" />
            <Code2 className="h-5 w-5" aria-hidden="true" />
            <Network className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </footer>
    </main>
  );
}
