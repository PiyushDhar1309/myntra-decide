// The decide engine: which saved items are actually rivals, and what genuinely
// separates them.
//
// Everything here is deterministic. A shopper who saves six kurtas has not made
// six decisions - they have made one and deferred which, and the wishlist
// stores that as six independent intents. This module recovers the decision.

import { PRODUCTS, rupees } from "./data.js";

// Attributes a shopper can actually decide on, weighted by how much they should
// carry. Price and delivery lead because they are the two that change the
// answer most often; care instructions are last because almost nobody chooses
// on them. Anything identical across the set is suppressed rather than shown -
// a spec table of twelve rows where nine are the same is noise pretending to be
// information.
export const ATTRS = [
  { key: "price",    label: "Price",    weight: 10, fmt: p => rupees(p.price),
    note: p => `${p.off}% off`, best: "min" },
  { key: "delivery", label: "Delivery", weight: 9,
    fmt: p => p.delivery === 1 ? "Tomorrow" : `${p.delivery} days`,
    best: "min" },
  { key: "fabric",   label: "Fabric",   weight: 8 },
  { key: "length",   label: "Length",   weight: 7 },
  { key: "sleeve",   label: "Sleeve",   weight: 6 },
  { key: "returns",  label: "Returns",  weight: 6, fmt: p => `${p.returns} days`, best: "max" },
  { key: "rating",   label: "Rating",   weight: 5,
    fmt: p => `${p.rating} ★`, note: p => `${(p.ratingCount / 1000).toFixed(1)}k`, best: "max" },
  { key: "fit",      label: "Fit",      weight: 4 },
  { key: "pattern",  label: "Pattern",  weight: 4 },
  { key: "colour",   label: "Colour",   weight: 3 },
  { key: "occasion", label: "Occasion", weight: 3 },
  { key: "wash",     label: "Care",     weight: 2 },
];

const val = (p, key) => PRODUCTS[p][key];
const fmt = (a, p) => (a.fmt ? a.fmt(PRODUCTS[p]) : String(val(p, a.key)));

// Two items are rivals if they answer the same need at a comparable price.
// Subcategory carries most of that: nobody is choosing between a saree and a
// pair of jeans. The price guard stops a 6,500 lehenga anchoring a set of
// 1,200 kurtas, which would make the comparison meaningless.
export function comparable(a, b) {
  const A = PRODUCTS[a], B = PRODUCTS[b];
  if (A.sub !== B.sub) return false;
  const hi = Math.max(A.price, B.price), lo = Math.min(A.price, B.price);
  return hi / lo <= 2.2;
}

// Group saved items into decision sets. Three is the threshold: two items is a
// glance, not a decision worth a dedicated surface.
export function findClusters(ids, min = 3) {
  const bySub = new Map();
  for (const id of ids) {
    const sub = PRODUCTS[id].sub;
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub).push(id);
  }
  const out = [];
  for (const [sub, group] of bySub) {
    if (group.length < min) continue;
    // Split on price so a set never spans wildly different budgets.
    const sorted = group.slice().sort((a, b) => PRODUCTS[a].price - PRODUCTS[b].price);
    let band = [sorted[0]];
    const flush = () => {
      if (band.length >= min) out.push({ sub, items: band.slice() });
    };
    for (let i = 1; i < sorted.length; i++) {
      if (comparable(band[0], sorted[i])) band.push(sorted[i]);
      else { flush(); band = [sorted[i]]; }
    }
    flush();
  }
  return out.sort((a, b) => b.items.length - a.items.length);
}

// What the set shares, and what separates it.
export function diff(ids) {
  const same = [], differs = [];
  for (const a of ATTRS) {
    const values = ids.map(id => fmt(a, id));
    const unique = [...new Set(values)];
    if (unique.length === 1) same.push({ attr: a, value: unique[0] });
    else differs.push({ attr: a, unique: unique.length,
                        values: Object.fromEntries(ids.map(id => [id, fmt(a, id)])) });
  }
  differs.sort((x, y) => y.attr.weight - x.attr.weight);
  return { same, differs };
}

// Which item wins on a given attribute, where "winning" is meaningful at all.
export function bestOn(ids, attr) {
  if (!attr.best) return null;
  const pick = attr.best === "min"
    ? (a, b) => (val(a, attr.key) < val(b, attr.key) ? a : b)
    : (a, b) => (val(a, attr.key) > val(b, attr.key) ? a : b);
  const winner = ids.reduce(pick);
  // A winner nobody else ties with, or it is not worth flagging.
  const tied = ids.filter(id => val(id, attr.key) === val(winner, attr.key));
  return tied.length === 1 ? winner : null;
}

// One line for the top of a decision: what these all are.
export function sharedLine(ids) {
  const ps = ids.map(id => PRODUCTS[id]);
  const lo = Math.min(...ps.map(p => p.price)), hi = Math.max(...ps.map(p => p.price));
  const sub = ps[0].sub.toLowerCase();
  const band = lo === hi ? rupees(lo) : `${rupees(lo)}–${rupees(hi)}`;
  return `All ${ids.length} are ${sub}, ${band}`;
}

// The trade-off, in a sentence, from the two attributes that separate the set
// most. Deterministic - no model needed for something this shaped.
export function tradeoff(ids) {
  const { differs } = diff(ids);
  if (!differs.length) return "These are the same on everything we can compare.";
  const top = differs.slice(0, 2).map(d => d.attr.label.toLowerCase());
  const cheapest = ids.reduce((a, b) => PRODUCTS[a].price <= PRODUCTS[b].price ? a : b);
  const fastest = bestOn(ids, ATTRS.find(a => a.key === "delivery"));
  let s = `They differ on ${top.length === 2 ? `${top[0]} and ${top[1]}` : top[0]}`;
  if (fastest && fastest !== cheapest) {
    s += `. The cheapest is not the fastest — ${PRODUCTS[cheapest].brand} costs least, `
      + `${PRODUCTS[fastest].brand} arrives soonest.`;
  } else s += ".";
  return s;
}

// A tournament: five binary choices instead of one impossible six-way. Choice
// overload is broken by reducing the size of each choice, not by adding
// information to a big one.
export function nextPair(remaining, champion) {
  if (champion === null) return remaining.length >= 2 ? [remaining[0], remaining[1]] : null;
  return remaining.length ? [champion, remaining[0]] : null;
}

// Decision debt: saved items sitting inside an unresolved decision. This is the
// number the wishlist should be showing and does not.
export function decisionDebt(ids, resolvedSubs = new Set()) {
  const clusters = findClusters(ids).filter(c => !resolvedSubs.has(c.sub));
  return {
    decisions: clusters.length,
    items: clusters.reduce((n, c) => n + c.items.length, 0),
    clusters,
  };
}
