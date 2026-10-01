# Hako — Refundable Deposits: Scope & Estimate

Prepared by NINE15 · 23 September 2026

This document sets out how refundable deposits would work on the Hako marketplace, following the same rules agreed for Gearly, and gives our estimate. Hako differs from Gearly in one important way — monthly storage and parking are sold as subscriptions that renew automatically — so a large part of this document covers how deposits behave over the life of a subscription and the edge cases that come with it.

## Scope

Merchants set an optional, fixed deposit on a listing. Renters pay it at checkout and Hako holds it. When the rental ends, the merchant has 48 hours to confirm the space was vacated in good order or to claim the deposit; if they take no action, it is released automatically. Claims are all-or-nothing, and Hako makes the final decision on any claim. The merchant absorbs the payment processing fee. Deposits are visible on the listing page.

*On Hako's listing types:* merchants can list a space as **per hour** or **per day** (one-off bookings) or as a **monthly subscription** (recurring billing). Parking and storage are categories, not separate checkout flows. We propose that deposits are available on all three listing types, and the merchant decides per listing whether to set one. In practice we expect deposits mainly on monthly storage and longer parking bookings; see "Decisions we need from you" if you would rather limit them to certain types.

## How it will work

**1 · Listing.** The merchant enters a deposit amount when creating or editing a listing. It is optional and capped at a platform maximum. The amount is shown on the listing page next to the price, marked refundable.

**2 · Checkout.** The renter sees the deposit as its own line, clearly marked refundable and excluded from sales tax. They pay the rental and the deposit in one checkout using the same card; the deposit appears as a separate "Hako Deposit" charge on their statement. The renter accepts the deposit terms alongside the waiver they already sign before paying.

**3 · Merchant approval.** Hako already requires the merchant to approve every booking and subscription request before it goes live. We will match the deposit to that step: at checkout the deposit is **authorised** on the renter's card but not yet taken; it is **captured** the moment the merchant approves. If the merchant declines, or the request expires unanswered (Hako's existing 6-day window), the authorisation is simply released — the renter is never charged and no processing fee is incurred. Card authorisations are valid for 7 days, which comfortably covers the 6-day approval window. This is an improvement over charging at checkout, which Hako's approval step makes possible.

**4 · Holding.** The deposit is held in Hako's Stripe account, alongside the subscription renewals Hako already collects there. It never passes through the merchant's account and is kept separate from rental income, sales tax and commission. For a subscription it is held for the full life of the subscription — months or years.

**5 · Rental end and the 48-hour window.** For hourly and daily bookings the rental ends at the booking end time. For a subscription it ends when the final paid period closes — because the renter cancelled, the merchant or Hako cancelled it, or renewal payments failed and retries were exhausted. In every case the merchant is notified and has **48 hours** to either **confirm the space was vacated** or **claim the deposit**. Rental payouts to the merchant proceed on their normal schedule either way.

**6 · Release.** If the merchant confirms — or takes no action within 48 hours — the full deposit is refunded to the renter's original card automatically, and both parties are notified. Refunds go back to the card used at checkout even if the renter has since changed the card on their subscription; if that card has been closed, the bank routes the refund to the replacement account.

**7 · Claim.** If the merchant claims, the deposit is frozen and the case goes to Hako. The renter is notified and can respond through the transaction's messages. Hako reviews and either releases the deposit to the renter or awards the full amount to the merchant, which is paid to the merchant's existing Hako payout account.

**8 · Cancellations before the rental starts.** If a booking or subscription request is declined, expires, is aborted by Hako, or checkout is abandoned, the deposit authorisation is released automatically and nothing is charged.

## Subscriptions and edge cases

These are the situations specific to Hako's marketplace that the design above accounts for. Each is in scope unless noted.

- **Renter cancels a subscription.** Hako cancels at the end of the paid period, so the space stays booked until then. The 48-hour window starts at that period end, not at the moment the renter clicks cancel.

- **Failed renewal payments.** When a renewal fails, Stripe retries and the subscription sits in "payment overdue". If all retries fail the subscription expires and the 48-hour window starts. The merchant can claim the deposit at that point; whether unpaid rent is an acceptable reason for a claim is a policy decision for Hako (see below). The deposit is not applied to rent automatically.

- **Belongings still in the unit.** A confirm from the merchant means "vacated and in good order". If a renter has not cleared a storage unit when the subscription ends, the merchant claims rather than confirms, and Hako decides. Anything beyond the deposit — abandoned property, lien processes — is outside the marketplace and unchanged by this feature.

- **Merchant changes the deposit later.** The deposit amount is locked on each transaction at checkout. Editing a listing's deposit affects new checkouts only; it never changes what an existing renter paid or is owed.

- **Merchant removes the deposit or unpublishes the listing.** Existing held deposits are unaffected and still run through the normal release or claim flow when the rental ends.

- **Long holds and card changes.** A subscription deposit may be held for years. Refunds are issued against the original charge, which Stripe supports for card payments regardless of age; the renter changing their card in the billing portal does not affect it.

