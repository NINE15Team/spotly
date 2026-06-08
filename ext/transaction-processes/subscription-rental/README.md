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

`subscription-requested-provider` notifies the provider on `confirm-payment` that a request awaits
approval. Acceptance reuses `subscription-confirmed-customer`; decline reuses `subscription-cancelled`;
the acceptance timeout reuses `subscription-expired`.

See: [Sharetribe booking acceptance](https://www.sharetribe.com/docs/concepts/payments/payments-with-stripe/#provider-acceptance)

## Deploy (Dev)

**Marketplace:** `alpsalpinerentaspot-dev` · **Alias:** `subscription-rental/release-1` (already created)

First-time create (done):

```bash
flex-cli process create --process subscription-rental \
  --path ext/transaction-processes/subscription-rental -m alpsalpinerentaspot-dev
flex-cli process create-alias -m alpsalpinerentaspot-dev \
  --process subscription-rental --version 1 --alias release-1
```

Later updates:

```bash
flex-cli process push --process subscription-rental \
  --path ext/transaction-processes/subscription-rental -m alpsalpinerentaspot-dev
```

Then attach `subscription-rental/release-1` to a listing type in Sharetribe Console.

## Web Template

Frontend process graph (`src/transactions/transactionProcessSubscription.js`) is **Phase 3**.
Do not point a listing type at this process until the template supports it.
