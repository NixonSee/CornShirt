//Ticket selection / purchase panel on the event details page
"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Zap } from "lucide-react";
import type { ConcertPass } from "../../events";

type SecurePassPanelProps = {
  passes: ConcertPass[];
};

const platformFee = 0.002;
const estimatedGas = 0.005;

export default function SecurePassPanel({ passes }: SecurePassPanelProps) {
  const firstAvailablePass = passes.find((pass) => !pass.soldOut) ?? passes[0];
  const [selectedPassName, setSelectedPassName] = useState(firstAvailablePass.name);
  const [secured, setSecured] = useState(false);

  const selectedPass = useMemo(
    () => passes.find((pass) => pass.name === selectedPassName) ?? firstAvailablePass,
    [firstAvailablePass, passes, selectedPassName],
  );

  const totalDue = selectedPass.priceEth + platformFee + estimatedGas;

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] lg:sticky lg:top-8">
      <h2 className="text-3xl font-black tracking-normal text-slate-950">Secure Pass</h2>
      <div className="mt-6 h-px bg-slate-200" />

      <div className="mt-8 space-y-4">
        {passes.map((pass) => {
          const selected = pass.name === selectedPass.name;

          return (
            <button
              key={pass.name}
              type="button"
              disabled={pass.soldOut}
              onClick={() => {
                setSelectedPassName(pass.name);
                setSecured(false);
              }}
              className={`w-full rounded-md border p-5 text-left transition ${
                selected
                  ? "border-slate-950 bg-slate-50 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                  : "border-slate-200 bg-white hover:border-cyan-300"
              } ${pass.soldOut ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black tracking-wide text-slate-950">{pass.name}</p>
                  <p className="mt-2 text-xs font-semibold leading-4 text-slate-600">{pass.description}</p>
                </div>
                <div className="text-right">
                  {pass.soldOut ? (
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Sold Out</span>
                  ) : (
                    <span className="text-lg font-black text-slate-950">{pass.priceEth.toFixed(3)} ETH</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="space-y-3 text-sm font-bold text-slate-950">
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>{selectedPass.priceEth.toFixed(3)} ETH</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Platform Fee</span>
            <span>{platformFee.toFixed(3)} ETH</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Estimated Gas</span>
            <span>{estimatedGas.toFixed(3)} ETH</span>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between text-2xl font-black text-slate-950">
          <span>Total Due</span>
          <span>{totalDue.toFixed(3)} ETH</span>
        </div>

        <button
          type="button"
          onClick={() => setSecured(true)}
          className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-md bg-yellow-700 px-5 text-sm font-black uppercase tracking-wide text-white shadow-[0_16px_34px_rgba(161,98,7,0.26)] transition hover:-translate-y-0.5 hover:bg-yellow-600"
        >
          {secured ? (
            <>
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Ticket Secured
            </>
          ) : (
            <>
              Mint & Secure Ticket
              <Zap className="h-5 w-5" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="mt-7 text-center text-xs font-medium leading-4 text-slate-600">
          Transaction secured by CornShirt Protocol. No refunds.
        </p>
      </div>
    </aside>
  );
}
