# Transaction process

These are the transaction processes that the Sharetribe Web Template is designed to work with by
default. The `process.edn` file describes the process flow while the `templates` folder contains
notification messages that are used by the process.

## Check active processes from Console

These are visible here only as a reference. The active transaction processes you need to check from
Console or
[using Sharetribe CLI](https://www.sharetribe.com/docs/how-to/edit-transaction-process-with-sharetribe-cli/)

If you don't have these processes visible on Console, you need to add them there using Sharetribe
CLI.
[Tutorial: create a new transaction process](https://www.sharetribe.com/docs/tutorial/create-transaction-process/)

Pricing in these processes use privileged transitions and the
[privileged-set-line-items](https://www.sharetribe.com/docs/references/transaction-process-actions/#actionprivileged-set-line-items)
action.

## Purchase process

Orders in this process use stock management. If you are selling products, your listing type should
be configured to use this process.

## Booking process

Orders in this process use time-based availability management. The booking times are showed in
listing's time zone. By default, there are 3 unit types in use: 'hour', 'day', and 'night'. You need
to define these in your listing type configuration.

## Inquiry process

This process enables free messaging between customer and provider. Any payments etc. need to happen
face-to-face or somehow outside of the marketplace. The initial inquiry message is saved to the
protected data of the transaction.

## Subscription rental process (`subscription-rental`)

Monthly subscription rentals for Spotly. Stripe handles recurring billing (Option B); Sharetribe
handles availability via booking actions.

- **Process file:** `subscription-rental/process.edn`
- **Docs:** `subscription-rental/README.md`
- **Implementation log:** `../../sharetribe-subscription-implementation-phase1-log.md`

Deploy with Sharetribe CLI (Dev first). Do not attach to a listing type until the Web Template
supports this process (Phase 3).

## Waiver processes (dev push status — 2026-08-11)

On marketplace `alpsalpinerentaspot-dev`:

| Process | Latest version | Live alias | Notes |
|---------|----------------|------------|--------|
| `default-booking` | 2 | `default-booking/release-1` → v1 | Alias cut **deferred** (dev testing in progress) |
| `subscription-rental` | 6 | `subscription-rental/release-5` → v5 | Alias cut **deferred** (dev testing in progress) |

Pushing a process does **not** change active aliases. New checkouts keep using the old versions until
we create/update aliases (`release-2` / `release-6` or `update-alias`). See
[docs/WAIVER_IMPLEMENTATION.md §9](../../docs/WAIVER_IMPLEMENTATION.md#9-deployment-checklist).
