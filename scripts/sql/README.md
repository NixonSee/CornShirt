# CornShirt Supabase migrations

Run migrations manually in the Supabase Dashboard SQL Editor after reviewing
them. Do not paste `.env.local` values into the editor.

## Custodial customer wallets

Run `create-custodial-wallets.sql` before enabling customer wallet
provisioning. It creates the server-only encrypted wallet table, adds wallet
status fields to profiles, enables RLS, and installs the service-role-only
atomic provisioning function.

## Stripe, tickets, and Marketplace workflow

1. Back up the Supabase project.
2. Open `2026-07-23-stripe-ticket-marketplace-workflows.sql`.
3. Run the entire file in one SQL Editor execution.
4. Confirm the three verification queries return:
   - zero ticket types without `price_sen`;
   - existing tickets marked `legacy`;
   - all three workflow tables present.

The migration is additive. It preserves existing ticket, transaction, and
top-up history. Existing tickets without a confirmed `token_id` remain legacy
records and are not eligible for transfer, resale, or QR admission.

## Resale finalization repair

Projects that ran the workflow migration before the resale constraint repair
must next run `2026-07-23-repair-resale-finalization.sql` once in the Supabase
SQL Editor. The repair preserves existing data, allows the `purchased` listing
status and `resale` transaction type, and replaces the idempotent resale
finalization function.

## Three-hour event lifecycle and Marketplace contract

After the Stripe workflow and resale repair migrations, run
`2026-08-03-three-hour-event-lifecycle.sql`. It adds the `completed` event and
`expired` ticket/listing states, installs the service-role lifecycle function,
and adds the on-chain Marketplace listing references. An active event remains
live until exactly three hours after `events.event_date`.
