import "server-only";

import nodemailer from "nodemailer";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type EmailDetail = {
  label: string;
  value: string;
};

export type TransactionalEmailInput = {
  notificationKey: string;
  notificationType:
    | "purchase_success"
    | "refund_success"
    | "direct_transfer_sent"
    | "direct_transfer_received"
    | "resale_sold"
    | "resale_purchased";
  operationId: string;
  to: string;
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  details: EmailDetail[];
  note?: string;
};

export type TransactionalEmailResult = {
  sent: boolean;
  skipped?: boolean;
};

const SMTP_USER = process.env.GMAIL_USER?.trim();
const SMTP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.trim();
const FROM_EMAIL =
  process.env.TRANSACTION_FROM_EMAIL?.trim() ||
  process.env.REJECT_FROM_EMAIL?.trim() ||
  (SMTP_USER ? `CornShirt Hub <${SMTP_USER}>` : "CornShirt Hub");

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASSWORD) return null;
  transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function claimEmail(
  input: TransactionalEmailInput,
): Promise<"claimed" | "already" | "error"> {
  const claimed = await supabaseAdmin.rpc("claim_transactional_email", {
    p_notification_key: input.notificationKey,
    p_notification_type: input.notificationType,
    p_operation_id: input.operationId,
    p_recipient_email: input.to,
  });

  if (claimed.error) {
    console.error("Transactional email could not be claimed", {
      notificationKey: input.notificationKey,
      code: claimed.error.code,
    });
    return "error";
  }

  return claimed.data === true ? "claimed" : "already";
}

async function finishEmail(
  notificationKey: string,
  sent: boolean,
  errorCategory: string | null,
) {
  const finished = await supabaseAdmin.rpc("finish_transactional_email", {
    p_notification_key: notificationKey,
    p_sent: sent,
    p_error_category: errorCategory,
  });

  if (finished.error) {
    console.error("Transactional email result could not be recorded", {
      notificationKey,
      code: finished.error.code,
    });
  }
}

function renderText(input: TransactionalEmailInput): string {
  const details = input.details
    .map(({ label, value }) => `${label}: ${value}`)
    .join("\n");

  return [
    input.title,
    "",
    input.intro,
    "",
    details,
    input.note ? `\n${input.note}` : "",
    "",
    "CornShirt Hub",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderHtml(input: TransactionalEmailInput): string {
  const rows = input.details
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:10px 0;color:#8b949e;font-size:13px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;color:#f0f6fc;font-size:14px;font-weight:700;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
  <html>
    <body style="margin:0;background:#0d1117;color:#f0f6fc;font-family:Arial,sans-serif;">
      <div style="padding:36px 16px;">
        <div style="max-width:600px;margin:0 auto;overflow:hidden;border:1px solid #30363d;border-radius:18px;background:#161b22;">
          <div style="height:5px;background:linear-gradient(90deg,#f6a730,#e57b1b);"></div>
          <div style="padding:34px;">
            <p style="margin:0 0 12px;color:#f6a730;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(input.eyebrow)}</p>
            <h1 style="margin:0;color:#f7f7f7;font-size:28px;line-height:1.15;">${escapeHtml(input.title)}</h1>
            <p style="margin:16px 0 24px;color:#b7c0cb;font-size:15px;line-height:1.65;">${escapeHtml(input.intro)}</p>
            <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #30363d;border-bottom:1px solid #30363d;">${rows}</table>
            ${input.note ? `<p style="margin:22px 0 0;color:#8b949e;font-size:13px;line-height:1.6;">${escapeHtml(input.note)}</p>` : ""}
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<TransactionalEmailResult> {
  const claimed = await claimEmail(input);
  if (claimed === "error") return { sent: false };
  if (claimed === "already") return { sent: false, skipped: true };

  const mailer = getTransporter();
  if (!mailer) {
    await finishEmail(input.notificationKey, false, "smtp_not_configured");
    console.warn("Transactional email SMTP credentials are not configured", {
      notificationKey: input.notificationKey,
    });
    return { sent: false };
  }

  try {
    await mailer.sendMail({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      text: renderText(input),
      html: renderHtml(input),
    });
    await finishEmail(input.notificationKey, true, null);
    return { sent: true };
  } catch (error) {
    console.error("Transactional email delivery failed", {
      notificationKey: input.notificationKey,
      message: error instanceof Error ? error.message : "unknown",
    });
    await finishEmail(input.notificationKey, false, "smtp_delivery");
    return { sent: false };
  }
}

export function formatMyr(amountSen: number, currency = "MYR"): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amountSen / 100);
}
