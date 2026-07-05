"use client";

import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, Modal, SearchBar } from "@/components/common";

import { shortWallet, type MarketplaceListing } from "./marketplaceData";

export default function MarketplaceClient({
  listings,
}: {
  listings: readonly MarketplaceListing[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "mine">("all");
  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return listings.filter((listing) => {
      if (view === "mine" && !listing.isMine) return false;
      return !needle || `${listing.eventName} ${listing.artist} ${listing.venue} ${listing.ticketType}`.toLowerCase().includes(needle);
    });
  }, [listings, query, view]);

  async function cancelListing() {
    if (!selected) return;
    setIsSubmitting(true);
    setError("");
    const response = await fetch(`/api/customer/marketplace/${selected.id}`, {
      method: "DELETE",
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(body.error ?? "Listing could not be cancelled.");
      return;
    }
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      <div className="marketplace-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search events, artists, venues..." ariaLabel="Search resale listings" fluid />
        <div className="marketplace-tabs">
          <button type="button" className={view === "all" ? "active" : ""} onClick={() => setView("all")}>All listings</button>
          <button type="button" className={view === "mine" ? "active" : ""} onClick={() => setView("mine")}>My listings</button>
        </div>
      </div>

      {visible.length === 0 ? (
        <section className="state-card"><h2>No resale listings found</h2><p className="muted">Eligible tickets listed by customers will appear here.</p></section>
      ) : (
        <section className="marketplace-grid" aria-label="Active resale listings">
          {visible.map((listing) => (
            <article className="marketplace-listing" key={listing.id}>
              <div className="marketplace-art" style={{ backgroundImage: `url("${listing.image}")` }} />
              <div className="marketplace-card-body">
                <span className="marketplace-verified"><ShieldCheck size={15} aria-hidden="true" /> Verified ticket</span>
                <h2>{listing.eventName}</h2><p>{listing.artist} / {listing.ticketType}</p>
                <p><CalendarDays size={16} aria-hidden="true" />{listing.eventDate}</p>
                <p><MapPin size={16} aria-hidden="true" />{listing.venue}</p>
                <p className="muted">Seller {shortWallet(listing.sellerWallet)}</p>
                <strong className="marketplace-price">{listing.price.toLocaleString("en-MY")} DICKEN</strong>
                <Button fullWidth disabled title="DICKEN settlement and NFT transfer are not connected yet">Purchase unavailable</Button>
                {listing.isMine ? <Button fullWidth variant="outline" onClick={() => setSelected(listing)}>Cancel listing</Button> : null}
              </div>
            </article>
          ))}
        </section>
      )}

      <Modal isOpen={selected !== null} onClose={() => setSelected(null)} title="Cancel resale listing" actions={<><Button variant="outline" onClick={() => setSelected(null)}>Keep listing</Button><Button variant="destructive" loading={isSubmitting} onClick={cancelListing}>Cancel listing</Button></>}>
        <p>This removes the ticket from the active Marketplace. The cancellation remains in resale history.</p>
        {error ? <p role="alert" className="customer-account-error">{error}</p> : null}
      </Modal>
    </>
  );
}
