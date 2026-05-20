# subscription-rental

Monthly subscription rental process for Spotly. Stripe owns recurring billing (Option B); Sharetribe
owns the transaction record and listing availability.

## Business rules (configured)

| Rule | Value |
|------|-------|
| Cancellation | End of billing period (`cancel_at_period_end` in Stripe) |
| Billing cycle | 1st of every month |
| Trial period | None |

## States

| State | Purpose |
|-------|---------|
| `pending-payment` | Checkout started; awaiting first PaymentIntent |
| `payment-confirmed` | Customer confirmed payment; server must create Stripe Subscription |
| `active` | Subscription live; booking blocks availability |
| `payment-overdue` | Renewal charge failed (Stripe retrying) |
| `cancelled` | Ended (cancel at period end or operator cancel) |
| `expired` | All payment retries exhausted |
| `payment-expired` | Checkout not completed within 15 minutes |

## Key transitions

| Transition | Actor | Notes |
|------------|-------|-------|
| `request-payment` | Customer | Creates pending booking + PaymentIntent |
| `confirm-payment` | Customer | Confirms PaymentIntent (3DS) |
| `confirm-subscription` | Operator (server) | Accepts booking → `active` |
| `extend-subscription` | Operator (server) | Extends booking on `invoice.paid` |
| `payment-overdue` | Operator (server) | On `invoice.payment_failed` |
| `reactivate-subscription` | Operator (server) | After successful retry |
| `cancel-subscription` | Operator (server) | Releases booking at period end |
| `expire` | Operator (server) | After all retries fail |

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
