import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { requireRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import TransactionHistory from "./TransactionHistory";
import { mapTransactionRows } from "./transactionData";

export const dynamic = "force-dynamic";

function State({ message }: { message: string }) {
  return <main className="state-page"><section className="state-card"><h1>Transaction History</h1><p className="muted">{message}</p></section></main>;
}

export default async function CustomerTransactionsPage() {
  const { user } = await requireRole(["customer", "user"]);
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("user_id", user.id)
    .maybeSingle();

  const walletAddress = profile?.wallet_address ?? null;
  let content;

  if (profileError) {
    content = <State message="Your managed wallet could not be loaded." />;
  } else if (!walletAddress) {
    content = <State message="Your managed wallet has not been assigned yet." />;
  } else {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select("transaction_id, ticket_id, buyer_id, seller_id, transaction_hash, transaction_type, amount, created_at")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    content = error
      ? <State message="Your transactions could not be loaded right now." />
      : <main className="shell-main"><TransactionHistory transactions={mapTransactionRows(data ?? [])} /></main>;
  }

  return <div className="app-shell"><RoleNav role="customer" />{content}<Footer /></div>;
}
