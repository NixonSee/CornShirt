import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pageUrl = new URL("./page.tsx", import.meta.url);
const listUrl = new URL("./TicketList.tsx", import.meta.url);
const dataUrl = new URL("./ticketData.ts", import.meta.url);
const stylesUrl = new URL("../../globals.css", import.meta.url);

test("maps live ticket ownership rows into display tickets", async () => {
  assert.equal(existsSync(dataUrl), true);
  const ticketData = await import("./ticketData.ts");
  assert.equal(typeof ticketData.mapCustomerTickets, "function");

  const result = ticketData.mapCustomerTickets(
    [
      {
        ticket_id: "ticket-1",
        event_id: "event-1",
        ticket_type_id: "type-1",
        wallet_address: "0x1234567890abcdef",
        status: "valid",
        record_source: "stripe_nft",
        token_id: "4821",
        transaction_hash: "0xabcdef1234567890",
        qr_code: "cornshirt:ticket-1",
      },
    ],
    [
      {
        event_id: "event-1",
        event_name: "Database Concert",
        artist_name: "Live Artist",
        venue: "Arena Hall",
        event_date: "2026-08-15T12:00:00.000Z",
      },
    ],
    [
      {
        ticket_type_id: "type-1",
        type_name: "General Admission",
        transfer_allowed: true,
      },
    ],
  );

  assert.equal(result[0].eventName, "Database Concert");
  assert.equal(result[0].ticketType, "General Admission");
  assert.equal(result[0].tokenId, "#4821");
  assert.equal(result[0].status, "VALID");
  assert.equal(result[0].transferAllowed, true);
  assert.equal(result[0].hasActiveListing, false);
  assert.equal(result[0].accent, "#36b56a");
  assert.equal(result[0].qrValue, "cornshirt:ticket-1");
  assert.equal(result[0].isNftBacked, true);
});

test("ticket colors communicate valid, used, and active resale states", async () => {
  const ticketData = await import("./ticketData.ts");
  const result = ticketData.mapCustomerTickets(
    [
      { ticket_id: "valid-ticket", status: "valid" },
      { ticket_id: "used-ticket", status: "used" },
      { ticket_id: "listed-ticket", status: "valid" },
    ],
    [],
    [],
    new Set(["listed-ticket"]),
  );

  assert.equal(result[0].accent, "#36b56a");
  assert.equal(result[1].accent, "#d84a4a");
  assert.equal(result[2].accent, "#f6a730");
  assert.equal(result[2].hasActiveListing, true);
});

test("eligible tickets expose a resale listing modal", () => {
  const source = readFileSync(listUrl, "utf8");
  assert.match(source, /List for resale/);
  assert.match(source, /parseResaleMyrPrice/);
  assert.match(source, /\/api\/customer\/marketplace/);
  assert.match(source, /This ticket type does not allow resale/);
  assert.match(source, /className="ticket-resale-modal"/);
  assert.match(source, /showCloseButton/);
  assert.match(source, /data-testid="resale-listing-form"/);
  assert.match(source, /inputMode="decimal"/);
  assert.match(source, /return "LISTED"/);
  assert.match(source, /return "COLLECTIBLE"/);
  assert.match(source, /Check-in closed when the event ended/);
  assert.match(source, /waiting for a buyer/);
});

test("ticket transfer uses the resale modal design system", () => {
  const source = readFileSync(listUrl, "utf8");
  const styles = readFileSync(stylesUrl, "utf8");

  assert.match(
    source,
    /className="ticket-resale-modal ticket-transfer-modal"/,
  );
  assert.match(source, /data-testid="ticket-transfer-form"/);
  assert.match(source, /htmlFor="recipient-email"/);
  assert.match(source, /aria-describedby="recipient-email-help"/);
  assert.match(source, /Direct NFT transfer/);
  assert.match(styles, /\.ticket-transfer-control:focus-within/);
  assert.match(styles, /\.ticket-transfer-note/);
});

test("customer ticket page loads only the authenticated wallet tickets", () => {
  const source = existsSync(pageUrl) ? readFileSync(pageUrl, "utf8") : "";

  assert.match(source, /requireRole\(\["customer", "user"\]\)/);
  assert.match(source, /\.select\("wallet_address"\)/);
  assert.match(source, /\.from\("tickets"\)/);
  assert.match(source, /\.eq\("wallet_address", walletAddress\)/);
  assert.match(source, /\.from\("events"\)/);
  assert.match(source, /\.from\("ticket_types"\)/);
  assert.match(source, /<RoleNav role="customer"\s*\/>/);
  assert.match(source, /<Footer\s*\/>/);
});

test("ticket list renders one ticket-shaped row with QR and safe actions", () => {
  const source = existsSync(listUrl) ? readFileSync(listUrl, "utf8") : "";

  assert.match(source, /className="ticket-stack"/);
  assert.match(source, /className="ticket-pass"/);
  assert.match(source, /className="ticket-pass-actions"/);
  assert.match(source, /<QRCode/);
  assert.match(source, /<Modal/);
  assert.match(source, />\s*View QR\s*</);
  assert.doesNotMatch(source, /Ticket ID/);
  assert.doesNotMatch(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /className="ticket-view-modal"[\s\S]*?showCloseButton/);
  assert.match(source, /className="ticket-view-modal"[\s\S]*?actions=\{null\}/);
  assert.match(source, /Scan this QR code at the entrance\./);
  assert.match(
    source,
    /\["active", "valid"\]\.includes\(ticket\.status\.toLowerCase\(\)\)[\s\S]*?>\s*Transfer\s*</,
  );
  assert.doesNotMatch(source, /Full QR value/);
  assert.match(source, />\s*Transfer\s*</);
  assert.match(source, /recipientEmail/);
  assert.doesNotMatch(source, /AURORA LIVE|SONIC BLOOM/);
});

test("ticket filters expose lifecycle counts, sorting, and a mobile-safe empty state", () => {
  const source = readFileSync(listUrl, "utf8");
  const styles = readFileSync(stylesUrl, "utf8");

  assert.match(source, /"all" \| "valid" \| "listed" \| "used"/);
  assert.match(source, /aria-label="Filter tickets by status"/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /ticketCounts\[filter\.value\]/);
  assert.match(source, /TICKET_SORT_RANK/);
  assert.match(source, /className="ticket-filter-empty"/);
  assert.match(
    styles,
    /\.ticket-filter-bar\s*\{[\s\S]*?overflow-x:\s*auto;[\s\S]*?scrollbar-width:\s*none;/,
  );
  assert.match(styles, /\.ticket-filter-chip\.active/);
});

test("ticket styles enforce a single-column stack and ticket notches", () => {
  const styles = readFileSync(stylesUrl, "utf8");

  assert.match(
    styles,
    /\.ticket-stack\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*1fr;/,
  );
  assert.match(styles, /\.ticket-pass::before/);
  assert.match(styles, /\.ticket-pass::after/);
  assert.match(
    styles,
    /\.ticket-pass-actions\s*\{[\s\S]*?border-left:\s*1px dashed/,
  );
});
