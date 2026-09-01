# Myntra · Decide

**A wishlist that helps you choose, not just store.**

A working prototype for Part 5 of a product management case study. The business
question behind it: how do you increase the share of users who purchase at least
one wishlisted item within 30 days of saving it, **without discounting?**

**→ [Open the live app](https://piyushdhar1309.github.io/myntra-decide/)**

---

## The insight

> **Myntra models the wishlist as items. Users experience it as decisions.**

When someone saves six black anarkalis, they have not made six decisions. They
have made **one** — *I want a kurta for this wedding* — and deferred **which**.
Myntra stores that as six independent intents and treats each as separately
convertible. It isn't. Until the one decision resolves, **none of the six
converts.**

Everything follows from that modelling error:

- The wishlist has only two exits: buy, or delete. Deleting feels like
  discarding something you did work to find, so nobody does it. The list only
  grows.
- Every new save divides attention further, so **the probability of any single
  item converting falls as the list grows**. A wishlist's growth is inversely
  related to its conversion.
- No amount of fit confidence, price movement or review volume touches this,
  because the blocker is not information. It is **choice**.

## Where this came from

The [discovery engine](https://github.com/PiyushDhar1309/myntra-wishlist-discovery-engine)
that preceded this analysed more than 5,000 rows of real user feedback and found something
that reframes the brief: **the gap between saving and buying is frequently
deliberate waiting, not lost interest.** Users described saving specifically *in
order to compare before choosing* — one complained that the wishlist size cap
was getting in the way of exactly that.

"Increase wishlist conversion" implies decayed intent that needs re-igniting.
The evidence says intent is intact and **parked on a condition**. Every
"complete your purchase" nudge is aimed at a problem that is not there.

**Myntra already ships collections** — you can group saved items by hand. That
is not competition, it is corroboration: the platform saw the need clearly
enough to build folders, and people use them. But **filing is not deciding.**
You can put six kurtas in a "Wedding" collection and be no closer to picking
one. Myntra solved organisation and stopped one step short.

## What the product does

**Finds the decisions.** Saved items that answer the same need at a comparable
price are rivals. Three or more of them is a decision, not a list — and the
wishlist says so: *"We found 7 similar items in your wishlist."* One tap opens
the comparison. No filing, no folders, no concept to learn first.

**Or lets you pick them yourself.** *Compare items* turns the wishlist into
selectable tiles. Choose the ones you keep going back and forth on, and compare
those. Multi-select is a pattern people already know.

**Shows what actually separates them.** Near-identical products differ on a dozen
attributes and almost none of them should decide anything. The comparison ranks
every difference by weight, leads with the four that matter, and folds the rest
away:

```
7 items, one decision
All 7 are t-shirts, ₹599–₹1,299
They differ on price and delivery. Of 9 differences, these 4 should decide it.

           H&M      Roadster  HRX      Levi's   Puma     M&H      USPA
PRICE      ₹699     ₹599 ✓    ₹799     ₹1,299   ₹999     ₹899     ₹1,199
DELIVERY   3 days   2 days ✓  2 days ✓ 4 days   3 days   6 days   5 days
FABRIC     Cotton   Cotton    Bio-wash Cotton   Blend    Cotton   Pima
RETURNS    30 ✓     14        30 ✓     30 ✓     14       14       30 ✓
```

A tick marks the lowest price, fastest delivery, longest returns or best rating.
**Ties all win** — two items sharing the quickest delivery both get marked,
because "these two are equally quick" is an answer rather than an absence of one.
**Nothing is ticked on fabric, colour, pattern or fit**, because those are taste
and the product does not pretend otherwise.

**Breaks the deadlock when the table is not enough.** *Compare two at a time*
turns one impossible seven-way choice into six easy binary ones. That is how
choice overload is actually broken — by shrinking each choice, not by adding
information to a big one.

**Lets you keep more than one.** Pick is a toggle. A black tee and a charcoal one
is a real answer, and forcing a single winner would destroy a sale to satisfy our
own metric. The bar counts what you have picked and names what will happen:
*Keep these 2 →*.

**Makes elimination safe, and asked.** Finishing puts the question plainly:
*"Remove the other 5 from your wishlist?"* — with **Keep them**, **Remove**, or
**Move to bag**. Nothing is deleted behind your back, which is the only reason
anyone will use it twice.

**And refuses to call a non-decision a decision.** Keep every item and the app
says so: *the decision is still open, your wishlist is the same size it was, and
we don't count this one as decided.* That matters beyond the copy — counting it
would let a team satisfy Decision Resolution Rate without any behaviour changing,
which is precisely what that metric exists to detect.

**Explains itself.** A five-step walkthrough spotlights the real controls with an
arrow and a caption, moves between screens as it goes, and offers *Skip — let me
explore* on every step. Reachable from the panel on home or the **?** in the
header, on any screen.

## Why it fits the brief

- **Non-monetary by construction.** Nothing in it goes near price manipulation.
- **It does not collide with Fit Assist**, which answers *"which size of this
  one?"* This answers *"which of these six?"* They compose.
- **The metric's shape favours it.** The goal is *% of users who buy at least
  one saved item* — a user-level measure. You do not need to convert every item,
  only to **break one logjam per person**.

## What is in here

| | |
|---|---|
| `docs/index.html` | Shell and stylesheet |
| `docs/decide.js` | Clustering, difference ranking, the tournament |
| `docs/app.js` | Eleven screens, rendering and interaction |
| `docs/data.js` | Generated — do not edit by hand |
| `tools/build_catalog.py` | Builds the catalog, including the decision clusters |
| `tools/images.py` | Verified photo ids, grouped by what they actually show |
| `docs/audit.mjs` | 204 checks across every screen, control and flow |

**120 products** with descriptions, specifications, multiple sizes with
out-of-stock states, ratings, reviews, delivery estimates and return windows.
The demo wishlist holds **56 items** — the size a heavy wishlister's actually
reaches — inside which the engine finds **seven decisions covering 39 of them**,
including seven near-identical black crew tees and nine pairs of jeans. Tees are
the clearest case the feature has: people genuinely save several, and nothing you
can see in a photo tells them apart.

### Tests

```bash
npm install                    # jsdom and playwright
npm test                       # 204 behavioural checks, headless
npm run ui                     # geometric UI audit in real browsers
python3 tools/build_catalog.py # regenerate the catalog
```

`docs/audit.mjs` proves behaviour but runs under jsdom, which lays nothing out —
so it cannot see a button sitting on top of a thumbnail. `tools/uiaudit.mjs`
drives real engines at phone viewports and measures actual boxes: horizontal
overflow, elements escaping the frame, siblings overlapping inside a row,
content still hidden behind a fixed bar once scrolled to the end, clipped text,
tap targets under 28px, and icon fonts failing to load. It writes a screenshot
of every screen.

It runs the iOS rig under **WebKit**, Safari's own engine, which is the only way
to catch iOS-specific bugs from a desktop. Where WebKit will not start — its
Playwright build is incompatible with some macOS versions and hangs on launch —
the run says so and falls back to Chromium at an iPhone viewport, which finds
layout bugs but not engine ones. Anything Safari-specific still needs a real
device.

Three sweeps run on **every** screen: **no dead controls** (every button
resolves to a handler — a control that looks live and does nothing is the first
thing a reviewer finds), **no unconstrained images**, and **the disclaimer is
present**.

### Running it

Plain ES modules, no build step:

```bash
cd docs && python3 -m http.server 8000
```

---

Prototype for a product case study. Not affiliated with Myntra and not endorsed
by any brand named here. Products, prices, ratings and reviews are sample data
written for the demo — no real person wrote them, and nothing here can be
bought. Photography from [Unsplash](https://unsplash.com) illustrates the
category, not the exact garment.
