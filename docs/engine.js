// The fit engine. Everything here is deterministic.
//
// It never asks what size the shopper is. It works out which garment
// measurements have already been proven to work on this body, then compares a
// candidate garment against those - measurement to measurement, never label to
// label.
//
// Ported from fit_engine.py, which stays the reference implementation and keeps
// the invariant test suite. Rules and constants are identical.

import { GARMENTS, title } from "./data.js";

// --- vocabulary ------------------------------------------------------------
// `kind` decides how a mismatch is judged: a circumference smaller than
// something already called too tight is a hard failure, but the same
// circumference running large is a style choice, not a defect. Lengths and
// shoulder width fail in both directions.
export const CIRC = "circ", WIDTH = "width", LENGTH = "length";

export const DIMENSIONS = {
  chest:         { label: "Chest",    kind: CIRC,   stretchy: true },
  waist:         { label: "Waist",    kind: CIRC,   stretchy: true },
  hip:           { label: "Hip",      kind: CIRC,   stretchy: true },
  thigh:         { label: "Thigh",    kind: CIRC,   stretchy: true },
  shoulder:      { label: "Shoulder", kind: WIDTH,  stretchy: false },
  length:        { label: "Length",   kind: LENGTH, stretchy: false },
  sleeve_length: { label: "Sleeve",   kind: LENGTH, stretchy: false },
  inseam:        { label: "Inseam",   kind: LENGTH, stretchy: false },
  rise:          { label: "Rise",     kind: LENGTH, stretchy: false },
};

export const CATEGORIES = {
  top:       { label: "Top",       region: "upper", critical: ["chest", "shoulder", "sleeve_length", "length"] },
  kurta:     { label: "Kurta",     region: "upper", critical: ["chest", "waist", "length", "sleeve_length"] },
  dress:     { label: "Dress",     region: "upper", critical: ["chest", "waist", "hip", "length"] },
  outerwear: { label: "Outerwear", region: "upper", critical: ["chest", "shoulder", "sleeve_length", "length"] },
  occasion:  { label: "Occasion",  region: "upper", critical: ["chest", "waist", "length"] },
  jeans:     { label: "Jeans",     region: "lower", critical: ["waist", "hip", "thigh", "inseam"] },
  trousers:  { label: "Trousers",  region: "lower", critical: ["waist", "hip", "inseam"] },
  palazzo:   { label: "Palazzo",   region: "lower", critical: ["waist", "hip", "length"] },
};

// Inseam and rise are body-anchored - crotch to floor does not change because
// the garment is denim rather than twill - so they pool across a region like a
// circumference. Hem and sleeve length are choices a designer made, so they
// stay locked to their own category.
const BODY_ANCHORED = new Set(["inseam", "rise"]);

// Where a brand would print "bust" rather than "chest".
const DIM_LABEL_BY_CATEGORY = { kurta: { chest: "Bust" }, dress: { chest: "Bust" }, occasion: { chest: "Bust" } };

export function label(dim, category) {
  const o = category && DIM_LABEL_BY_CATEGORY[category];
  return (o && o[dim]) || DIMENSIONS[dim].label;
}

const TOLERANCE = { [CIRC]: 0.75, [WIDTH]: 0.5, [LENGTH]: 1.0 };

// Where an oversized or relaxed cut legitimately adds room. The waist is not on
// this list: jeans cut wide through the leg still have to sit at the waist.
const SILHOUETTE_DIMS = new Set(["chest", "shoulder", "hip", "thigh"]);

// Elastane converts into wearable give. Deliberately conservative: a garment
// does not hand you its full stretch as usable room.
export function usableStretch(elastane) {
  return elastane ? Math.min(0.075, elastane * 1.6) : 0;
}

// --- finding codes ---------------------------------------------------------
export const OK = "ok", SNUG = "snug", ROOMY = "roomy", INTENDED = "intended",
  FAIL_SMALL = "fail_small", FAIL_LARGE = "fail_large",
  CLEARS = "clears",           // passes the only bound we have, no proven band
  UNKNOWN = "unknown",         // brand publishes it; nothing you own judges it
  UNPUBLISHED = "unpublished"; // the brand does not publish it at all

const BLOCKING = new Set([UNKNOWN, UNPUBLISHED]);
const FAILING = new Set([FAIL_SMALL, FAIL_LARGE]);

export const FITS = "fits", LIKELY = "likely", CANT_SAY = "cant_say", WRONG_SIZE = "wrong_size";

