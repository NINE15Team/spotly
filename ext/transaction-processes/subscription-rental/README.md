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

## Deploy (Dev)

**Marketplace:** `alpsalpinerentaspot-dev`

| Field | Value |
|-------|--------|
| Latest pushed version | **6** (waiver operator self-loops; pushed 2026-08-11) |
| Active alias | `subscription-rental/release-5` → still points at version **5** |
| Alias cut | **Deferred** — leave `release-5` until current dev testing is finished |

Same pattern for booking: `default-booking` latest is version **2**; live alias
`default-booking/release-1` still points at version **1**. Details:
[docs/WAIVER_IMPLEMENTATION.md §9](../../../docs/WAIVER_IMPLEMENTATION.md#9-deployment-checklist).

First-time create (done):

```bash
flex-cli process create --process subscription-rental \
  --path ext/transaction-processes/subscription-rental -m alpsalpinerentaspot-dev
flex-cli process create-alias -m alpsalpinerentaspot-dev \
  --process subscription-rental --version 1 --alias release-1
```

Push only (done for waiver; aliases intentionally skipped while someone tests on dev):

```bash
flex-cli process push --process subscription-rental \
  --path ext/transaction-processes/subscription-rental -m alpsalpinerentaspot-dev
# → Version 6 saved. Do NOT create/update alias yet.
```

**TODO — when dev testing is clear, cut the alias to the waiver version:**

```bash
flex-cli process create-alias -m alpsalpinerentaspot-dev \
  --process subscription-rental --version 6 --alias release-6
# then bump app constants to subscription-rental/release-6 and re-point listing types in Console
```

Optionally, for booking:

```bash
flex-cli process create-alias -m alpsalpinerentaspot-dev \
  --process default-booking --version 2 --alias release-2
```

Then attach the new alias(es) to listing types in Sharetribe Console (and re-save listings that still
have an older alias in public data).

## Web Template

Frontend process graph (`src/transactions/transactionProcessSubscription.js`) is **Phase 3**.
Do not point a listing type at this process until the template supports it.
