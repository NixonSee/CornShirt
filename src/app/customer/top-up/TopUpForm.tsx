"use client";

import { CreditCard, WalletCards } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/common";

import {
  DICKEN_PRESETS,
  formatRinggit,
  parseDickenAmount,
} from "./topUpData";

interface TopUpFormProps {
  walletAddress: string | null;
}

function shortWallet(value: string | null): string {
  if (!value) return "Wallet not assigned";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function TopUpForm({ walletAddress }: TopUpFormProps) {
  const [amountInput, setAmountInput] = useState("500");
  const selectedAmount = parseDickenAmount(amountInput);

  return (
    <div className="top-up-layout">
      <aside className="top-up-wallet-card">
        <Image
          src="/DICKEN token.png"
          alt="DICKEN token"
          width={64}
          height={64}
        />
        <span>Managed wallet</span>
        <strong>{shortWallet(walletAddress)}</strong>
        <p>Balance unavailable until wallet balance support is connected.</p>
      </aside>

      <section className="top-up-form-card">
        <div className="top-up-form-heading">
          <WalletCards aria-hidden="true" />
          <div>
            <p className="section-kicker">Top up wallet</p>
            <h2>Choose an amount</h2>
          </div>
        </div>

        <p className="muted">1 DICKEN = RM 1.00</p>

        <div className="top-up-presets">
          {DICKEN_PRESETS.map((amount) => (
            <button
              type="button"
              className={
                amountInput === String(amount)
                  ? "top-up-preset active"
                  : "top-up-preset"
              }
              onClick={() => setAmountInput(String(amount))}
              key={amount}
            >
              <strong>{amount.toLocaleString("en-MY")}</strong>
              <span>DICKEN</span>
            </button>
          ))}
        </div>

        <label className="field top-up-custom-field">
          <span>Custom DICKEN amount</span>
          <input
            inputMode="numeric"
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder="Enter a whole number"
          />
        </label>

        <div className="top-up-summary">
          <span>You pay</span>
          <strong>
            {selectedAmount ? formatRinggit(selectedAmount) : "RM 0.00"}
          </strong>
        </div>

        <Button fullWidth disabled icon={<CreditCard size={18} />}>
          Stripe checkout coming soon
        </Button>
        <p className="top-up-stripe-note">
          Stripe Test Mode will be connected in a later implementation.
        </p>
      </section>
    </div>
  );
}