// --- scoping ---------------------------------------------------------------
export function scopeOf(gid, dim) {
  const g = GARMENTS[gid], cat = g.category;
  if (dim === "sleeve_length") return `C|${cat}|${dim}|${g.sleeve || "full"}`;
  if (DIMENSIONS[dim].kind === LENGTH && !BODY_ANCHORED.has(dim)) return `C|${cat}|${dim}`;
  return `R|${CATEGORIES[cat].region}|${dim}`;
}

export function effective(value, dim, elastane) {
  return DIMENSIONS[dim].stretchy && elastane ? value * (1 + usableStretch(elastane)) : value;
}

// --- envelope --------------------------------------------------------------
// The instrument: per scope, the range of garment measurements proven to work
// on this body. Not a body measurement - it already bakes in their proportions,
// their fit preference and their tolerance.
export function buildEnvelope(wardrobe, extra = {}) {
  const scopes = new Map();
  const bucket = (key, dim, owner) => {
    if (!scopes.has(key)) scopes.set(key, { dim, owner, good: [], low: [], high: [], evidence: [] });
    return scopes.get(key);
  };

  for (const entry of wardrobe) {
    const gid = entry.garment, g = GARMENTS[gid], cat = g.category;
    const vals = { ...g.sizes[entry.size] };
    for (const [k, v] of Object.entries(extra)) {
      const [xgid, xdim] = k.split("|");
      if (xgid === gid) vals[xdim] = v;
    }

    let flagged = new Set(entry.dims || []);
    let resolvedDir = null;
    const unres = entry.unresolved;
    if (unres && extra[`${gid}|${unres.dim}`] !== undefined) {
      flagged.add(unres.dim);
      resolvedDir = unres.direction;
    }

    for (const [dim, raw] of Object.entries(vals)) {
      if (!DIMENSIONS[dim]) continue;
      const key = scopeOf(gid, dim);
      const owner = key[0] === "R" ? CATEGORIES[cat].region : cat;
      const b = bucket(key, dim, owner);
      const eff = effective(raw, dim, g.elastane || 0);
      const src = { garment: gid, size: entry.size, dim, raw, eff };

      if (resolvedDir && dim === unres.dim) {
        // "too long" means this value is an upper bound, and vice versa.
        const side = resolvedDir === "long" ? "high" : "low";
        b[side].push(eff);
        b.evidence.push({ ...src, role: side, reason: resolvedDir });
      } else if (entry.verdict === "perfect") {
        b.good.push(eff);
        b.evidence.push({ ...src, role: "good", reason: "perfect" });
      } else if (flagged.has(dim)) {
        const side = (entry.verdict === "tight" || entry.verdict === "short") ? "low" : "high";
        b[side].push(eff);
        b.evidence.push({ ...src, role: side, reason: entry.verdict });
      }
      // A dimension not named in the complaint is not a pass. Someone who
      // returns a shirt for a tight chest is not vouching for its hem.
    }
  }

  const env = new Map();
  for (const [key, b] of scopes) {
    const tol = TOLERANCE[DIMENSIONS[b.dim].kind];
    const coreLo = b.good.length ? Math.min(...b.good) : null;
    const coreHi = b.good.length ? Math.max(...b.good) : null;
    const hardLo = b.low.length ? Math.max(...b.low) : null;
    const hardHi = b.high.length ? Math.min(...b.high) : null;
    let bandLo = null, bandHi = null;
    if (coreLo !== null) {
      bandLo = coreLo - tol; bandHi = coreHi + tol;
      if (hardLo !== null) bandLo = Math.max(bandLo, hardLo);
      if (hardHi !== null) bandHi = Math.min(bandHi, hardHi);
    }
    env.set(key, {
      dim: b.dim, owner: b.owner, coreLo, coreHi, bandLo, bandHi, hardLo, hardHi,
      evidence: b.evidence, hasAny: !!(b.good.length || b.low.length || b.high.length),
    });
  }
  return env;
}

// Scopes this body has actually been burned on. Derived from the wardrobe
// rather than declared per segment, so a shopper who has never had a length
// problem is not nagged about length.
export function bindingScopes(wardrobe) {
  const out = new Set();
  for (const entry of wardrobe) {
    for (const d of entry.dims || []) out.add(scopeOf(entry.garment, d));
    if (entry.unresolved) out.add(scopeOf(entry.garment, entry.unresolved.dim));
  }
  return out;
}

export function context(wardrobe, extra = {}) {
  return { env: buildEnvelope(wardrobe, extra), binding: bindingScopes(wardrobe), wardrobe };
}

