# Fit Check

**A wishlist that already knows what fits you.**

A working prototype for Part 5 of a product management case study. The business
question behind it: how do you increase the share of users who buy at least one
wishlisted item within 30 days of saving it, **without discounting?**

It never asks your size.

**→ [Open the live app](https://piyushdhar1309.github.io/myntra-fit-check/)**

---

## The problem it is built on

The [discovery engine](https://github.com/PiyushDhar1309/myntra-wishlist-discovery-engine)
that preceded this found that fit uncertainty survives the size chart - users
consult it and still cannot commit, because a numeric size means something
different at every brand, and lengths often are not published at all. Fit and
size appeared in 44% of the rows discussing decision factors.

Six user interviews sharpened that. Every respondent had a **non-standard body**
- plus-size, petite or tall - and none could answer the only question that
matters: *how will this specific garment sit on my specific body?* Their
workarounds were all evidence-gathering rituals, and all expensive:

| | Stuck on | Blocker | Workaround |
|---|---|---|---|
| R1 | Anarkali kurta | Fit varies by brand | Scans reviews for "true to size" |
| R2 | Winter jacket | Chest and sleeve doubt | Buys two sizes, returns one |
| R3 | Straight jeans | Inseam never published | Reads petite-fashion forums |
| R4 | Casual shirt | Sleeve and torso length | Buys from two brands only |
| R5 | Wedding outfit | Fabric behaviour | Hunts Instagram for a similar body |
| R6 | Slim shirt | No petite-men sizing exists | Leaves for a niche site |

They do not have a **size** problem. They mostly already suspect the right size.
They have a **proof** problem - no evidence strong enough to commit Rs. 2,000 to.

## The move

Stop trying to measure the user, and stop asking other shoppers. Use the clothes
they already own.

A verdict phrased as *"your chest is 43", this garment is 44""* asks someone to
trust the very thing that has failed them. So the comparison is drawn garment to
garment instead - against a physical object in their wardrobe they can go and
touch. It needs no other user on the platform, so there is no cold start, and it
works for R6, whose body type no sizing data anywhere describes.

**It fills itself in.** Every kept Myntra order is a garment that fits. Every
order returned for a size reason is a boundary, and the return reason says which
direction. Existing users start with a full profile at zero effort, from data
Myntra already holds and no competitor can copy.

## What it computes

The instrument is not a body measurement. It is a **fit envelope**: per scope,
the range of *garment* measurements proven to work on this body, which already
bakes in their proportions, their fit preference and their tolerance.

```
YOUR UPPER BODY            derived from 4 garments you own
  chest    38.0 - 40.3"    35.5" was returned as too tight
  waist    36.0 - 38.8"
  shoulder      under 15.5"    15.5" droops on you
YOUR KURTAS
  length   43.0 - 45.0"
```

Every saved item is judged against it, measurement by measurement, and lands in
one of four states:

| Badge | Meaning |
|---|---|
| **FITS YOU** | Every deciding measurement sits inside the proven range |
| **LIKELY FITS** | What we can check works; something critical is still unmeasured |
| **1 MEASURE AWAY** / **NO SIZE DATA** | The measurement that decides it *for this body* is missing |
| **WRONG SIZE** | It crosses a limit they have already been burned at - usually with a size that clears it |

### The third state is the product

Every size tool projects false certainty, which is how R3 and R6 got burned and
left. Saying plainly *"the number that decides this for you does not exist, and
here is how to get it"* is more useful than a confident guess.

So the engine separates two kinds of not-knowing, because they have different
fixes and conflating them is how a size tool ends up bluffing:

- **The brand does not publish it.** Nothing the shopper does will produce that
  number. The app says so and stops.
- **Nothing they own pins it down.** They can fix this in thirty seconds - and
  the app asks for **the single measurement that unlocks the most saved items**,
  taken off a garment lying flat, which is easier and far more accurate than
  measuring yourself.

On the seeded profile, one number does this:

```
before   1 fits - 3 need a measure - 2 wrong size
              |  measure the inseam of the Levi's 711 you own
after    3 fits - 0 need a measure - 3 wrong size
```

Two stalled items become buyable, and one is revealed as a mistake before it
becomes a return. No discount was involved.

## How it avoids bluffing

**The deterministic layer decides.** Envelopes, deltas, verdicts and confidence
are computed arithmetic - there is no model in the loop and nothing is inferred.
Evidence is attributed: every verdict names the garments it was judged against,
so a reader can check the reasoning against their own wardrobe. And **absence is
reported, never filled in**.

A few rules the engine holds to, each covered by a test:

- A complaint about the chest does not vouch for the hem. A garment returned for
  one reason contributes evidence on that dimension only.
- A cap sleeve is not evidence about a full sleeve, so sleeves are scoped by
  sleeve style, not just by category.
- Inseam and rise pool across a body region, because crotch-to-floor does not
  change with the fabric. Hem and sleeve length do not - those are choices a
  designer made.
- Stretch is converted into wearable inches **once**, before anything is
  compared, so fabric is never charged twice.
- A relaxed cut is not penalised for a roomy thigh, but is still judged at the
  waist.
- Nothing is called a fit while something critical is unmeasured.

## The app

Nine screens: home, shop, search, product, wishlist, bag, profile, orders and
My Fit Profile.

The **product page** is where the engine is most visible. Each size chip carries
a dot coloured by what Fit Check makes of *that* size, so the Zara dress shows
red on S and green on M before you tap anything. Below it sit the measurement
bars, the reason, and either the one measurement that would settle it or a plain
statement that the brand has not published what it would take.

The **wishlist** is the feature: verdict badges, filters by state, and the
measurement ask. **Orders** shows where the fit profile came from - what was
kept, and what went back for a size reason.

Saving, unsaving, the bag and adding to your wardrobe all change real state, so
anything you save from Shop is judged the moment it lands in the wishlist.

## Layout

The deployed app is JavaScript. Python remains the reference implementation and
keeps the invariant suite, and the catalog is generated across so the two cannot
drift apart.

| | |
|---|---|
| `docs/index.html` | The app shell and stylesheet |
| `docs/engine.js` | The fit engine, ported from `fit_engine.py` |
| `docs/app.js` | Screens, rendering and interaction |
| `docs/audit.mjs` | 118 checks across every screen, control and flow |
| `docs/data.js` | Generated from `catalog.py` - do not edit by hand |
| `dims.py` | Dimension vocabulary: what pools with what, and why |
| `catalog.py` | Seeded garments, past orders and wishlists for two shoppers |
| `fit_engine.py` | The reference implementation |
| `tools/gen_data.py` | Regenerates `docs/data.js` and the parity snapshot |

### Tests

```bash
python3 test_engine.py    # 40+ engine invariants
node docs/parity.mjs      # the JS engine must match Python exactly
npm install jsdom && node docs/audit.mjs   # 118 checks, headless
```

`parity.mjs` replays three scenarios through both engines and compares every
row, confidence score and unlock. Run `python3 tools/gen_data.py` after changing
the catalog or the rules.

`audit.mjs` walks all nine screens and drives every flow: opening products,
changing size, saving and unsaving, the bag, search, category filters, the
measurement loop, adding a garment, switching shopper, reset, and the empty
states. Three of its sweeps run on every screen:

- **No dead controls.** Every button and interactive element must resolve to a
  handler. A control that looks live and does nothing is the first thing a
  reviewer finds.
- **No unconstrained images.** Every product photo sits inside a `.shot`, which
  is the single place image sizing is decided.
- **The disclaimer is present**, and nothing invents star ratings, review counts
  or personal details.

### Running it

Any static server, since it is plain ES modules with no build step:

```bash
cd docs && python3 -m http.server 8000
```

---

Case-study prototype. Not affiliated with Myntra, and not endorsed by any brand
named in the catalog. The catalog and order history are illustrative; the fit
engine is real - change the profile and every verdict recomputes.

Photography from [Unsplash](https://unsplash.com) under the Unsplash licence,
illustrating the garment category rather than the specific garment.
