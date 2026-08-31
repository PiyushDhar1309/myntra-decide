"""The fit engine. Everything in this module is deterministic.

It never asks what size the shopper is. It works out which garment measurements
have already been proven to work on this body, and then compares a candidate
garment against those - measurement to measurement, not label to label.

The output distinguishes two kinds of not-knowing, because they have different
fixes and conflating them is how size tools end up bluffing:

  UNPUBLISHED - the brand does not print this number. Nothing the shopper does
                will produce it; only the brand can.
  UNKNOWN     - the brand prints it, but nothing in the wardrobe establishes
                what works on this body yet. The shopper can fix this in about
                thirty seconds with a tape and a garment they already own.
"""

from dims import (
    DIMENSIONS, CATEGORIES, CIRC, WIDTH, LENGTH,
    scope_key, kind_of, label_of, usable_stretch, region_of,
)
from catalog import GARMENTS, PERSONAS


def scope_for(gid, dim):
    g = GARMENTS[gid]
    return scope_key(g["category"], dim, g.get("sleeve", "full"))

# A single garment cannot define an exact boundary, so a proven-good value is
# read as the centre of a small band rather than as a hard edge.
TOLERANCE = {CIRC: 0.75, WIDTH: 0.5, LENGTH: 1.0}

# Where an oversized or relaxed cut legitimately adds room. The waist is not on
# this list: jeans cut wide through the leg still have to sit at the waist.
SILHOUETTE_DIMS = {"chest", "shoulder", "hip", "thigh"}

# Fabric families, read off the composition string.
FABRIC_FAMILIES = [
    ("silk", "silk"), ("linen", "linen"), ("wool", "wool"),
    ("rayon", "viscose"), ("viscose", "viscose"), ("modal", "viscose"),
    ("cotton", "cotton"), ("polyester", "synthetic"), ("nylon", "synthetic"),
    ("polyamide", "synthetic"), ("denim", "cotton"),
]

import re as _re

def fabric_families(composition, min_share=0.0):
    """Fabric families in a composition string, optionally only dominant ones.

    A trouser that is 68% polyester and 30% viscose is a polyester trouser. It
    should not be flagged as an unfamiliar viscose.
    """
    low = composition.lower()
    shares = {}
    for token, fam in FABRIC_FAMILIES:
        idx = low.find(token)
        if idx < 0:
            continue
        m = None
        for cand in _re.finditer(r"(\d+)\s*%", low[:idx]):
            m = cand
        share = int(m.group(1)) / 100.0 if m else 1.0
        shares[fam] = max(shares.get(fam, 0.0), share)
    return {f for f, sh in shares.items() if sh >= min_share}

# Finding codes.
OK = "ok"                    # inside the proven band
SNUG = "snug"                # tighter or shorter than proven, but not proven bad
ROOMY = "roomy"              # looser or longer than proven, but not proven bad
INTENDED = "intended"        # roomy, but the garment is cut that way on purpose
FAIL_SMALL = "fail_small"    # at or past a measurement already proven too small
FAIL_LARGE = "fail_large"    # at or past a measurement already proven too large
CLEARS = "clears"            # passes the only bound we have, but no proven band
UNKNOWN = "unknown"          # no evidence in the wardrobe for this dimension
UNPUBLISHED = "unpublished"  # the brand does not publish this dimension

BLOCKING = (UNKNOWN, UNPUBLISHED)
FAILING = (FAIL_SMALL, FAIL_LARGE)

# Verdict bands.
FITS = "fits"
LIKELY = "likely"
CANT_SAY = "cant_say"
WRONG_SIZE = "wrong_size"


# --------------------------------------------------------------------------
# Reading a garment
# --------------------------------------------------------------------------

def effective(value, dim, elastane):
    """Wearable size of a measurement, after the fabric gives.

    Only circumferences give. A sleeve does not get longer because there is
    elastane in it.
    """
    if DIMENSIONS[dim]["stretchy"] and elastane:
        return value * (1.0 + usable_stretch(elastane))
    return value


