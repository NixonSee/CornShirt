import Footer from "@/components/Footer";
import VisitorNav from "@/components/VisitorNav";
import { EventDiscovery } from "@/components/visitor&customer";

export default function VisitorPage() {
  return (
    <>
      <title>CornShirt - NFT Concert Tickets with DICKEN</title>
      <meta
        name="description"
        content="Browse live concerts and buy NFT tickets with DICKEN tokens on CornShirt."
      />

      <VisitorNav />

      <main>
        <EventDiscovery />
      </main>

      <Footer />
    </>
  );
}