// --- fabric ----------------------------------------------------------------
const FABRIC_FAMILIES = [
  ["silk", "silk"], ["linen", "linen"], ["wool", "wool"], ["rayon", "viscose"],
  ["viscose", "viscose"], ["modal", "viscose"], ["cotton", "cotton"],
  ["polyester", "synthetic"], ["nylon", "synthetic"], ["polyamide", "synthetic"],
];

export function fabricFamilies(composition, minShare = 0) {
  const low = composition.toLowerCase(), shares = {};
  for (const [token, fam] of FABRIC_FAMILIES) {
    const idx = low.indexOf(token);
    if (idx < 0) continue;
    const before = low.slice(0, idx);
    const m = [...before.matchAll(/(\d+)\s*%/g)].pop();
    const share = m ? parseInt(m[1], 10) / 100 : 1;
    shares[fam] = Math.max(shares[fam] || 0, share);
  }
  return new Set(Object.entries(shares).filter(([, s]) => s >= minShare).map(([f]) => f));
}

// What the arithmetic cannot see. Stretch is already handled by effective(),
// which converts elastane into wearable inches before anything is compared, so
// charging it again here would be double counting. Two things survive:
//   no_give    - rigid AND the fit is close, so there is no reserve
//   new_to_you - a fabric family with no precedent in the wardrobe
function fabricNote(gid, ctx, findings) {
  const g = GARMENTS[gid], notes = [];
  const proven = ctx.wardrobe.filter(e => e.verdict === "perfect").map(e => e.garment);
  if (!proven.length) return null;
  const sameCat = proven.filter(r => GARMENTS[r].category === g.category);

  if ((g.elastane || 0) <= 0.01 && findings) {
    const refs = sameCat.length ? sameCat : proven;
    const refStretch = Math.max(...refs.map(r => GARMENTS[r].elastane || 0));
    const margins = findings
      .filter(f => f.band && f.band[0] !== null && DIMENSIONS[f.dim].kind === CIRC &&
                   (f.code === OK || f.code === SNUG))
      .map(f => f.value - f.band[0]);
    if (refStretch >= 0.02 && margins.length && Math.min(...margins) < 1.0) {
      const best = refs.reduce((a, b) => (GARMENTS[b].elastane || 0) > (GARMENTS[a].elastane || 0) ? b : a);
      notes.push({ kind: "no_give", penalty: 8, margin: Math.min(...margins), ref: best });
    }
  }

  // Familiarity is not the same as fit, so a garment they kept and altered
  // still tells us how that fabric behaves on them.
  const known = new Set();
  for (const e of ctx.wardrobe) for (const f of fabricFamilies(GARMENTS[e.garment].fabric)) known.add(f);
  const novel = [...fabricFamilies(g.fabric, 0.5)].filter(f => !known.has(f));
  if (novel.length) notes.push({ kind: "new_to_you", penalty: 0, families: novel });

  return notes.length ? notes : null;
}

// --- judging ---------------------------------------------------------------
export function judge(gid, size, ctx) {
  const g = GARMENTS[gid], cat = g.category, findings = [];
  const raws = g.sizes[size];

  for (const dim of CATEGORIES[cat].critical) {
    const lab = label(dim, cat);
    if (raws[dim] === undefined) {
      findings.push({ dim, label: lab, code: UNPUBLISHED, delta: null, value: null, band: null });
      continue;
    }
    const raw = raws[dim];
    const m = effective(raw, dim, g.elastane || 0);
    const e = ctx.env.get(scopeOf(gid, dim));

    if (!e || !e.hasAny) {
      findings.push({ dim, label: lab, code: UNKNOWN, delta: null, value: raw, band: null });
      continue;
    }

    let code = OK, delta = 0;
    if (e.hardLo !== null && m <= e.hardLo) { code = FAIL_SMALL; delta = e.hardLo - m; }
    else if (e.hardHi !== null && m >= e.hardHi) { code = FAIL_LARGE; delta = m - e.hardHi; }
    else if (e.bandLo !== null) {
      if (m < e.bandLo) { code = SNUG; delta = e.bandLo - m; }
      else if (m > e.bandHi) { code = ROOMY; delta = m - e.bandHi; }
    } else {
      // Only a hard bound exists and this value clears it. Weaker than a proven
      // band, but a long way from knowing nothing.
      code = CLEARS;
    }

    if ((g.silhouette === "oversized" || g.silhouette === "relaxed") &&
        (code === ROOMY || code === FAIL_LARGE) && SILHOUETTE_DIMS.has(dim)) {
      code = INTENDED;
    }

    findings.push({ dim, label: lab, code, delta: Math.round(delta * 10) / 10,
                    value: raw, band: [e.bandLo, e.bandHi] });
  }

  return score(gid, size, cat, findings, ctx);
}

