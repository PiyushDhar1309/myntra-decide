# Myntra · Decide

**A wishlist that helps you choose, not just store.**

A working prototype for Part 5 of a product management case study. The business
question behind it: how do you increase the share of users who purchase at least
one wishlisted item within 30 days of saving it, **without discounting?**

**→ [Open the live app](https://piyushdhar1309.github.io/myntra-fit-check/)**

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
that preceded this analysed 4,060 rows of real user feedback and found something
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

**Detects the decisions.** Saved items that answer the same need at a comparable
price are rivals. Three or more of them is a decision, not a list — and the
wishlist says so: *"6 of your saved kurtas look like one decision."* One tap
groups them into a collection, feeding Myntra's own feature rather than
competing with it.

**Shows what actually separates them.** Near-identical products differ on a
dozen attributes and almost none of them should decide anything. The comparison
ranks every difference by weight, leads with the four that matter, and folds the
rest away:

```
6 items, one decision
All 6 are kurtas, ₹1,799–₹2,699
They differ on price and delivery. Of 11 differences, these 4 should decide it.

           Libas    Biba     W        Aurelia  Anouk    Sangria
PRICE      ₹2,099   ₹2,699   ₹1,899   ₹1,799 ✓ ₹2,499   ₹2,299
DELIVERY   4 days   2 days   3 days   7 days   2 days   5 days
FABRIC     Rayon    Cotton   Rayon    Crepe    Georgette Cotton
LENGTH     Calf     Ankle    Calf     Knee     Ankle    Calf
```

A tick marks the lowest price, fastest delivery, longest returns or best
rating. **Nothing is ticked on fabric, colour or pattern** — those are taste,
and the product does not pretend otherwise.

**Breaks the deadlock when the table is not enough.** *Compare two at a time*
turns one impossible six-way choice into five easy binary ones. That is how
choice overload is actually broken — by shrinking each choice, not by adding
information to a big one.

**Makes elimination safe.** Picking one **parks** the rest inside the
collection. Kept, visible, one tap from coming back. People hoard because
removing feels like loss, so nothing is ever deleted — which is the only reason
anyone will use it twice.

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
| `docs/audit.mjs` | 126 checks across every screen, control and flow |

48 products with descriptions, specifications, multiple sizes with out-of-stock
states, ratings, reviews, delivery estimates and return windows — plus three
deliberately seeded decision clusters, because a comparison engine cannot be
judged on a catalog of unrelated things.

### Tests

```bash
python3 tools/build_catalog.py           # regenerate the catalog
npm install jsdom && node docs/audit.mjs # 126 checks, headless
```

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