def measurements(gid, size):
    g = GARMENTS[gid]
    raw = g["sizes"][size]
    out = {}
    for dim, val in raw.items():
        out[dim] = {"raw": val, "eff": effective(val, dim, g.get("elastane", 0.0))}
    return out


# --------------------------------------------------------------------------
# Building the envelope
# --------------------------------------------------------------------------

def build_envelope(wardrobe, extra=None):
    """Derive, per scope, the measurements proven to work on this body.

    `extra` carries measurements the shopper has taped themselves, as
    {(garment_id, dim): value}. They are folded in as if the brand had
    published them all along.
    """
    extra = extra or {}
    scopes = {}

    def bucket(key):
        return scopes.setdefault(key, {"good": [], "low": [], "high": [], "evidence": []})

    for entry in wardrobe:
        gid, size = entry["garment"], entry["size"]
        g = GARMENTS[gid]
        cat = g["category"]
        elastane = g.get("elastane", 0.0)

        vals = dict(g["sizes"][size])
        for (xgid, xdim), xval in extra.items():
            if xgid == gid:
                vals[xdim] = xval

        verdict = entry["verdict"]
        flagged = set(entry.get("dims", []))

        # An unresolved note becomes real evidence the moment the shopper
        # supplies the missing number.
        unresolved = entry.get("unresolved")
        if unresolved and (gid, unresolved["dim"]) in extra:
            flagged = set(flagged) | {unresolved["dim"]}
            resolved_dir = unresolved["direction"]
        else:
            resolved_dir = None

        for dim, raw in vals.items():
            if dim not in DIMENSIONS:
                continue
            key = scope_for(gid, dim)
            b = bucket(key)
            eff = effective(raw, dim, elastane)
            src = {"garment": gid, "size": size, "dim": dim, "raw": raw, "eff": eff,
                   "note": entry.get("note", "")}

            if resolved_dir and dim == unresolved["dim"]:
                # "too long" means this value is an upper bound, and vice versa.
                side = "high" if resolved_dir == "long" else "low"
                b[side].append(eff)
                b["evidence"].append(dict(src, role=side, reason=resolved_dir))
                continue

            if verdict == "perfect":
                b["good"].append(eff)
                b["evidence"].append(dict(src, role="good", reason="perfect"))
            elif dim in flagged:
                side = "low" if verdict in ("tight", "short") else "high"
                b[side].append(eff)
                b["evidence"].append(dict(src, role=side, reason=verdict))
            # A dimension not named in the complaint is not a pass. Someone who
            # returns a shirt for a tight chest is not vouching for its hem.

    env = {}
    for key, b in scopes.items():
        dim = key[2]  # every scope key is (kind, owner, dim[, variant])
        tol = TOLERANCE[kind_of(dim)]
        core_lo = min(b["good"]) if b["good"] else None
        core_hi = max(b["good"]) if b["good"] else None
        hard_lo = max(b["low"]) if b["low"] else None
        hard_hi = min(b["high"]) if b["high"] else None

        band_lo = band_hi = None
        if core_lo is not None:
            band_lo, band_hi = core_lo - tol, core_hi + tol
            if hard_lo is not None:
                band_lo = max(band_lo, hard_lo)
            if hard_hi is not None:
                band_hi = min(band_hi, hard_hi)

        env[key] = {
            "core_lo": core_lo, "core_hi": core_hi,
            "band_lo": band_lo, "band_hi": band_hi,
            "hard_lo": hard_lo, "hard_hi": hard_hi,
            "evidence": b["evidence"],
            "has_any": bool(b["good"] or b["low"] or b["high"]),
        }
    return env


def binding_scopes(wardrobe):
    """The scopes this body has actually been burned on.

    Derived from the wardrobe rather than declared per segment, so a shopper who
    has never had a length problem is not nagged about length. Scoped, not bare
    dimension names: being hemmed on palazzos says nothing about shirt length,
    and charging a shirt full price for a palazzo complaint would make the
    engine look nervous about things it has no evidence on.
    """
    out = set()
    for entry in wardrobe:
        gid = entry["garment"]
        for d in entry.get("dims", []):
            out.add(scope_for(gid, d))
        if entry.get("unresolved"):
            out.add(scope_for(gid, entry["unresolved"]["dim"]))
    return out


