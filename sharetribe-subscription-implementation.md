# Sharetribe Subscription Marketplace — Implementation Tasklist
**Option B: Stripe Subscriptions via Integration API**
**Stack:** Sharetribe Web Template · Node.js · Stripe · Sharetribe CLI

**Phase 1 log:** [sharetribe-subscription-implementation-phase1-log.md](./sharetribe-subscription-implementation-phase1-log.md)

---

## Architecture Summary

```
Browser → Sharetribe Web Template (React)
              ↓
         Node.js Server  ←→  Sharetribe Integration API
              ↓
         Stripe API  →  Stripe Webhooks  →  Node.js Server
```

- **Stripe** owns the billing lifecycle (subscriptions, retries, dunning)
- **Sharetribe** owns availability state and the transaction record
- **Node.js server** is the bridge — listens for Stripe webhooks and calls Sharetribe Integration API to sync state

---

## Confirmed business decisions

| Item | Decision | Status |
|------|----------|--------|
| Cancellation | **End of billing period** (`cancel_at_period_end` in Stripe) | Confirmed |
| Billing cycle | **1st of every month** | Confirmed |
| Trial period | **None** | Confirmed |
| Subscription plan prices | TBD | Open |
| Platform commission % | TBD | Open |
| Stripe account (test + live keys) | Partial — Integration API in `.env`; server Stripe keys commented out | Open |
| Proration (mid-cycle starts) | TBD | Open |

---

## Pre-Development Checklist (Blockers)

Before writing any code, confirm the following with the client:

- [ ] Subscription plan prices
- [x] Billing cycle anchor (day of month) — **1st of month**
- [x] Cancellation policy — **end-of-period**
- [ ] Platform commission %
- [x] Trial period — **none**
- [ ] Stripe account access (Test + Live keys)
- [ ] Proration policy for mid-cycle starts

---

## Phase 0 — Setup

### P0-01 · Collect client business decisions
- Gather all items from the Pre-Development Checklist above
- Document answers before any code is written
- **Partial:** cancellation, billing anchor, and trial are confirmed (see above)

### P0-02 · Stripe account access
- Obtain Test and Live Stripe Secret Keys (`STRIPE_SECRET_KEY`)
- Store in `.env` — never commit to Git
- Verify Stripe Connect setup for provider payouts

### P0-03 · Sharetribe Console access
- Get access to Dev and Live Sharetribe Console environments
- Install and authenticate Sharetribe CLI
- Pull the current transaction process: `flex-cli process pull --process <name>`

### P0-04 · Local dev environment
- Install `ngrok` or Stripe CLI for webhook forwarding to localhost
- Configure `.env` with all required keys
- **Depends on:** P0-02, P0-03

**Environment status (repo):**

| Variable | Status |
|----------|--------|
| `REACT_APP_SHARETRIBE_SDK_CLIENT_ID` | Set |
| `SHARETRIBE_SDK_CLIENT_SECRET` | Set |
| `SHARETRIBE_INTEGRATION_CLIENT_ID` | Set |
| `SHARETRIBE_INTEGRATION_CLIENT_SECRET` | Set |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | Empty |
| `STRIPE_SECRET_KEY` | Commented out |
| `STRIPE_WEBHOOK_SECRET` | Commented out |

---

## Phase 1 — Sharetribe Transaction Process (`process.edn`)

> Work in Dev environment only until Phase 5. Deploy via Sharetribe CLI.

**Status: Deployed to Dev (`alpsalpinerentaspot-dev`) · Alias: `subscription-rental/release-1`**

Details: [sharetribe-subscription-implementation-phase1-log.md](./sharetribe-subscription-implementation-phase1-log.md)

