# Production Security / Config Checklist

## Scope
Close pre-release gaps around:
- RLS policies (`subscriptions`, `credits_ledger` / related credit tables)
- Env key hygiene
- Stripe webhook observability

## 1) RLS audit — subscriptions + credits

### subscriptions
- [ ] Confirm RLS enabled on `subscriptions`
- [ ] `SELECT` restricted to owning `auth.uid() = user_id`
- [ ] `INSERT/UPDATE/DELETE` blocked for anon/authenticated user roles unless explicitly required
- [ ] Service role paths only used in server-side webhook/admin flows

### credits / ledger tables
- [ ] Confirm RLS enabled on credit balance + ledger tables
- [ ] Users can only read their own credit rows
- [ ] Direct user writes to ledger are blocked (writes should come from trusted RPC/server path)
- [ ] `add_credits` RPC is security-definer and validates caller path

## 2) Env hygiene
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed client-side
- [ ] `STRIPE_WEBHOOK_SECRET` set in prod env and rotated on incident
- [ ] `NEXT_PUBLIC_*` contains only non-sensitive values
- [ ] Add CI check to fail if service secrets appear in client bundles

## 3) Webhook monitoring
- [x] Structured webhook logs include `event_id`, `event_type`, timestamp
- [ ] Route webhook logs to centralized sink (Datadog/Logflare/Sentry)
- [ ] Add alert for repeated signature verification failures
- [ ] Add alert for repeated processing failures by event type

## Notes
- Structured webhook logging was added in `src/app/api/stripe/webhook/route.ts`.
