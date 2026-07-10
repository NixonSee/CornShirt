# Stripe local webhook testing

CornShirt uses Stripe Test Mode for MYR checkout. A browser redirect is not
payment proof; the local webhook must receive `checkout.session.completed`.

## Required `.env.local` values

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`STRIPE_WEBHOOK_SECRET` comes from the Stripe CLI listener below.

## Install the Stripe CLI on Windows

The `stripe` command is not included with the npm `stripe` package. Install the
separate Stripe CLI first.

Recommended on Windows:

```powershell
winget install Stripe.StripeCLI
```

Then close and reopen PowerShell, and verify:

```powershell
stripe --version
```

Alternative if you use npm global tools:

```powershell
npm i -g @stripe/cli
```

If PowerShell still says `stripe` is not recognized, restart your terminal or
add the folder containing `stripe.exe` to your Windows `Path`.

## Run locally

In terminal 1:

```bash
npm run dev
```

In terminal 2:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` value into `.env.local`, then restart
`npm run dev`.

## Test a real Checkout flow

1. Log in as a customer with a ready managed wallet.
2. Open an active event detail page.
3. Click **Buy ticket** for an available ticket type.
4. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
5. Watch the Stripe CLI terminal for `checkout.session.completed`.
6. After the webhook succeeds, check `/customer/tickets` and
   `/customer/transactions`.

`stripe trigger checkout.session.completed` is useful for checking that the
webhook route accepts signed Stripe events, but it will not finalize a CornShirt
ticket unless the event includes this app's checkout metadata.
