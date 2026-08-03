import type { Address } from "viem";

import { isEventLive } from "@/lib/eventLifecycle";
import { synchronizeFinishedEvents } from "@/lib/eventLifecycle.server";
import { fundCustomerGas } from "@/lib/nft/fundGas";
import { getTicketOwner } from "@/lib/nft/getOwner";
import { transferTicket } from "@/lib/nft/transfer";
import { authorizeApiRole } from "@/lib/requireRole";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadManagedWalletSigner } from "@/lib/walletAccess";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const auth = await authorizeApiRole(["customer", "user"]);
  if (!auth.ok) return auth.response;
  await synchronizeFinishedEvents();

  const body = (await request.json().catch(() => null)) as {
    recipientEmail?: unknown;
    idempotencyKey?: unknown;
  } | null;
  const recipientEmail =
    typeof body?.recipientEmail === "string"
      ? body.recipientEmail.trim().toLowerCase()
      : "";
  const idempotencyKey =
    typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (
    !EMAIL_PATTERN.test(recipientEmail) ||
    !/^[a-zA-Z0-9_-]{16,120}$/.test(idempotencyKey)
  ) {
    return Response.json(
      { error: "Enter a registered recipient email." },
      { status: 400 },
    );
  }

  const { ticketId } = await params;
  const senderId = auth.identity.user.id;
  const [senderResult, recipientResult, ticketResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("wallet_address, wallet_status")
      .eq("user_id", senderId)
      .single(),
    supabaseAdmin
      .from("profiles")
      .select("user_id, wallet_address, wallet_status")
      .ilike("email", recipientEmail)
      .in("role", ["customer", "user"])
      .maybeSingle(),
    supabaseAdmin
      .from("tickets")
      .select(
        "ticket_id, event_id, ticket_type_id, user_id, wallet_address, status, token_id, record_source",
      )
      .eq("ticket_id", ticketId)
      .maybeSingle(),
  ]);

  const senderWallet = String(senderResult.data?.wallet_address ?? "");
  const recipient = recipientResult.data;
  const ticket = ticketResult.data;
  if (
    senderResult.error ||
    senderResult.data?.wallet_status !== "ready" ||
    !senderWallet
  ) {
    return Response.json(
      { error: "Your managed wallet is unavailable." },
      { status: 409 },
    );
  }
  if (
    recipientResult.error ||
    !recipient ||
    recipient.wallet_status !== "ready" ||
    !recipient.wallet_address
  ) {
    return Response.json(
      { error: "A wallet-ready registered customer was not found." },
      { status: 404 },
    );
  }
  if (recipient.user_id === senderId) {
    return Response.json(
      { error: "You cannot transfer a ticket to yourself." },
      { status: 409 },
    );
  }
  if (
    ticketResult.error ||
    !ticket ||
    ticket.user_id !== senderId ||
    String(ticket.wallet_address ?? "").toLowerCase() !==
      senderWallet.toLowerCase()
  ) {
    return Response.json({ error: "Ticket is unavailable." }, { status: 404 });
  }
  if (
    ticket.record_source !== "stripe_nft" ||
    ticket.token_id === null ||
    !["active", "valid"].includes(String(ticket.status).toLowerCase())
  ) {
    return Response.json(
      { error: "Only confirmed active Ticket NFTs can be transferred." },
      { status: 409 },
    );
  }

  const [eventResult, typeResult, listingResult] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("status, event_date")
      .eq("event_id", ticket.event_id)
      .single(),
    supabaseAdmin
      .from("ticket_types")
      .select("transfer_allowed")
      .eq("ticket_type_id", ticket.ticket_type_id)
      .single(),
    supabaseAdmin
      .from("resale_listings")
      .select("listing_id")
      .eq("ticket_id", ticketId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (
    !eventResult.data ||
    !isEventLive(eventResult.data) ||
    typeResult.data?.transfer_allowed !== true ||
    listingResult.data
  ) {
    return Response.json(
      {
        error: listingResult.data
          ? "Cancel the active Marketplace listing before transferring."
          : "This ticket is not eligible for transfer.",
      },
      { status: 409 },
    );
  }

  const chainOwner = await getTicketOwner(BigInt(ticket.token_id)).catch(
    () => null,
  );
  if (!chainOwner) {
    return Response.json(
      { error: "Ticket ownership could not be confirmed on-chain." },
      { status: 409 },
    );
  }

  const existing = await supabaseAdmin
    .from("ticket_operations")
    .select(
      "operation_id, state, actor_user_id, recipient_user_id, ticket_id, asset_transaction_hash",
    )
    .eq("idempotency_key", idempotencyKey)
    .eq("operation_kind", "direct_transfer")
    .maybeSingle();

  if (
    existing.data &&
    (existing.data.actor_user_id !== senderId ||
      existing.data.recipient_user_id !== recipient.user_id ||
      existing.data.ticket_id !== ticketId)
  ) {
    return Response.json({ error: "Transfer request conflicts." }, { status: 409 });
  }

  let operationId = String(existing.data?.operation_id ?? "");
  if (existing.data?.state === "completed") {
    return Response.json({ success: true, operationId });
  }

  if (
    chainOwner.toLowerCase() ===
      String(recipient.wallet_address).toLowerCase() &&
    existing.data?.asset_transaction_hash
  ) {
    const finalized = await supabaseAdmin.rpc("finalize_direct_transfer", {
      p_operation_id: operationId,
      p_asset_transaction_hash: existing.data.asset_transaction_hash,
    });
    if (!finalized.error) {
      return Response.json({ success: true, operationId });
    }
  }

  if (chainOwner.toLowerCase() !== senderWallet.toLowerCase()) {
    return Response.json(
      { error: "Ticket ownership could not be confirmed on-chain." },
      { status: 409 },
    );
  }

  if (!operationId) {
    const operationInsert = await supabaseAdmin
      .from("ticket_operations")
      .insert({
        operation_kind: "direct_transfer",
        state: "pending",
        idempotency_key: idempotencyKey,
        actor_user_id: senderId,
        recipient_user_id: recipient.user_id,
        event_id: ticket.event_id,
        ticket_type_id: ticket.ticket_type_id,
        ticket_id: ticketId,
        amount_sen: 0,
        currency: "MYR",
        wallet_address: senderWallet,
        recipient_wallet_address: recipient.wallet_address,
        token_id: ticket.token_id,
      })
      .select("operation_id")
      .single();

    if (operationInsert.error || !operationInsert.data) {
      return Response.json(
        {
          error:
            operationInsert.error?.code === "23505"
              ? "A transfer or sale is already in progress for this ticket."
              : "Transfer could not be started.",
        },
        { status: operationInsert.error?.code === "23505" ? 409 : 500 },
      );
    }
    operationId = String(operationInsert.data.operation_id);
  }

  try {
    const signer = await loadManagedWalletSigner(senderId);
    await fundCustomerGas(signer.address);
    const result = await transferTicket(
      signer.privateKey,
      signer.address,
      String(recipient.wallet_address) as Address,
      BigInt(ticket.token_id),
      undefined,
      async (hash) => {
        const stored = await supabaseAdmin
          .from("ticket_operations")
          .update({
            state: "asset_submitted",
            asset_transaction_hash: hash,
            updated_at: new Date().toISOString(),
          })
          .eq("operation_id", operationId);
        if (stored.error) throw new Error("Transfer submission was not stored.");
      },
    );

    const finalized = await supabaseAdmin.rpc("finalize_direct_transfer", {
      p_operation_id: operationId,
      p_asset_transaction_hash: result.transactionHash,
    });
    if (finalized.error) throw new Error("Transfer finalization failed.");

    return Response.json({ success: true, operationId });
  } catch (error) {
    console.error("Direct ticket transfer failed", {
      operationId,
      message: error instanceof Error ? error.message : "unknown",
    });
    await supabaseAdmin
      .from("ticket_operations")
      .update({
        state: "delivery_failed",
        safe_error_category: "nft_transfer",
        updated_at: new Date().toISOString(),
      })
      .eq("operation_id", operationId);
    return Response.json(
      { error: "Ticket transfer could not be completed safely." },
      { status: 502 },
    );
  }
}