- **Hako cancels or aborts.** Operator cancellation of a live subscription ends it and starts the 48-hour window like any other end. Operator abort of a request before approval releases the authorisation.

- **Legacy listing type ids.** Hako has several historical ids for per-day and per-hour listings. The deposit field and display will cover all of them, not just the ids currently selectable.

- **Multiple spaces on one listing.** Where a per-day or per-hour listing offers several spots, the deposit is charged once per booking, not per spot. Monthly subscriptions are already one renter per listing.

- **Hako's two transaction processes.** Bookings and subscriptions run on separate Sharetribe processes with different end-of-rental signals (a timed completion for bookings; Stripe webhooks and server transitions for subscriptions). The deposit engine listens to both and keeps one status model, so the transaction page and emails look the same to merchants and renters whichever type they are on.

- **Missed signals.** As with the waiver feature, a scheduled reconciliation job re-checks every held deposit so that a missed webhook or a transition run from Console cannot leave a deposit stuck.

## Processing fee

Stripe charges approximately 2.9% + 30¢ when the deposit is captured and does not return this fee when the deposit is refunded. As agreed for Gearly, this is recovered from the merchant as a small "deposit processing fee" deducted from their first payout on the transaction (about $7.55 on a $250 deposit; $14.80 on a $500 deposit). Because the deposit is only captured on the merchant's approval, no fee arises on declined, expired or abandoned requests. Two points to be aware of: the deduction is calculated at the standard rate, so Hako absorbs any small variance (for example, international cards cost slightly more); and if a live subscription or booking is later cancelled by Hako and the first payment refunded, the deduction reverses with it while Stripe's fee on the deposit does not, so Hako bears the fee in that case.

## Estimate

| Phase | Hours |
|-------|:-----:|
| Technical spike — prove deposit authorisation at checkout and capture on merchant approval using the checkout card, refund and award payout, and the end-of-rental signals for both processes | 4 |
| Listing — deposit field and cap on hourly, daily and monthly listing types; listing-page display | 3 |
| Checkout and payment — deposit line and terms acceptance, deposit authorisation, capture on merchant approval, fee deduction, breakdown display | 14 |
| Deposit engine — 48-hour window, claim states, automated release, refunds, awards, reconciliation job, monitoring | 16 |
| Transaction processes — deposit status transitions and email notifications on the booking and subscription processes (dev and live) | 6 |
| Subscription handling — end-of-term triggers (cancel at period end, failed renewals, operator cancel), long-held refunds, locked deposit amounts | 8 |
| Transaction page — deposit status, merchant confirm/claim, renter view and response, Hako review; status on the Subscriptions page | 10 |
| Testing, release and runbook | 14 |
| Project management and reviews | 5 |
| **Total** | **80 hours** |

**Timeline:** approximately **4 weeks**. The calendar time is longer than the hours because the 48-hour window, refunds, awards and — for subscriptions — a full cancel-at-period-end and failed-renewal cycle need to be observed end-to-end in a test environment using Stripe test clocks; that observation runs alongside other work.

**Compared with Gearly (70–80 hours):** the estimate is in the same range because the design is the same and Hako already has the Stripe infrastructure the deposit relies on (customer and card reuse, webhooks, reconciliation). The subscription end-of-term triggers and second transaction process add work, but that is offset by reusing the Gearly implementation for the listing, checkout, holding and claim mechanics.

## Decisions we need from you

- **Which listing types allow a deposit?** Our proposal is all three (hourly, daily, monthly), left to the merchant. Restricting to daily and monthly would slightly reduce scope.

- **Platform maximum.** A single cap for all listings (for example $500), or a different cap for monthly storage.

- **Claims for unpaid rent.** Whether a merchant may claim a deposit when a subscription ended through failed renewals, or whether claims are limited to damage and condition of the space.

- **Deposit terms.** Approved customer-facing terms for the checkout acceptance and the deposit emails.

## Assumptions and dependencies

The estimate reflects development effort and assumes: the technical spike confirms the deposit can be authorised at checkout and captured on approval using the checkout card (if it cannot, we fall back to charging at checkout as on Gearly, with the same hours); legal review of Hako holding renter funds — including for multi-year subscriptions — does not change the flow above (we will adjust wording, timings or disclosures to whatever counsel requires); Hako provides customer-facing copy for deposit notices and emails before the build phase; deposit emails are sent through Hako's existing Sharetribe notification templates by adding deposit transitions to both transaction processes, so no new email service is introduced; and a single round of acceptance testing. US merchants and USD only. Hako's Stripe account is on standard pricing. Claims are reviewed by Hako staff within the transaction page — a separate admin dashboard is not included. The deposit is excluded from sales tax and from marketplace commission. If any of these assumptions change, we will flag the impact before proceeding.

**Not included:** partial claims, applying the deposit to unpaid rent automatically, an evidence-upload dispute form for renters, changing the deposit amount on an active subscription, deposits on inquiry-only listings, multi-currency or non-US merchants, and any abandoned-property or lien workflow. Any of these can be scoped separately.