function score(gid, size, cat, findings, ctx) {
  let penalty = 0;
  const blockedBinding = [];
  for (const f of findings) {
    const isBinding = ctx.binding.has(scopeOf(gid, f.dim));
    if (BLOCKING.has(f.code)) {
      penalty += isBinding ? 32 : 12;
      if (isBinding) blockedBinding.push(f);
    } else if (f.code === SNUG || f.code === ROOMY) {
      // Hem and sleeve length are often an intentional style difference - a
      // midi is not a failed mini - so they are capped lower.
      const cap = DIMENSIONS[f.dim].kind === LENGTH ? 10 : 18;
      penalty += Math.min(cap, 6 + f.delta * 8);
    } else if (f.code === CLEARS) penalty += 8;
    else if (f.code === INTENDED) penalty += 2;
  }

  const fabric = fabricNote(gid, ctx, findings);
  if (fabric) penalty += fabric.reduce((a, n) => a + n.penalty, 0);

  const fails = findings.filter(f => FAILING.has(f.code));
  const blocked = findings.filter(f => BLOCKING.has(f.code));
  const confidence = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  let status;
  if (fails.length) status = WRONG_SIZE;
  else if (blockedBinding.length) status = CANT_SAY;
  else if (confidence >= 72 && !blocked.length) status = FITS;
  else if (confidence >= 48) status = LIKELY;   // something critical is unmeasured
  else status = CANT_SAY;

  return { garment: gid, size, category: cat, findings, fails, blocked, blockedBinding,
           fabric, confidence, status };
}

export function recommend(gid, shownSize, ctx) {
  const all = {};
  for (const s of Object.keys(GARMENTS[gid].sizes)) all[s] = judge(gid, s, ctx);
  const current = all[shownSize];
  const rank = j => [j.fails.length, -j.confidence, j.blocked.length];
  const cmp = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  const best = Object.keys(all).sort((a, b) => cmp(all[a], all[b]))[0];
  const alt = (best !== shownSize && cmp(all[best], current) < 0) ? all[best] : null;
  return { current, alt, all };
}

// --- what one measurement would unlock -------------------------------------
// Only UNKNOWN counts. An UNPUBLISHED dimension is the brand's gap and no
// amount of measuring at home will close it; claiming otherwise would be the
// same bluff this engine exists to avoid.
export function unlockOpportunities(persona, ctx, extra = {}) {
  const wanted = new Map();
  for (const item of persona.wishlist) {
    const r = recommend(item.garment, item.size, ctx);
    for (const f of r.current.blocked) {
      if (f.code !== UNKNOWN) continue;
      const key = scopeOf(item.garment, f.dim);
      if (!wanted.has(key)) wanted.set(key, { dim: f.dim, items: [], binding: ctx.binding.has(key) });
      wanted.get(key).items.push(item.garment);
    }
  }
  const out = [];
  for (const [key, w] of wanted) {
    const source = measurableSource(persona, key, w.dim, extra);
    if (!source) continue;
    out.push({ key, dim: w.dim, label: label(w.dim), items: w.items,
               count: w.items.length, binding: w.binding, source });
  }
  out.sort((a, b) => (b.count - a.count) || (a.binding === b.binding ? 0 : a.binding ? -1 : 1));
  return out;
}

// Prefer a garment they already told us was wrong on this dimension: measuring
// that yields a hard bound, worth more than another proven-good value.
function measurableSource(persona, key, dim, extra) {
  const cands = [];
  for (const entry of persona.wardrobe) {
    const gid = entry.garment;
    if (scopeOf(gid, dim) !== key) continue;
    if (GARMENTS[gid].sizes[entry.size][dim] !== undefined) continue;
    if (extra[`${gid}|${dim}`] !== undefined) continue;
    cands.push([entry.unresolved && entry.unresolved.dim === dim ? 0 : 1, entry]);
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a[0] - b[0]);
  const e = cands[0][1];
  return { garment: e.garment, size: e.size, unresolved: e.unresolved, verdict: e.verdict };
}

// Saved items blocked because the wardrobe holds nothing to judge them by.
// Distinct from an unlock: there is no garment to measure, so the fix is to add
// one rather than to reach for a tape.
export function wardrobeGaps(persona, ctx) {
  const gaps = new Map();
  for (const item of persona.wishlist) {
    const r = recommend(item.garment, item.size, ctx);
    for (const f of r.current.blocked) {
      if (f.code !== UNKNOWN) continue;
      const key = scopeOf(item.garment, f.dim);
      if (measurableSource(persona, key, f.dim, {})) continue;
      const cat = GARMENTS[item.garment].category;
      const k = `${cat}|${f.dim}`;
      if (!gaps.has(k)) gaps.set(k, { category: cat, dim: f.dim, label: label(f.dim, cat),
                                      catLabel: CATEGORIES[cat].label, items: [] });
      if (!gaps.get(k).items.includes(item.garment)) gaps.get(k).items.push(item.garment);
    }
  }
  return [...gaps.values()].sort((a, b) => b.items.length - a.items.length);
}

