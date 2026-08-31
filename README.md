# Fit Check

**A wishlist that already knows what fits you.**

A working prototype for Part 5 of a product management case study. The business
question behind it: how do you increase the share of users who buy at least one
wishlisted item within 30 days of saving it, **without discounting?**

It never asks your size.

---

## The problem it is built on

The discovery engine that preceded this found that fit uncertainty survives the
size chart — users consult it and still cannot commit, because a numeric size
means something different at every brand and lengths often are not published at
all. Fit and size showed up in 44% of the rows discussing decision factors.

Six user interviews sharpened that. Every respondent had a **non-standard body**
— plus-size, petite, or tall — and none could answer the only question that
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
They have a **proof** problem — no evidence strong enough to commit ₹2,000 to.

## The move

Stop trying to measure the user, and stop asking other shoppers. Use the clothes
they already own.

A verdict phrased as *"your chest is 43", this garment is 44""* asks someone to
trust the very thing that has failed them. So the comparison is drawn garment to
garment instead:

> This jacket is **2" wider in the chest** and **0.8" shorter in the sleeve**
> than the Roadster jacket you told us fits you perfectly. And yours has 4%
> elastane; this has none, so it will not give the way yours does.

The reference point is a physical object in their wardrobe they can go and
touch. It needs no other user on the platform, so there is no cold start — and
it works for R6, whose body type no sizing data anywhere describes.

**It fills itself in.** Every kept Myntra order is a garment that fits. Every
order returned for a size reason is a boundary, and the return reason says which
direction. Existing users start with a full profile and zero effort, from data
Myntra already holds and no competitor can copy.

## What it computes

The instrument is not a body measurement. It is a **fit envelope**: per scope,
the range of *garment* measurements proven to work on this body, which already
bakes in their proportions, their fit preference and their tolerance.

```
YOUR UPPER BODY            derived from 4 garments you own
  chest    38.0 – 40.3"    35.5" was returned as too tight
  waist    36.0 – 38.8"
  shoulder      ≤ 15.5"    15.5" droops on you
YOUR KURTAS
  length   43.0 – 45.0"
```

Every saved item is then judged measurement by measurement against it, and lands
in one of four states:

| | |
|---|---|
| **Should fit you** | Every deciding measurement sits inside the proven range |
| **Probably fits** | What we can check works; something critical is still unmeasured |
| **Can't say yet** | The measurement that decides it *for this body* is missing |
| **Not this size** | It crosses a limit they have already been burned at — usually with a size that clears it |

### The fourth state is the product

Every size tool projects false certainty, which is exactly how R3 and R6 got
burned and left. Saying plainly *"the number that decides this for you does not
exist, and here is how to get it"* is more useful than a confident guess.

So the engine separates two kinds of not-knowing, because they have different
fixes and conflating them is how a size tool ends up bluffing:

- **The brand does not publish it.** Nothing the shopper does will produce that
  number. The app says so and stops.
- **Nothing they own pins it down.** They can fix this in thirty seconds — and
  the app asks for **the single measurement that unlocks the most saved items**,
  taken off a garment flat on a table, which is easier and far more accurate
  than measuring yourself.

On the seeded profile, one number does this:

```
before   3 can't say · 1 should fit · 2 not this size
                  ↓  measure the inseam of the Levi's 711 you own
after    0 can't say · 3 should fit · 3 not this size
```

Two stalled items become buyable, and one is revealed as a mistake before it
becomes a return. No discount was involved.

## How it avoids bluffing

The same discipline as the discovery engine: **the deterministic layer decides,
and the model only writes prose.**

- Envelopes, deltas, verdicts and confidence are computed arithmetic. With the
  AI switched off entirely, every verdict, number and explanation still renders.
- Gemini is handed the finished facts and asked for one paragraph, under a
  prompt that forbids asserting anything not in them. It cannot change a number,
  a size, or a verdict.
- Evidence is attributed. Every verdict names the garments it was judged
  against, so a reader can check the reasoning against their own wardrobe.
- **Absence is reported, never filled in.** A dimension a brand does not publish
  is shown as missing.

A few rules the engine holds to, each covered by a test:

- A complaint about the chest does not vouch for the hem. A garment returned for
  one reason contributes evidence on that dimension only.
- A cap sleeve is not evidence about a full sleeve, so sleeves are scoped by
  sleeve style, not just by category.
- Inseam and rise pool across a body region, because crotch-to-floor does not
  change with the fabric. Hem and sleeve length do not, because those are
  choices a designer made.
- Stretch is converted into wearable inches **once**, before anything is
  compared — so fabric is never charged twice.
- A relaxed cut is not penalised for a roomy thigh, but is still judged at the
  waist.
- Nothing is called a fit while something critical is unmeasured.

## Running it

```bash
pip install -r requirements.txt
streamlit run app.py
python test_engine.py     # engine invariants
```

The prose layer is off by default and the app is complete without it — every
verdict, number, bar and explanation is written by the deterministic layer. To
turn it on, uncomment `google-generativeai` in `requirements.txt` and set
`GEMINI_API_KEY` as an environment variable or in `.streamlit/secrets.toml`.

| File | |
|---|---|
| `dims.py` | Dimension vocabulary: what pools with what, and why |
| `catalog.py` | Seeded garments, past orders and wishlists for two shoppers |
| `fit_engine.py` | Envelopes, verdicts, confidence, the unlock ranking |
| `narrate.py` | Deterministic sentences, plus the optional Gemini layer |
| `styles.py` | Stylesheet, product imagery, range bars |
| `app.py` | The Streamlit app |
| `test_engine.py` | Invariants of the engine |

---

Case-study prototype. Not affiliated with Myntra, and not endorsed by any brand
named in the catalog. The catalog and order history are illustrative; the fit
engine is real — change the profile and every verdict recomputes.

Photography from [Unsplash](https://unsplash.com), used under the Unsplash
licence. Images illustrate the garment category, not the specific garment.
