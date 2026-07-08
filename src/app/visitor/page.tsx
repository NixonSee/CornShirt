import Footer from "@/components/Footer";
import VisitorNav from "@/components/VisitorNav";
import { EventDiscovery } from "@/components/visitor&customer";

export default function VisitorPage() {
  return (
    <>
      <title>CornShirt - NFT Concert Tickets in MYR</title>
      <meta
        name="description"
        content="Browse live concerts and buy NFT tickets securely in Malaysian Ringgit on CornShirt."
      />

      <VisitorNav />

      <main>
        <EventDiscovery />
      </main>

      <Footer />
    </>
  );
}
