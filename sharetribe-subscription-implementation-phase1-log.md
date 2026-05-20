# Phase 1 Implementation Log — `subscription-rental`

Ordered record of what was implemented for Phase 1 (Sharetribe transaction process).  
**Date:** May 2026 · **Status:** Deployed to Dev · **Marketplace:** `alpsalpinerentaspot-dev`

See also: [sharetribe-subscription-implementation.md](./sharetribe-subscription-implementation.md) (master tasklist)

---

## 1. Business decisions (locked in)

| Decision | Value |
|----------|-------|
| Cancellation | **End of billing period** — Stripe `cancel_at_period_end: true`; Sharetribe `cancel-subscription` when period ends |
| Billing cycle | **1st of every month** — Stripe `billing_cycle_anchor` = day 1 (configured in Phase 2) |
| Trial period | **None** |
| Proration (mid-cycle start) | **TBD** — affects Phase 2 first-payment line items |

---

## 2. Files created (in order)

| # | Path | Purpose |
|---|------|---------|
| 1 | `ext/transaction-processes/subscription-rental/process.edn` | Transaction process definition (states, transitions, notifications) |
| 2 | `ext/transaction-processes/subscription-rental/README.md` | Process-specific docs + deploy commands |
| 3 | `ext/transaction-processes/subscription-rental/templates/subscription-confirmed-customer/` | Email: subscription active (buyer) |
| 4 | `ext/transaction-processes/subscription-rental/templates/subscription-confirmed-provider/` | Email: new subscriber (provider) |
| 5 | `ext/transaction-processes/subscription-rental/templates/subscription-payment-failed/` | Email: renewal payment failed (buyer) |
| 6 | `ext/transaction-processes/subscription-rental/templates/subscription-cancelled/` | Email: subscription ended (buyer + provider) |
| 7 | `ext/transaction-processes/subscription-rental/templates/subscription-expired/` | Email: retries exhausted (buyer + provider) |
| 8 | `ext/transaction-processes/README.md` | Updated — added subscription-rental section |
| 9 | `sharetribe-subscription-implementation.md` | Updated — Phase 1 status + business decisions |
| 10 | `sharetribe-subscription-implementation-phase1-log.md` | This file |

**Not in Phase 1 (later phases):**

- `src/transactions/transactionProcessSubscription.js` → Phase 3  
- Node.js Stripe webhooks / Integration API → Phase 2  
- Console listing type using this process → after deploy + Phase 3

---

## 3. Process design (`process.edn`)

Based on [instant-booking](https://github.com/sharetribe/example-processes/tree/master/instant-booking) (auto-accept pattern), adapted for Stripe Subscriptions via server (Option B).

### States

| State | Role |
|-------|------|
| `pending-payment` | Checkout; PaymentIntent created |
| `payment-confirmed` | Customer confirmed PI; server creates Stripe Subscription |
| `active` | Subscription live; `accept-booking` done |
| `payment-overdue` | Renewal failed; Stripe retrying |
| `cancelled` | Ended; booking released |
| `expired` | All retries failed |
| `payment-expired` | Checkout timed out (15 min) |

> `payment-confirmed` is a supporting state between first payment and server `confirm-subscription`.

### Transitions

| Transition | Actor | From → To | Phase 2 trigger |
|------------|-------|-----------|-----------------|
| `request-payment` | Customer (privileged) | initial → pending-payment | Checkout |
| `confirm-payment` | Customer | pending-payment → payment-confirmed | After 3DS / PI confirm |
| `confirm-subscription` | Operator (privileged) | payment-confirmed → active | After Stripe Subscription created |
| `extend-subscription` | Operator (privileged) | active → active | `invoice.paid` (renewal) |
| `payment-overdue` | Operator (privileged) | active → payment-overdue | `invoice.payment_failed` |
| `reactivate-subscription` | Operator (privileged) | payment-overdue → active | Successful retry |
| `cancel-subscription` | Operator (privileged) | active → cancelled | Period end / `customer.subscription.deleted` |
| `cancel-subscription-from-overdue` | Operator (privileged) | payment-overdue → cancelled | Operator cancel while overdue |
| `expire` | Operator (privileged) | payment-overdue → expired | Retries exhausted |
| `abort-subscription` | Operator (privileged) | payment-confirmed → cancelled | Server failure after PI confirm |
| `expire-payment` | System | pending-payment → payment-expired | 15 min timeout |

### Availability (P1-04)

- **Block:** `accept-booking` on `confirm-subscription`
- **Extend:** `update-booking` on `extend-subscription` and `reactivate-subscription` (Phase 2 passes new end date)
- **Release:** `cancel-booking` on `cancel-subscription`, `cancel-subscription-from-overdue`, `expire`, `abort-subscription`

### Notifications (email templates in repo)

| Notification | Transition | Recipient |
|--------------|------------|-----------|
| `subscription-confirmed-customer` | `confirm-subscription` | Customer |
| `subscription-confirmed-provider` | `confirm-subscription` | Provider |
| `subscription-payment-failed` | `payment-overdue` | Customer |
| `subscription-cancelled` | `cancel-subscription` | Customer + Provider |
| `subscription-expired` | `expire` | Customer + Provider |

Renewal reminder (P4-04) — **not implemented** (optional).

---

## 4. Validation

Process validated locally:

```bash
flex-cli process --path ext/transaction-processes/subscription-rental
```

Result: valid — 7 states, 11 transitions, 7 notifications (exit code 0).

---

## 5. Deploy to Dev

**Marketplace ID:** `alpsalpinerentaspot-dev`

Deployed 2026-05-20:

```bash
flex-cli process create \
  --process subscription-rental \
  --path ext/transaction-processes/subscription-rental \
  -m alpsalpinerentaspot-dev

flex-cli process create-alias \
  -m alpsalpinerentaspot-dev \
  --process subscription-rental \
  --version 1 \
  --alias release-1
```

**Alias in use:** `subscription-rental/release-1` (version 1)

> For later edits to `process.edn`, use `flex-cli process push` (not `create`).

**Do not** attach `subscription-rental/release-1` to a listing type until Phase 3 frontend is ready.

### Console checks (P1-05)

- [x] Process created on Dev (`subscription-rental` v1)
- [x] Alias `subscription-rental/release-1` points to version 1
- [ ] Verify state graph in Console → **Build → Transaction processes**
- [ ] Manual transition test (Integration API operator token)

---

## 6. Phase 2 transition mapping (reference)

| Stripe event | Sharetribe transition |
|--------------|----------------------|
| First checkout + Subscription created | `confirm-subscription` |
| `invoice.paid` (renewal) | `extend-subscription` |
| `invoice.payment_failed` | `payment-overdue` |
| Payment recovered | `reactivate-subscription` |
| `customer.subscription.deleted` (period end) | `cancel-subscription` |
| All retries failed | `expire` |

---

*Next: Phase 2 — Node.js server (Stripe SDK, webhooks, Integration API).*