def context(wardrobe, extra=None):
    env = build_envelope(wardrobe, extra)
    return {"env": env, "binding": binding_scopes(wardrobe), "wardrobe": wardrobe}


# --------------------------------------------------------------------------
# Fabric
# --------------------------------------------------------------------------

def fabric_note(gid, ctx, findings=None):
    """What the arithmetic cannot see about a fabric.

    Stretch is already handled: effective() converts elastane into wearable
    inches before anything is compared, so a rigid garment is judged at its
    literal measurement and a stretchy one at its stretched measurement.
    Charging it again here would be double counting.

    Two things survive that the numbers miss.

    no_give   - the garment is rigid AND the fit is close. There is no reserve
                to absorb a heavy lunch, a fitted cut or a slightly optimistic
                size chart. This is the "the measurement was right and it still
                felt tight" complaint.
    new_to_you - the fabric family appears nowhere in the proven wardrobe. Raw
                silk behaves nothing like the cottons this shopper has proven,
                and no measurement will tell them that.
    """
    g = GARMENTS[gid]
    cand_stretch = g.get("elastane", 0.0)
    cat = g["category"]

    proven = [e["garment"] for e in ctx["wardrobe"] if e["verdict"] == "perfect"]
    if not proven:
        return None
    same_cat = [r for r in proven if GARMENTS[r]["category"] == cat]

    notes = []

    # no_give: rigid, and sitting within an inch of the proven lower bound.
    if cand_stretch <= 0.01 and findings:
        refs = same_cat or proven
        ref_stretch = max(GARMENTS[r].get("elastane", 0.0) for r in refs)
        margins = [f["value"] - f["band"][0] for f in findings
                   if f["band"] and f["band"][0] is not None
                   and kind_of(f["dim"]) == CIRC and f["code"] in (OK, SNUG)]
        if ref_stretch >= 0.02 and margins and min(margins) < 1.0:
            tight = min(margins)
            best = max(refs, key=lambda r: GARMENTS[r].get("elastane", 0.0))
            notes.append({"kind": "no_give", "penalty": 8, "margin": round(tight, 1),
                          "candidate": g["fabric"], "ref": best,
                          "ref_fabric": GARMENTS[best]["fabric"]})

    # new_to_you: a fabric family with no precedent anywhere in the wardrobe.
    # Familiarity is not the same as fit, so a garment they kept and had altered
    # still tells us how that fabric behaves on them.
    cand_fams = fabric_families(g["fabric"], min_share=0.5)
    known = set()
    for e in ctx["wardrobe"]:
        known |= fabric_families(GARMENTS[e["garment"]]["fabric"])
    novel = cand_fams - known
    if novel:
        notes.append({"kind": "new_to_you", "penalty": 0,
                      "families": sorted(novel), "candidate": g["fabric"]})

    return notes or None


# --------------------------------------------------------------------------
# Judging a garment
# --------------------------------------------------------------------------

def judge(gid, size, ctx):
    g = GARMENTS[gid]
    cat = g["category"]
    env = ctx["env"]
    silhouette = g.get("silhouette")
    published = measurements(gid, size)
    findings = []

    for dim in CATEGORIES[cat]["critical"]:
        lab = label_of(dim, cat)
        if dim not in published:
            findings.append({"dim": dim, "label": lab, "code": UNPUBLISHED,
                             "delta": None, "value": None, "band": None})
            continue

        m = published[dim]["eff"]
        raw = published[dim]["raw"]
        e = env.get(scope_for(gid, dim))

        if not e or not e["has_any"]:
            findings.append({"dim": dim, "label": lab, "code": UNKNOWN,
                             "delta": None, "value": raw, "band": None})
            continue

        band = (e["band_lo"], e["band_hi"])
        code, delta = OK, 0.0
        if e["hard_lo"] is not None and m <= e["hard_lo"]:
            code, delta = FAIL_SMALL, e["hard_lo"] - m
        elif e["hard_hi"] is not None and m >= e["hard_hi"]:
            code, delta = FAIL_LARGE, m - e["hard_hi"]
        elif e["band_lo"] is not None:
            if m < e["band_lo"]:
                code, delta = SNUG, e["band_lo"] - m
            elif m > e["band_hi"]:
                code, delta = ROOMY, m - e["band_hi"]
        else:
            # Only a hard bound exists, and this value clears it. Weaker than a
            # proven band but a long way from knowing nothing: a 30" inseam
            # against a pair she had to have shortened is real evidence.
            code = CLEARS

        # A garment cut oversized is meant to exceed the usual. Report the extra
        # room; do not score it as a defect.
        if silhouette in ("oversized", "relaxed") and code in (ROOMY, FAIL_LARGE) \
           and dim in SILHOUETTE_DIMS:
            code = INTENDED

        findings.append({"dim": dim, "label": lab, "code": code,
                         "delta": round(delta, 1), "value": raw, "band": band})

    return _score(gid, size, cat, findings, ctx)


