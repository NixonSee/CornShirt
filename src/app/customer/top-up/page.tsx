import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import TopUpForm from "./TopUpForm";

export const dynamic = "force-dynamic";

export default async function CustomerTopUpPage() {
  const { user } = await requireRole(["customer", "user"]);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("user_id", user.id)
    .maybeSingle();
  const walletAddress = profile?.wallet_address ?? null;

  return (
    <div className="app-shell">
      <title>Top Up DICKEN - CornShirt</title>
      <meta
        name="description"
        content="Preview a DICKEN wallet top-up for your CornShirt account."
      />

      <RoleNav role="customer" />

      <main className="shell-main top-up-page">
        <header className="top-up-page-heading">
          <p className="section-kicker">Customer wallet</p>
          <h1>Top Up DICKEN</h1>
          <p>Choose an amount and preview its Ringgit value.</p>
        </header>

        <TopUpForm walletAddress={walletAddress} />
      </main>

      <Footer />
    </div>
  );
}
