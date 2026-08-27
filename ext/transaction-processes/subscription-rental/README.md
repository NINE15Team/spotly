# subscription-rental

Monthly subscription rental process for Spotly. Stripe owns recurring billing (Option B); Sharetribe
owns the transaction record and listing availability.

## Business rules (configured)

| Rule | Value |
|------|-------|
| Cancellation | End of billing period (`cancel_at_period_end` in Stripe) |
| Billing cycle | 1st of every month |
| Trial period | None |

## Merchant approval

Like Sharetribe **default-booking**, the first payment is only **preauthorized** at checkout. The
subscription does **not** go live until the **provider (merchant) approves** the request. After
`confirm-payment` the transaction waits in `payment-confirmed` until one of:

- the **provider** accepts (`accept-subscription`) → `active`, OR
- the **provider** declines (`decline-subscription`) → `cancelled` (refund), OR
- the **acceptance window expires** (`expire-acceptance`, system) → `expired` (refund), OR
- an **operator** accepts/declines on the provider's behalf (`confirm-subscription` /
  `abort-subscription`).

The acceptance window (`expire-acceptance`) fires at the earliest of *(entered `payment-confirmed`
+ 6 days)* or *booking start*, mirroring default-booking so the card authorization cannot lapse
unanswered.

## States

| State | Purpose |
|-------|---------|
| `pending-payment` | Checkout started; awaiting first PaymentIntent |
| `payment-confirmed` | First payment **preauthorized** (`requires_capture`); **awaiting provider approval** |
| `active` | Provider approved; subscription live; booking blocks availability |
| `payment-overdue` | Renewal charge failed (Stripe retrying) |
| `cancelled` | Ended (provider/operator decline, cancel at period end, or operator cancel) |
| `expired` | Acceptance window lapsed **or** all renewal retries exhausted |
| `payment-expired` | Checkout not completed within 15 minutes |

## Key transitions

| Transition | Actor | Notes |
|------------|-------|-------|
| `request-payment` | Customer | Creates pending booking + PaymentIntent |
| `confirm-payment` | Customer | Confirms PaymentIntent (3DS) → `payment-confirmed` (preauthorized, `requires_capture`) |
| `accept-subscription` | **Provider** | Approves request: accepts booking + **captures** first payment → `active` |
| `decline-subscription` | **Provider** | Rejects request: full refund → `cancelled` |
| `expire-acceptance` | System (`:at`) | Provider did not respond in time: full refund → `expired` |
| `confirm-subscription` | Operator | Operator-accept fallback (Console / server) → `active` |
| `abort-subscription` | Operator | Operator-decline fallback: full refund → `cancelled` |
| `extend-subscription` | Operator (server) | Extends booking on `invoice.paid` |
| `payment-overdue` | Operator (server) | On `invoice.payment_failed` |
| `reactivate-subscription` | Operator (server) | After successful retry |
| `cancel-subscription` | Operator (server) | Releases booking at period end |
| `expire` | Operator (server) | After all renewal retries fail |

## Who runs the transition (Integration API vs Marketplace API)

The Integration API can only run **operator** transitions
([docs](https://www.sharetribe.com/docs/concepts/transactions/privileged-transitions/#operator-transitions-in-the-integration-api)).
So the provider-actor transitions are run with the **provider's own Marketplace SDK** from
provider-gated server endpoints:

- `POST /api/accept-subscription` — provider auth → creates the Stripe Subscription (Integration
  API + Stripe), then runs `accept-subscription` via the provider's SDK (captures the first
  payment). Stripe billing creation is **idempotent**.
- `POST /api/decline-subscription` — provider auth → runs `decline-subscription` via the provider's
  SDK (refunds the preauthorization).

The Stripe **recurring subscription is created only on acceptance** — never at checkout. The
operator fallback (`confirm-subscription`) still runs via the Integration API
(`POST /api/activate-subscription`) and is wired for Console/back-office use.

## Email templates

23 notifications are defined in `process.edn` covering checkout, approval, renewal, payment
failure, cancellation, and expiry. Templates live in `templates/` (20 template families).

Notable flows:
- `confirm-payment` → customer (`subscription-request-received-customer`) + provider (`subscription-requested-provider`)
- `accept-subscription` / `decline-subscription` → dedicated customer and provider templates (no longer reusing generic cancelled/expired for decline/timeout)
- `extend-subscription` → monthly renewal receipt (`subscription-renewed-customer`)
- `payment-overdue` / `reactivate-subscription` / `cancel-subscription-from-overdue` / `abort-subscription` → both parties notified where applicable

Full matrix: [docs/subscription-email-notifications.md](../../../docs/subscription-email-notifications.md)

See: [Sharetribe booking acceptance](https://www.sharetribe.com/docs/concepts/payments/payments-with-stripe/#provider-acceptance)

## Deploy

**Marketplaces:** `alpsalpinerentaspot-dev` · `alpsalpinerentaspot`

### CLI (preferred)

After editing `process.edn` / templates, **push**, then **repoint the existing alias** — do not
mint a new `release-N` name:

```bash
# Marketplace id: alpsalpinerentaspot-dev | alpsalpinerentaspot
MKT=alpsalpinerentaspot-dev

flex-cli process push --process subscription-rental \
  --path ext/transaction-processes/subscription-rental -m "$MKT"

# Point the EXISTING alias at the new version printed by push (example: --version 6)
flex-cli process update-alias -m "$MKT" \
  --process subscription-rental --version <latest> --alias release-5
```

Same pattern for booking (keep `release-1`, move it to the new version):

```bash
flex-cli process push --process default-booking \
  --path ext/transaction-processes/default-booking -m "$MKT"
flex-cli process update-alias -m "$MKT" \
  --process default-booking --version <latest> --alias release-1
```

| Do | Don't |
|----|--------|
| `process push` then `process update-alias` on the alias already used by the app/Console | `process create-alias … --alias release-6` (forces app + listing-type renames) |

`create-alias` is only for the **first** time an alias name is introduced. Full notes:
[docs/WAIVER_IMPLEMENTATION.md §9](../../../docs/WAIVER_IMPLEMENTATION.md#9-deployment-checklist).

### Status snapshot (2026-08-27 cutover)

This waiver cutover used `create-alias` (`release-6` / `release-2`) and the app was updated to
those names. Prefer `update-alias` on future pushes.

| Field | Dev | Live |
|-------|-----|------|
| Process version (waiver) | **6** | **2** |
| Alias in use | `subscription-rental/release-6` → v6 | `subscription-rental/release-6` → v2 |

Booking: `default-booking/release-2` on both envs.

## Web Template

Frontend process graph (`src/transactions/transactionProcessSubscription.js`) is **Phase 3**.
Do not point a listing type at this process until the template supports it.