def _score(gid, size, cat, findings, ctx):
    binding = ctx["binding"]
    penalty = 0
    blocked_binding = []
    for f in findings:
        is_binding = scope_for(gid, f["dim"]) in binding
        if f["code"] in BLOCKING:
            penalty += 32 if is_binding else 12
            if is_binding:
                blocked_binding.append(f)
        elif f["code"] in (SNUG, ROOMY):
            # Hem and sleeve length are often an intentional style difference -
            # a midi is not a failed mini - so they are capped lower. The card
            # still prints the inches and lets the shopper decide.
            cap = 10 if kind_of(f["dim"]) == LENGTH else 18
            penalty += min(cap, 6 + f["delta"] * 8)
        elif f["code"] == CLEARS:
            penalty += 8
        elif f["code"] == INTENDED:
            penalty += 2

    fabric = fabric_note(gid, ctx, findings)
    if fabric:
        penalty += sum(n["penalty"] for n in fabric)

    fails = [f for f in findings if f["code"] in FAILING]
    findings_blocked = [f for f in findings if f["code"] in BLOCKING]
    confidence = max(0, min(100, int(round(100 - penalty))))

    if fails:
        status = WRONG_SIZE
    elif blocked_binding:
        status = CANT_SAY
    elif confidence >= 72 and not findings_blocked:
        status = FITS
    elif confidence >= 48:
        # Something critical is still unmeasured. High confidence in the parts
        # we can see is not the same as saying it will fit.
        status = LIKELY
    else:
        status = CANT_SAY

    return {
        "garment": gid, "size": size, "category": cat,
        "findings": findings, "fails": fails, "fabric": fabric,
        "blocked": [f for f in findings if f["code"] in BLOCKING],
        "blocked_binding": blocked_binding,
        "confidence": confidence, "status": status,
    }


def judge_all_sizes(gid, ctx):
    return {s: judge(gid, s, ctx) for s in GARMENTS[gid]["sizes"]}


def recommend(gid, shown_size, ctx):
    """Judge the saved size, and find a better one if the saved size falls short."""
    all_j = judge_all_sizes(gid, ctx)
    current = all_j[shown_size]

    def rank(j):
        return (len(j["fails"]), -j["confidence"], len(j["blocked"]))

    best_size = sorted(all_j, key=lambda s: rank(all_j[s]))[0]
    alt = None
    if best_size != shown_size and rank(all_j[best_size]) < rank(current):
        alt = all_j[best_size]
    return {"current": current, "alt": alt, "all": all_j}


# --------------------------------------------------------------------------
# What one measurement would unlock
# --------------------------------------------------------------------------

