import Footer from "@/components/Footer";
import RoleNav from "@/components/RoleNav";
import { getMarketplacePageData } from "@/lib/marketplace";
import { requireRole } from "@/lib/requireRole";

import MarketplaceClient from "./MarketplaceClient";

export const dynamic = "force-dynamic";

export default async function CustomerMarketplacePage() {
  const { user } = await requireRole(["customer", "user"]);
  const { listings, error } = await getMarketplacePageData(user.id);
  return (
    <div className="app-shell">
      <RoleNav role="customer" />
      <main className="shell-main marketplace-page">
        <header className="marketplace-heading"><p className="section-kicker">Customer resale</p><h1>Marketplace</h1><p>{listings.length} active {listings.length === 1 ? "listing" : "listings"}</p></header>
        {error ? <section className="state-card" role="alert"><h2>Marketplace unavailable</h2><p className="muted">{error}</p></section> : <MarketplaceClient listings={listings} />}
      </main>
      <Footer />
    </div>
  );
}
