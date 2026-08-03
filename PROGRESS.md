# Hako Figma Pixel-Perfect Build — Progress

**Branch:** `feat/figma-pixel-perfect-hifi`  
**Figma:** [Hako HiFi Design All Pages](https://www.figma.com/design/RKgPHFsOwrX0MYPBYRFTpJ/Hako-%7C-Design-%7C-Hifi-Design-All-Pages?node-id=12-423)  
**File key:** `RKgPHFsOwrX0MYPBYRFTpJ`

## Top-line status (read this first)

**Blocked on Figma MCP quota** (View-seat / ~6 calls/month limit hit after Homepage inventory). Remaining pages cannot be pulled with `get_design_context` until you upgrade the Figma seat/plan or quota resets.

### Fully done & pixel-verified against Figma screenshots
_None yet_ — Playwright visual baselines exist but need a running app + side-by-side Figma comparison.

### Implemented with unit tests (design-faithful where Figma data existed)
- **Homepage** — custom sections from full `get_design_context` (tokens, assets, copy). Not yet screenshot-verified in browser.
- **Shared chrome** — design tokens, dark Topbar, global HakoFooter, ListingCard token restyle.
- **FAQ `/faq`** — questions/sections from Figma metadata; **answer bodies interim**.
- **Contact `/contact`** — form labels/placeholders from Figma metadata; hero not design-context verified.

### Not started (need Figma design context)
Search results, Listing details, Checkout, Merchant listings, Post a listing, Merchant account, About us, Privacy policy (restyle), Sign up/Login layout, Become a host.

## ⛔ HARD BLOCKER — Figma MCP rate limit


Figma MCP returned: *"You've reached the Figma MCP tool call limit for your View seat on the Professional plan."*

- `whoami` shows plan **Starter** / seat **Full** (`Ryan Abdullah` / `ryan@nine15.com`), but rate-limit copy references View/Professional limits (**~6 calls/month** for View seats).
- Calls already used: metadata inventory, Homepage `get_design_context`, `get_variable_defs`, one `download_assets`.
- **Impact:** Cannot pull design context / screenshots for remaining pages until seat/plan is upgraded or quota resets.
- **Mitigation in progress:** Implement Homepage + global tokens from cached Homepage design context + downloaded assets. Other pages deferred until Figma access restored.
- **Action needed from you:** Upgrade to Full/Dev seat on Pro/Org (or raise MCP quota), then re-run so remaining pages can be pixel-verified from Figma.

## Status summary (update continuously)

| Area | Status |
|------|--------|
| Foundations (tokens, fonts, Playwright) | Done (assets + tokens + Playwright config) |
| Shared Topbar / Footer | Done (dark Topbar mobile+desktop, global HakoFooter, ListingCard Hako styles) |
| Homepage | Implemented + unit tests; visual baselines pending running app |
| Search results | Not started |
| Listing details | Not started |
| Checkout | Not started |
| Merchant listings | Not started |
| Post a listing | Not started |
| Merchant account | Not started |
| About us | Not started |
| FAQ | Implemented from metadata (questions + layout); answers interim; not pixel-verified |
| Privacy policy | Not started |
| Contact us | Implemented from metadata (fields/layout); not pixel-verified |
| Sign up / Login | Not started |
| Become a host | Not started |

### Fully done & pixel-verified
_None yet (visual Playwright baselines need a running server + Figma side-by-side)._

### Implemented with unit tests (not yet pixel-verified)
- Homepage custom sections (Hero, How it works, Featured, Explore, Reviews, List your space, Footer)
- Design tokens in `src/styles/hakoTokens.css`
- Figma assets under `public/static/hako/`

### Not started
Search, Listing, Checkout, Merchant flows, About, FAQ, Privacy, Contact, Auth, Become a Host (blocked on Figma MCP quota for design context).

---

## Assumptions (logged)

1. **Breakpoints:** Figma provides desktop **1440px** and mobile **390px** frames only. No tablet frames. Mapping to template:
   - Mobile: ≤767px (design target 390px)
   - Template medium: 768px (interpolate between mobile/desktop)
   - Desktop: ≥1024px (design target 1440px)
2. **Search Results source of truth:** Prefer frames named `Search Results - UPDATED` (desktop `172:1142`, mobile `172:1324`) over older `Search Results` / `Search Results - V2`.
3. **About Us source of truth:** Prefer `About Us - UPDATED` (`84:2041` / `89:197`) over older `About Us`.
4. **LandingPage architecture:** Template LandingPage is CMS/PageBuilder-driven. For pixel fidelity we implement custom Hako section components and wire them into LandingPage while preserving Topbar/auth/search wiring.
5. **CMS pages (About, FAQ, Contact, Privacy, Become a Host):** Implemented as dedicated container pages (or CMSPage section overrides) matching Figma; routes added/updated as needed.
6. **Copy typos in Figma** (e.g. "San Franciso"): preserved as designed unless noted under Needs review.
7. **Brand colors from Figma variables:**
   - Primary (green): `#71B340`
   - Accent (blue): `#3E78B2`
   - Dark: `#0C161D`
   - Light green / soft bg: `#F1F7ED`
   - Light text: `#F1F7ED`
   - Secondary text: `#7D8491`
   - Primary text: `#0C161D`
   - Fonts: Outfit (headings), Inter (body)
8. **Working directory:** `/Users/abdullah/Desktop/code/nine/hako` on feature branch (not main).

---

## Needs my review

_Open questions / decisions made autonomously — please verify first:_

1. **LandingPage vs hosted CMS:** Replaced PageBuilder-driven homepage content with custom Figma sections so we can match design without Console asset edits. Hosted `landing-page` asset is no longer the visual source of truth for `/`.
2. **Figma typo "San Franciso":** Kept as in design for pixel match; may want corrected copy later.
3. **Become a Host / Contact / FAQ / About:** Adding explicit routes if missing (template often uses CMSPage `/:pageId`). Exact path slugs assumed: `/about`, `/faq`, `/contact`, `/become-a-host`, `/privacy-policy` (existing).
4. **FAQ answer copy:** Accordion answers were not visible in collapsed Figma metadata; interim answers used — replace from open states when Figma MCP quota returns.
5. **Playwright visual baselines:** Stored under `e2e/visual/` and require a running or story-mounted page; CI may need headed/skip flags until env is configured.

---

## Figma page inventory (desktop → mobile)

| Page | Desktop node | Mobile node |
|------|--------------|-------------|
| Homepage | `1:2` | `29:2624` |
| Search Results (UPDATED) | `172:1142` | `172:1324` |
| Listing Details | `22:1823` | `29:3091` |
| Checkout | `25:2267` | `30:53` |
| Merchant Listings | `66:1374` | `71:34` |
| Post a Listing | `77:338` | `83:1196` |
| Merchant Account | `84:1597` | `84:1898` |
| About Us (UPDATED) | `84:2041` | `89:197` |
| Privacy Policy | `89:320` | `90:789` |
| FAQ | `90:972` | `97:1195` |
| Contact Us | `142:620` | `143:803` |
| Sign Up / Log In | `160:681` | `170:811` |
| Become a Host | `190:925` | `190:1028` |

---


### Search Results inventory (from cached metadata only — not pixel-ready)

Desktop `172:1142` / Mobile `172:1324`:
- nav (70px)
- filter bar (105px): parking option dropdown, location, date, hours, Search button
- content: left filters col (400px) with PRICE BY Hour/Day + range slider; listing cards col
- **Blocked:** no get_design_context (colors/type/spacing tokens) due to Figma MCP quota

## Changelog

### 2026-08-03 — FAQ + Contact pages
- Added `/faq` and `/contact` routes with Hako-styled pages.
- FAQ questions/sections from Figma metadata; answer copy interim (Needs review).
- Contact form labels/placeholders from Figma metadata.
- Unit tests: 5 passing.


### 2026-08-03 — Shared chrome + ListingCard
- Wired HakoFooter globally via FooterContainer (CMS footer opt-in via REACT_APP_USE_CMS_FOOTER).
- Dark mobile Topbar; light icons.
- ListingCard restyled toward Hako featured card tokens.
- FooterContainer unit test added.
- Figma MCP still rate-limited for remaining pages.

### 2026-08-03 — Homepage foundation commit
- Added Hako design tokens, Outfit font, Playwright config.
- Built custom Hako LandingPage sections from cached Figma Homepage context.
- Downloaded Homepage icons/images to `public/static/hako/`.
- Unit tests: 14 passing (Hero, HowItWorks, other sections, HakoLandingPage, LandingPage).
- Figma MCP rate-limited; remaining pages deferred.



### 2026-08-03 — Session start
- Confirmed Figma MCP access (`whoami` OK).
- Created branch `feat/figma-pixel-perfect-hifi`.
- Inventoried all page frames; extracted design tokens via `get_variable_defs`.
- Started dependency install + foundation work.