def unlock_opportunities(persona, ctx, extra=None):
    """Rank the missing measurements by how many saved items each would resolve.

    Only UNKNOWN counts. An UNPUBLISHED dimension is the brand's gap, and no
    amount of measuring at home will close it - claiming otherwise would be the
    same bluff this engine exists to avoid.
    """
    extra = extra or {}
    wanted = {}

    for item in persona["wishlist"]:
        gid = item["garment"]
        r = recommend(gid, item["size"], ctx)
        for f in r["current"]["blocked"]:
            if f["code"] != UNKNOWN:
                continue
            key = scope_for(gid, f["dim"])
            w = wanted.setdefault(key, {"dim": f["dim"], "items": [],
                                        "binding": key in ctx["binding"]})
            w["items"].append(gid)

    out = []
    for key, w in wanted.items():
        source = _measurable_source(persona, key, w["dim"], extra)
        if not source:
            continue
        out.append({"key": key, "dim": w["dim"], "label": label_of(w["dim"]),
                    "items": w["items"], "count": len(w["items"]),
                    "binding": w["binding"], "source": source})
    out.sort(key=lambda o: (-o["count"], not o["binding"]))
    return out


def _measurable_source(persona, key, dim, extra):
    """Pick the garment the shopper should put a tape to.

    Prefer one they already told us was wrong on this dimension: measuring that
    yields a hard bound, which is worth more than another proven-good value.
    """
    candidates = []
    for entry in persona["wardrobe"]:
        gid = entry["garment"]
        if scope_for(gid, dim) != key:
            continue
        if dim in GARMENTS[gid]["sizes"][entry["size"]] or (gid, dim) in extra:
            continue  # already known
        unres = entry.get("unresolved")
        candidates.append((0 if (unres and unres["dim"] == dim) else 1, entry))
    if not candidates:
        return None
    candidates.sort(key=lambda c: c[0])
    entry = candidates[0][1]
    return {"garment": entry["garment"], "size": entry["size"],
            "unresolved": entry.get("unresolved"), "verdict": entry["verdict"]}


# --------------------------------------------------------------------------
# Whole-wishlist rollup
# --------------------------------------------------------------------------

def review_wishlist(persona, extra=None):
    ctx = context(persona["wardrobe"], extra)
    rows = []
    for item in persona["wishlist"]:
        r = recommend(item["garment"], item["size"], ctx)
        rows.append({"item": item, "gid": item["garment"], "size": item["size"],
                     "days": item["days"], "result": r["current"], "alt": r["alt"],
                     "all": r["all"]})
    order = {FITS: 0, LIKELY: 1, CANT_SAY: 2, WRONG_SIZE: 3}
    rows.sort(key=lambda r: (order[r["result"]["status"]], -r["result"]["confidence"]))
    return {
        "ctx": ctx, "env": ctx["env"], "binding": ctx["binding"], "rows": rows,
        "unlocks": unlock_opportunities(persona, ctx, extra),
        "gaps": wardrobe_gaps(persona, ctx),
        "counts": {s: sum(1 for r in rows if r["result"]["status"] == s)
                   for s in (FITS, LIKELY, CANT_SAY, WRONG_SIZE)},
    }


def wardrobe_gaps(persona, ctx):
    """Saved items blocked because the wardrobe has nothing to judge them by.

    Distinct from an unlock: there is no garment to measure, because the shopper
    owns nothing in that scope. The fix is to add one, not to reach for a tape.
    """
    gaps = {}
    for item in persona["wishlist"]:
        gid = item["garment"]
        r = recommend(gid, item["size"], ctx)
        for f in r["current"]["blocked"]:
            if f["code"] != UNKNOWN:
                continue
            key = scope_for(gid, f["dim"])
            if _measurable_source(persona, key, f["dim"], {}):
                continue  # a tape fixes this one, so it is an unlock not a gap
            cat = GARMENTS[gid]["category"]
            g = gaps.setdefault((cat, f["dim"]), {
                "category": cat, "dim": f["dim"], "label": label_of(f["dim"], cat),
                "cat_label": CATEGORIES[cat]["label"], "items": []})
            if gid not in g["items"]:
                g["items"].append(gid)
    out = sorted(gaps.values(), key=lambda g: -len(g["items"]))
    return out


def anchor_garment(persona):
    """The proven-good garment to name on the home screen: the one carrying the
    most published measurements, since it vouches for the most."""
    best, best_n = None, -1
    for entry in persona["wardrobe"]:
        if entry["verdict"] != "perfect":
            continue
        n = len(GARMENTS[entry["garment"]]["sizes"][entry["size"]])
        if n > best_n:
            best, best_n = entry, n
    return best
