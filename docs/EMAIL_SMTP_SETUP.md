# Email / SMTP setup

Operations runbook for the Thumeka email stack. Last updated when we
moved Supabase auth emails off the built-in sender (which was racking
up bounce warnings) onto **Resend SMTP**, the same provider every other
transactional email already uses.

## Current architecture

| Email kind | Sender | Triggered by |
|---|---|---|
| Sign-up confirmation | **Supabase Auth → Resend SMTP** (after the swap below) | `supabase.auth.signUp()` in [app/auth/actions.ts](../app/auth/actions.ts) |
| Welcome | Resend (HTTP API) | `/auth/callback` after confirmation |
| Application submitted / approved / rejected | Resend (HTTP API) | Provider + driver apply / admin approve / admin reject |
| Order requested / accepted / completed | Resend (HTTP API) | Checkout + provider accept + driver complete |
| Payment confirmed | Resend (HTTP API) | Admin EFT confirm |
| Driver assigned | Resend (HTTP API) | Admin assign driver |
| Payout created / paid | Resend (HTTP API) | Admin create + mark paid |

Everything except sign-up confirmation lives in
[lib/email.ts](../lib/email.ts) and the React Email components in
[emails/](../emails/). The validator that gates incoming addresses
before any of this fires is `validateEmail()` in
[lib/validators.ts](../lib/validators.ts).

## One-time Resend SMTP swap (Supabase dashboard)

Required env vars on the deploy: `RESEND_API_KEY` (already set) and
`EMAIL_FROM` (optional — defaults to `Thumeka <noreply@thumeka.co.za>`).

1. **Verify the sending domain in Resend.**
   - Resend dashboard → Domains → `thumeka.co.za`.
   - SPF, DKIM, and DMARC must all be green. If any are missing, copy
     the records into the DNS panel and re-verify before continuing.
2. **Generate SMTP credentials.**
   - Resend dashboard → SMTP → "Create SMTP credentials".
   - Save the host (`smtp.resend.com`), port (`465` for TLS or `587`
     for STARTTLS), username (`resend`), and the generated password
     somewhere safe — you only see the password once.
3. **Switch Supabase Auth to custom SMTP.**
   - Supabase dashboard → Project `cvuurtscwatpowatncmf` → Project
     Settings → Auth → "Email settings" → SMTP Settings.
   - Toggle **Enable Custom SMTP** on.
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: the password from step 2
   - Sender name: `Thumeka`
   - Sender email: `noreply@thumeka.co.za` (must be on a verified
     Resend domain)
   - Save.
4. **Send a test email.**
   - The same SMTP-settings page has a "Send test email" button.
   - Use a real address you control. If it doesn't arrive within a
     minute, check Resend's "Emails" log + your spam folder.
5. **Trigger a real signup.**
   - Open `/auth/register` on production with a fresh email address.
   - The confirmation email should arrive from `noreply@thumeka.co.za`
     and show as a Resend send in the Resend dashboard.
6. **Monitor bounce rate.**
   - For 48 hours after the swap, watch Resend → Dashboard → Bounces.
   - Anything over 5% means we still have a validation gap — extend
     the disposable-domain blocklist in
     [lib/validators.ts](../lib/validators.ts) or add the offending
     typo to the suggestion map in
     [components/email-input.tsx](../components/email-input.tsx).

## Why this beats the Supabase built-in sender

- Supabase's built-in mail uses a shared IP with aggressive bounce
  policies — one wave of mistyped addresses can trip the project's
  email quota for everyone on the project.
- Resend already authenticates from `thumeka.co.za` (SPF + DKIM +
  DMARC), so deliverability is solid and bounce telemetry is in one
  dashboard rather than split across two providers.
- All other transactional emails go through Resend already; this
  consolidates the stack.

## Rollback

If something breaks immediately after the swap:

1. Supabase dashboard → Auth → SMTP Settings → toggle **Enable
   Custom SMTP** off → Save.
2. Supabase reverts to the built-in sender within a minute.
3. The bounce-rate clock starts over, but at least signups still work.

## Related code

- [lib/validators.ts](../lib/validators.ts) — `validateEmail()` server
  guard + disposable-domain blocklist.
- [components/email-input.tsx](../components/email-input.tsx) —
  client-side "Did you mean?" hint.
- [app/auth/actions.ts](../app/auth/actions.ts) — `registerAction`
  uses `validateEmail()` before reaching Supabase.
- [lib/email.ts](../lib/email.ts) — Resend HTTP API wrapper. Skips
  silently when `RESEND_API_KEY` is unset (local dev).
