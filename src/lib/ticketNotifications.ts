import "server-only";

import type Stripe from "stripe";

import { resolveStripePaymentEmail } from "@/lib/stripe/customerEmail";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  formatMyr,
  sendTransactionalEmail,
  type TransactionalEmailResult,
} from "@/lib/transactionalEmail";

type NotificationContext = {
  eventName: string;
  ticketType: string;
  eventDate: string;
  venue: string;
};

type ProfileContact = {
  name: string;
  email: string;
};

function delivered(result: TransactionalEmailResult): boolean {
  return result.sent || result.skipped === true;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatEventDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "See your ticket for details";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "See your ticket for details";

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

async function loadContext(
  eventId: string,
  ticketTypeId: string | null,
): Promise<NotificationContext> {
  const [eventResult, typeResult] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("event_name, event_date, venue")
      .eq("event_id", eventId)
      .maybeSingle(),
    ticketTypeId
      ? supabaseAdmin
          .from("ticket_types")
          .select("type_name")
          .eq("ticket_type_id", ticketTypeId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    eventName: text(eventResult.data?.event_name, "CornShirt live event"),
    ticketType: text(typeResult.data?.type_name, "Admission ticket"),
    eventDate: formatEventDate(eventResult.data?.event_date),
    venue: text(eventResult.data?.venue, "See your ticket for venue details"),
  };
}

async function loadProfile(userId: string | null): Promise<ProfileContact | null> {
  if (!userId) return null;
  const result = await supabaseAdmin
    .from("profiles")
    .select("name, email")
    .eq("user_id", userId)
    .maybeSingle();

  const email = text(result.data?.email, "");
  if (result.error || !email) return null;
  return {
    name: text(result.data?.name, "CornShirt customer"),
    email: email.toLowerCase(),
  };
}

export function maskEmail(value: string): string {
  const [local, domain] = value.split("@");
  if (!local || !domain) return "the original Stripe payer";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export async function notifyPurchaseConfirmed(input: {
  operationId: string;
  buyerEmail: string | null;
  buyerUserId: string;
  eventId: string;
  ticketTypeId: string | null;
  amountSen: number;
  currency: string;
  checkoutSessionId: string;
  tokenId: number | null;
}): Promise<boolean> {
  const [context, profile] = await Promise.all([
    loadContext(input.eventId, input.ticketTypeId),
    loadProfile(input.buyerUserId),
  ]);
  const to = input.buyerEmail ?? profile?.email ?? null;
  if (!to) return false;

  const result = await sendTransactionalEmail({
    notificationKey: `purchase:${input.operationId}`,
    notificationType: "purchase_success",
    operationId: input.operationId,
    to,
    subject: `Payment successful — ${context.eventName}`,
    eyebrow: "Payment confirmed",
    title: "Your ticket is ready.",
    intro: `We received your Stripe payment and delivered the Ticket NFT for ${context.eventName}.`,
    details: [
      { label: "Event", value: context.eventName },
      { label: "Ticket", value: context.ticketType },
      { label: "Date", value: context.eventDate },
      { label: "Venue", value: context.venue },
      { label: "Paid", value: formatMyr(input.amountSen, input.currency) },
      { label: "Stripe reference", value: input.checkoutSessionId },
      ...(input.tokenId == null
        ? []
        : [{ label: "Token ID", value: String(input.tokenId) }]),
    ],
    note: "Open My Tickets in CornShirt Hub to view your QR code.",
  });

  return delivered(result);
}

export async function notifyRefundConfirmed(input: {
  operationId: string;
  refundId: string;
  recipientEmail: string;
  eventId: string;
  ticketTypeId: string | null;
  amountSen: number;
  currency: string;
  refundReference?: string | null;
}): Promise<boolean> {
  const context = await loadContext(input.eventId, input.ticketTypeId);
  const result = await sendTransactionalEmail({
    notificationKey: `refund:${input.refundId}`,
    notificationType: "refund_success",
    operationId: input.operationId,
    to: input.recipientEmail,
    subject: `Refund successful — ${context.eventName}`,
    eyebrow: "Stripe refund successful",
    title: "Your refund was confirmed.",
    intro: `Stripe confirmed that ${formatMyr(input.amountSen, input.currency)} was returned to the original payment method for this purchase.`,
    details: [
      { label: "Event", value: context.eventName },
      { label: "Ticket", value: context.ticketType },
      { label: "Refund amount", value: formatMyr(input.amountSen, input.currency) },
      { label: "Refund ID", value: input.refundId },
      ...(input.refundReference
        ? [{ label: "Refund reference", value: input.refundReference }]
        : []),
    ],
    note: "Banks can take additional time to display the credit. The refund always returns to the original payment method.",
  });

  return delivered(result);
}

export async function notifyDirectTransferConfirmed(input: {
  operationId: string;
  senderUserId: string;
  recipientUserId: string;
  eventId: string;
  ticketTypeId: string | null;
  transactionHash: string;
}): Promise<boolean> {
  const [context, sender, recipient] = await Promise.all([
    loadContext(input.eventId, input.ticketTypeId),
    loadProfile(input.senderUserId),
    loadProfile(input.recipientUserId),
  ]);
  if (!sender?.email || !recipient?.email) return false;

  const [senderResult, recipientResult] = await Promise.all([
    sendTransactionalEmail({
      notificationKey: `direct-transfer:${input.operationId}:sender`,
      notificationType: "direct_transfer_sent",
      operationId: input.operationId,
      to: sender.email,
      subject: `Ticket transferred — ${context.eventName}`,
      eyebrow: "Transfer complete",
      title: "Your ticket was transferred.",
      intro: `The Ticket NFT for ${context.eventName} is now owned by ${recipient.name}.`,
      details: [
        { label: "Event", value: context.eventName },
        { label: "Ticket", value: context.ticketType },
        { label: "Recipient", value: recipient.email },
        { label: "Blockchain transaction", value: input.transactionHash },
      ],
      note: "This ticket no longer appears as an active ticket in your account.",
    }),
    sendTransactionalEmail({
      notificationKey: `direct-transfer:${input.operationId}:recipient`,
      notificationType: "direct_transfer_received",
      operationId: input.operationId,
      to: recipient.email,
      subject: `You received a ticket — ${context.eventName}`,
      eyebrow: "Ticket received",
      title: "A ticket was transferred to you.",
      intro: `${sender.name} transferred the Ticket NFT for ${context.eventName} to your CornShirt account.`,
      details: [
        { label: "Event", value: context.eventName },
        { label: "Ticket", value: context.ticketType },
        { label: "Date", value: context.eventDate },
        { label: "Venue", value: context.venue },
        { label: "Blockchain transaction", value: input.transactionHash },
      ],
      note: "Open My Tickets in CornShirt Hub to view the ticket and entry QR code.",
    }),
  ]);

  return delivered(senderResult) && delivered(recipientResult);
}

export async function notifyResaleConfirmed(input: {
  operationId: string;
  buyerEmail: string | null;
  buyerUserId: string;
  sellerUserId: string;
  eventId: string;
  ticketTypeId: string | null;
  amountSen: number;
  currency: string;
  transactionHash: string;
}): Promise<boolean> {
  const [context, buyer, seller] = await Promise.all([
    loadContext(input.eventId, input.ticketTypeId),
    loadProfile(input.buyerUserId),
    loadProfile(input.sellerUserId),
  ]);
  const buyerEmail = input.buyerEmail ?? buyer?.email ?? null;
  if (!buyerEmail || !seller?.email) return false;
  const amount = formatMyr(input.amountSen, input.currency);

  const [buyerResult, sellerResult] = await Promise.all([
    sendTransactionalEmail({
      notificationKey: `resale:${input.operationId}:buyer`,
      notificationType: "resale_purchased",
      operationId: input.operationId,
      to: buyerEmail,
      subject: `Resale purchase successful — ${context.eventName}`,
      eyebrow: "Resale purchase complete",
      title: "The ticket is now yours.",
      intro: `Your Stripe payment was confirmed and the existing Ticket NFT for ${context.eventName} was transferred to your wallet.`,
      details: [
        { label: "Event", value: context.eventName },
        { label: "Ticket", value: context.ticketType },
        { label: "Date", value: context.eventDate },
        { label: "Paid", value: amount },
        { label: "Blockchain transaction", value: input.transactionHash },
      ],
      note: "Open My Tickets in CornShirt Hub to view your entry QR code.",
    }),
    sendTransactionalEmail({
      notificationKey: `resale:${input.operationId}:seller`,
      notificationType: "resale_sold",
      operationId: input.operationId,
      to: seller.email,
      subject: `Your ticket sold — ${context.eventName}`,
      eyebrow: "Resale completed",
      title: "Your listed ticket was sold.",
      intro: `CornShirt confirmed the buyer's Stripe payment and transferred the Ticket NFT for ${context.eventName}.`,
      details: [
        { label: "Event", value: context.eventName },
        { label: "Ticket", value: context.ticketType },
        { label: "Sale amount", value: amount },
        { label: "Buyer", value: buyerEmail },
        { label: "Blockchain transaction", value: input.transactionHash },
      ],
      note: "The ticket has been removed from your active tickets and marketplace listings.",
    }),
  ]);

  return delivered(buyerResult) && delivered(sellerResult);
}

function refundPaymentIntentId(refund: Stripe.Refund): string | null {
  const paymentIntent = refund.payment_intent;
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

function refundReference(refund: Stripe.Refund): string | null {
  const destination = refund.destination_details;
  if (!destination || destination.type !== "card") return null;
  return destination.card?.reference ?? null;
}

export async function notifyStripeRefundSucceeded(
  refund: Stripe.Refund,
): Promise<boolean> {
  if (refund.status !== "succeeded") return true;

  const operationResult = await supabaseAdmin
    .from("ticket_operations")
    .select(
      "operation_id, event_id, ticket_type_id, actor_user_id, recipient_user_id, amount_sen, currency, stripe_payment_intent_id",
    )
    .eq("stripe_refund_id", refund.id)
    .maybeSingle();
  const operation = operationResult.data;
  if (operationResult.error || !operation?.operation_id || !operation.event_id) {
    return false;
  }

  const paymentIntentId =
    refundPaymentIntentId(refund) ?? operation.stripe_payment_intent_id;
  const [stripeEmail, profile] = await Promise.all([
    paymentIntentId
      ? resolveStripePaymentEmail(paymentIntentId)
      : Promise.resolve(null),
    loadProfile(operation.recipient_user_id ?? operation.actor_user_id),
  ]);
  const recipientEmail = stripeEmail ?? profile?.email ?? null;
  if (!recipientEmail) return false;

  return notifyRefundConfirmed({
    operationId: operation.operation_id,
    refundId: refund.id,
    recipientEmail,
    eventId: operation.event_id,
    ticketTypeId: operation.ticket_type_id,
    amountSen: Number(operation.amount_sen ?? refund.amount),
    currency: text(operation.currency, refund.currency),
    refundReference: refundReference(refund),
  });
}