### P1-01 · Create `subscription-rental` transaction process
- [x] Create a new process — do NOT modify the default booking process
- [x] Base it on the `instant-booking` example from [sharetribe/example-processes](https://github.com/sharetribe/example-processes)
- **Location:** `ext/transaction-processes/subscription-rental/`
- **Depends on:** P0-03

### P1-02 · Define subscription states
- [x] Core lifecycle states implemented:

```
pending-payment → payment-confirmed → active
                                      ↓
                              payment-overdue → cancelled / expired
```

Supporting states: `payment-expired` (checkout timeout), `payment-confirmed` (awaiting server activation)

- **Depends on:** P1-01

### P1-03 · Define subscription transitions
- [x] Key transitions implemented:

| Transition | Trigger | Notes |
|---|---|---|
| `request-payment` | Buyer starts checkout | Privileged; creates pending booking + PaymentIntent |
| `confirm-payment` | Customer confirms PaymentIntent | → `payment-confirmed` |
| `confirm-subscription` | Server after Stripe Subscription created | `:privileged? true` → `active` + `accept-booking` |
| `extend-subscription` | Server on `invoice.paid` | `:privileged? true`; `update-booking` |
| `payment-overdue` | Server on `invoice.payment_failed` | `:privileged? true` |
| `reactivate-subscription` | Server after successful retry | `:privileged? true` |
| `cancel-subscription` | Server at period end | `:privileged? true`; `cancel-booking` |
| `expire` | Server after all retries fail | `:privileged? true` |

Additional: `abort-subscription`, `expire-payment`, `cancel-subscription-from-overdue`

- **Depends on:** P1-02

### P1-04 · Configure availability blocking
- [x] `accept-booking` on `confirm-subscription`
- [x] `update-booking` on `extend-subscription` / `reactivate-subscription`
- [x] `cancel-booking` on cancel / expire transitions
- Backend must pass updated booking dates on extend (Phase 2)
- **Depends on:** P1-03

### P1-05 · Deploy and test in Dev
- [x] Create process on Dev: `alpsalpinerentaspot-dev`
- [x] Alias `subscription-rental/release-1` → version 1
- [ ] Verify state graph in Sharetribe Console
- [ ] Run manual transition tests
- **Depends on:** P1-04

```bash
# Marketplace ID
-m alpsalpinerentaspot-dev

# Future updates (after initial create)
flex-cli process push --process subscription-rental \
  --path ext/transaction-processes/subscription-rental \
  -m alpsalpinerentaspot-dev
```

---

## Phase 2 — Backend / Node.js Server

> All Stripe webhook handling and Integration API calls live here. This is the heaviest phase.

### P2-01 · Set up Stripe SDK and Integration API client
```bash
npm install stripe sharetribe-flex-integration-sdk
```
- Configure both clients on server startup
- **Depends on:** P0-02, P0-03

### P2-02 · Privileged transition endpoint (lineItems)
- Modify the server-side `lineItems` handler to support subscription line items
- This endpoint handles the privileged transition that sets pricing before the Stripe charge
- **Depends on:** P2-01

### P2-03 · First-booking handler — create Stripe Subscription
On successful initial checkout:
1. Create a Stripe `Customer` (store `customerId` in Sharetribe transaction metadata)
2. Attach payment method to customer
3. Create Stripe `Subscription` with `billing_cycle_anchor` = **day 1**
4. Store `subscriptionId` in transaction metadata
5. Call `transition/confirm-subscription`

- **Depends on:** P2-01, P2-02, P1-03

### P2-04 · Webhook handler — `invoice.paid`
Fires on every successful monthly charge:
1. Verify webhook signature: `stripe.webhooks.constructEvent()`
2. Look up Sharetribe transaction by `subscriptionId`
3. Extend booking (availability block) for next period via `transition/extend-subscription`
4. If state was `payment-overdue`, use `transition/reactivate-subscription` instead

- **Depends on:** P2-01, P2-03

### P2-05 · Webhook handler — `invoice.payment_failed`
Stripe retries automatically (3× over 7 days by default):
1. Verify webhook signature
2. Transition Sharetribe transaction → `transition/payment-overdue`
3. Email sent via process notification (P4-02)

- **Depends on:** P2-04

### P2-06 · Webhook handler — `customer.subscription.deleted`
Fires when subscription ends (including after `cancel_at_period_end`):
1. Verify webhook signature
2. Transition → `transition/cancel-subscription` (or `expire` if from overdue without recovery)
3. Release availability block

- **Depends on:** P2-04

### P2-07 · Cancellation API endpoint
> This is user-triggered (not a webhook)

`POST /api/cancel-subscription`
1. Cancel Stripe subscription with **`cancel_at_period_end: true`**
2. Keep Sharetribe in `active` until period end; then webhook triggers `cancel-subscription`
3. Return confirmation to frontend

- **Depends on:** P2-01, P2-06

### P2-08 · Stripe Customer Portal session endpoint
`POST /api/billing-portal`
1. Create a Stripe Billing Portal session for the customer
2. Return the portal URL to the frontend

- **Depends on:** P2-01

### P2-09 · Proration for mid-cycle starts
If client wants prorated first charge:
1. Calculate partial amount based on days remaining until the 1st
2. Pass as line item adjustment on the first transaction

- **Depends on:** P2-03

---

## Phase 3 — Frontend (Sharetribe Web Template / React)

### P3-01 · Listing page — subscription display
- Show monthly price (e.g. "£X / month") for subscription-rental listings only
- Replace standard availability calendar with subscription availability status
- Update CTA button copy
- Gate changes behind process type check: only apply to `subscription-rental`
- **Depends on:** P1-05

### P3-02 · Checkout page — subscription flow
Changes required:
- [ ] Replace booking date picker with subscription start date selector
- [ ] Show prorated first payment amount (if applicable)
- [ ] Add card-saving consent / mandate text (required for off-session charges)
- [ ] Update order summary panel for subscription display
- [ ] Remove standard booking confirmation flow; replace with subscription confirmation

- **Depends on:** P2-03

### P3-03 · Transaction process config — frontend state mapping
- Add `src/transactions/transactionProcessSubscription.js`
- Register in `src/transactions/transaction.js`
- Create full mapping for all `subscription-rental` states

- **Depends on:** P1-05, P3-01

### P3-04 · Buyer dashboard — My Subscriptions page
New page at `/account/subscriptions`:
- [ ] List all active and past subscriptions
- [ ] Show next renewal date and amount
- [ ] Payment history
- [ ] Cancel subscription button (calls P2-07)
- [ ] Update payment method button (calls P2-08, opens Stripe Portal)

- **Depends on:** P2-07, P2-08, P3-03

### P3-05 · Provider dashboard — My Spaces / Subscribers view
Add subscriber view to listing management:
- [ ] List active subscribers per space
- [ ] Show next renewal date per subscriber

- **Depends on:** P2-01, P3-03

---

## Phase 4 — Email Notifications (Handlebars + Sharetribe CLI)

> Templates are triggered by transitions in `process.edn`. Deployed with the process via Sharetribe CLI.

### P4-01 · Subscription confirmed
- [x] Templates in repo: `subscription-confirmed-customer`, `subscription-confirmed-provider`
- [x] Triggered on `confirm-subscription`
- Polish copy / branding in Phase 4 if needed

### P4-02 · Payment failed / retry
- [x] Template: `subscription-payment-failed` on `payment-overdue`
- Decide with client: use Stripe dunning emails, custom emails, or both

### P4-03 · Subscription cancelled
- [x] Template: `subscription-cancelled` on `cancel-subscription`

### P4-04 · Renewal reminder *(optional but recommended)*
- [ ] Not implemented — requires scheduled job or Stripe feature
- Sent to **buyer** 3 days before next renewal

---

## Phase 5 — Testing & Go-Live

### P5-01 · Backend unit and integration tests
- Write tests for all webhook handlers and subscription API routes
- Use Stripe test event fixtures
- Mock the Sharetribe Integration API
- **Depends on:** P2-03 → P2-07

### P5-02 · End-to-end subscription lifecycle test
Use [Stripe test cards](https://stripe.com/docs/testing#cards) in Dev environment. Cover:

**Happy path:**
- [ ] Subscribe → first payment → monthly renewal → cancellation

**Failure scenarios:**
- [ ] Payment fails on first charge
- [ ] Payment fails on renewal (retry flow)
- [ ] All retries exhausted → subscription expires
- [ ] Buyer cancels mid-cycle (active until period end)
- [ ] Provider cancels subscription

- **Depends on:** P5-01

### P5-03 · Edge case testing

- [ ] Subscriber tries to book an already-subscribed space
- [ ] Provider tries to edit listing during active subscription
- [ ] Webhook arrives twice (idempotency check)
- [ ] Webhook arrives out of order
- [ ] Proration calculation at month boundaries

- **Depends on:** P5-02

### P5-04 · Staging deployment
- Deploy to staging environment
- Switch to Live Stripe account in **test mode** (not sandbox)
- Run client UAT
- **Depends on:** P5-02, P5-03

### P5-05 · Go-live
- Switch `STRIPE_SECRET_KEY` and webhook secret to production
- Enable real payments
- Monitor first full billing cycle closely
- **Depends on:** P5-04

---

## Security Requirements

| Rule | Detail |
|---|---|
| Never expose `STRIPE_SECRET_KEY` to browser | Server-side only |
| Verify all webhooks | `stripe.webhooks.constructEvent()` — reject invalid signatures |
| All billing transitions must be privileged | `:privileged? true` + operator token from server |
| No secrets in source code or Git | Use environment variables only |

---

## Environment Variables Required

```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Sharetribe
REACT_APP_SHARETRIBE_SDK_CLIENT_ID=...
SHARETRIBE_SDK_CLIENT_SECRET=...
SHARETRIBE_INTEGRATION_CLIENT_ID=...
SHARETRIBE_INTEGRATION_CLIENT_SECRET=...

# App
NODE_ENV=development
```

---

## Reference Links

- [Sharetribe Transaction Process](https://sharetribe.com/docs/concepts/transactions/transaction-process/)
- [Sharetribe Off-Session Payments](https://sharetribe.com/docs/concepts/payments/off-session-payments-in-transaction-process/)
- [Sharetribe Integration API](https://sharetribe.com/docs/introduction/getting-started-with-integration-api/)
- [Stripe Subscriptions Overview](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Billing Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Sharetribe Example Processes (GitHub)](https://github.com/sharetribe/example-processes)
- [Phase 1 implementation log](./sharetribe-subscription-implementation-phase1-log.md)

---

*Internal use only · Updated May 2026*
