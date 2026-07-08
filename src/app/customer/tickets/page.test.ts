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
  assert.equal(result[0].qrValue, "cornshirt:ticket-1");
});

test("eligible tickets expose a resale listing modal", () => {
  const source = readFileSync(listUrl, "utf8");
  assert.match(source, /List for resale/);
  assert.match(source, /parseResaleMyrPrice/);
  assert.match(source, /\/api\/customer\/marketplace/);
  assert.match(source, /This ticket type does not allow resale/);
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
  assert.match(source, />\s*Transfer unavailable\s*</);
  assert.doesNotMatch(source, /AURORA LIVE|SONIC BLOOM/);
});

test("ticket styles enforce a single-column stack and ticket notches", () => {
  const styles = readFileSync(stylesUrl, "utf8");

  assert.match(
    styles,
    /\.ticket-stack\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr;/s,
  );
  assert.match(styles, /\.ticket-pass::before/);
  assert.match(styles, /\.ticket-pass::after/);
  assert.match(
    styles,
    /\.ticket-pass-actions\s*\{[^}]*border-left:\s*1px dashed/s,
  );
});
