# Password Recovery Design

## Goal

Allow existing CornShirt users to securely request a password-reset email from the login page and complete the reset through the existing `/auth/set-password` page.

## Login Experience

- Add a `Forgot password?` button beside the Password label in `src/app/login/page.tsx`.
- Reuse the existing email input rather than adding another form or route.
- If the email input is empty or invalid, show a concise validation message and keep focus on the email field.
- When the email is valid, call `supabase.auth.resetPasswordForEmail()` with `${window.location.origin}/auth/set-password` as `redirectTo`.
- Disable the recovery button while the request is pending.
- After any successful request, show a generic `Check your email` confirmation without revealing whether the email belongs to an account.
- Preserve the existing login, role redirect, return-to-event behavior, signup link, and password-visibility control.

## Set Password Compatibility

- Preserve the current organizer invitation flow that supplies `access_token` and `refresh_token` in the URL hash.
- Add support for a PKCE recovery `code` in the query string by awaiting the session automatically established by `createBrowserClient`. Do not exchange the same code twice.
- If neither credential format exists, preserve the redirect to Login with a missing-token error.
- After either credential format establishes a session, reuse the existing password form and `supabase.auth.updateUser({ password })` behavior.
- Preserve completion, sign-out, and return-to-login behavior.

## Error Handling and Security

- Display Supabase request errors without exposing secrets or account existence.
- Show the same recovery confirmation for valid reset requests regardless of whether a matching account is visible to the client.
- Keep recovery credentials out of application tables and use Supabase Auth exclusively.
- The deployed `/auth/set-password` URL must be included in the Supabase project's allowed redirect URLs.

## Verification

- Add focused coverage for recovery redirect construction and credential selection when feasible within the existing test setup.
- Run targeted ESLint for the login and set-password pages.
- Run the production build; if the known missing local `nodemailer` dependency still blocks it, report that separately from this feature.
- Inspect the final diff to confirm existing login and organizer-invitation behavior remains intact.