const ORDER = { [FITS]: 0, [LIKELY]: 1, [CANT_SAY]: 2, [WRONG_SIZE]: 3 };

export function reviewWishlist(persona, extra = {}) {
  const ctx = context(persona.wardrobe, extra);
  const rows = persona.wishlist.map(item => {
    const r = recommend(item.garment, item.size, ctx);
    return { gid: item.garment, size: item.size, days: item.days,
             result: r.current, alt: r.alt, all: r.all };
  });
  rows.sort((a, b) => (ORDER[a.result.status] - ORDER[b.result.status]) ||
                      (b.result.confidence - a.result.confidence));
  const counts = { [FITS]: 0, [LIKELY]: 0, [CANT_SAY]: 0, [WRONG_SIZE]: 0 };
  for (const r of rows) counts[r.result.status]++;
  return { ctx, env: ctx.env, rows, counts,
           unlocks: unlockOpportunities(persona, ctx, extra),
           gaps: wardrobeGaps(persona, ctx) };
}

// The proven-good garment to name on the home screen: the one carrying the most
// published measurements, since it vouches for the most.
export function anchorGarment(persona) {
  let best = null, bestN = -1;
  for (const e of persona.wardrobe) {
    if (e.verdict !== "perfect") continue;
    const n = Object.keys(GARMENTS[e.garment].sizes[e.size]).length;
    if (n > bestN) { best = e; bestN = n; }
  }
  return best;
}

// --- copy ------------------------------------------------------------------
export function inches(x) {
  x = Math.abs(x);
  if (x < 0.1) return "a fraction";
  return Math.abs(x - Math.round(x)) < 0.05 ? `${Math.round(x)}"` : `${x.toFixed(1)}"`;
}

export function decidingEvidence(gid, finding, ctx) {
  const e = ctx.env.get(scopeOf(gid, finding.dim));
  if (!e) return null;
  const map = { [FAIL_SMALL]: "low", [FAIL_LARGE]: "high", [SNUG]: "good", [ROOMY]: "good", [OK]: "good" };
  const want = map[finding.code] || (e.hardHi !== null ? "high" : "low");
  return e.evidence.find(v => v.role === want) || e.evidence[0] || null;
}

// The badge over the photo. Short, and actionable where it can be.
export function badge(res) {
  if (res.status === WRONG_SIZE) return { text: "WRONG SIZE", tone: "bad" };
  if (res.status === FITS) return { text: "FITS YOU", tone: "good" };
  if (res.status === LIKELY) return { text: "LIKELY FITS", tone: "warn" };
  const fixable = res.blocked.some(f => f.code === UNKNOWN);
  return fixable ? { text: "1 MEASURE AWAY", tone: "info" } : { text: "NO SIZE DATA", tone: "info" };
}

// The one line under the price. Five words at most - the detail sheet carries
// the reasoning.
export function shortLine(row, ctx) {
  const res = row.result;
  if (res.status === WRONG_SIZE) {
    if (row.alt) return `Try size ${row.alt.size}`;
    const f = res.fails[0];
    const dir = f.code === FAIL_SMALL ? "tight" :
      (DIMENSIONS[f.dim].kind === LENGTH ? "long" : "wide");
    return `${inches(f.delta)} too ${dir}`;
  }
  if (res.status === FITS) {
    const ev = decidingEvidence(row.gid, res.findings.find(f => f.code === OK) || res.findings[0], ctx);
    return ev ? `Matches your ${GARMENTS[ev.garment].brand}` : "Matches what you own";
  }
  const b = res.blocked[0];
  if (!b) {
    const c = res.findings.find(f => f.code === CLEARS);
    if (c) {
      const ev = decidingEvidence(row.gid, c, ctx);
      return ev ? `${c.label} clears your ${GARMENTS[ev.garment].brand}` : `${c.label} looks right`;
    }
    return "Close to what fits you";
  }
  if (b.code === UNPUBLISHED) return `${b.label} not published`;
  // "Unverified" where we are still calling it a probable fit; "unknown" where
  // it is the thing actually blocking the verdict.
  return res.status === LIKELY ? `${b.label} unverified` : `${b.label} unknown`;
}
