// Fit Check - screens, rendering and interaction.
//
// All fit reasoning lives in engine.js. This file only decides what to show.

import { GARMENTS, PERSONAS, photo, title, rupees } from "./data.js";
import * as fe from "./engine.js";

const state = {
  page: "home", stack: [], persona: "ananya",
  extra: {}, added: {},              // measurements taken, garments added
  wishAdd: {}, wishRemove: {}, bag: {},
  filter: "all", measure: 30.5,
  product: null, productSize: null,
  query: "", cat: null,
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const listOf = (map) => map[state.persona] || (map[state.persona] = []);

function persona() {
  const p = PERSONAS[state.persona];
  const removed = new Set(state.wishRemove[state.persona] || []);
  return {
    ...p,
    wardrobe: [...p.wardrobe, ...(state.added[state.persona] || [])],
    wishlist: [...p.wishlist.filter(w => !removed.has(w.garment)),
               ...(state.wishAdd[state.persona] || [])],
  };
}

const TONE = { good: "good", warn: "warn", info: "info", bad: "bad" };
const TONE_BG = { good: "var(--green)", warn: "var(--amber)", info: "var(--slate)", bad: "var(--red)" };

// What to call a category in a sentence. "Your Roadster outerwear" is not a
// thing anyone says.
const NOUN = {
  kurta: "kurta", dress: "dress", top: "shirt", outerwear: "jacket",
  occasion: "outfit", jeans: "jeans", trousers: "trousers", palazzo: "palazzo",
};

// --------------------------------------------------------------------------
// Pieces
// --------------------------------------------------------------------------

function priceHTML(gid) {
  const g = GARMENTS[gid];
  return `<div class="price">${rupees(g.price)} <s>${rupees(g.mrp)}</s> <em>(${g.off}% OFF)</em></div>`;
}

function productCard(row, ctx) {
  const g = GARMENTS[row.gid];
  const b = fe.badge(row.result);
  return `<div class="pc" data-open="${row.gid}" data-size="${row.size}">
    <div class="shot">
      <img src="${photo(row.gid, 360, 480)}" alt="${esc(g.alt)}" loading="lazy">
      <button class="heart" data-unsave="${row.gid}" aria-label="Remove from wishlist">
        <span class="ms fill">favorite</span></button>
      <div class="badge b-${TONE[b.tone]}">${b.text}</div>
    </div>
    <div class="brand">${esc(g.brand)}</div>
    <div class="pname">${esc(g.name)}</div>
    ${priceHTML(row.gid)}
    <div class="fitline t-${TONE[b.tone]}">${esc(fe.shortLine(row, ctx))}</div>
  </div>`;
}

function browseCard(gid, cls = "") {
  const g = GARMENTS[gid];
  const saved = persona().wishlist.some(w => w.garment === gid);
  return `<div class="${cls}" data-open="${gid}">
    <div class="shot"><img src="${photo(gid, 320, 427)}" alt="${esc(g.alt)}" loading="lazy">
      <button class="heart" data-save="${gid}" aria-label="Save to wishlist">
        <span class="ms${saved ? " fill" : ""}" style="color:${saved ? "var(--pink)" : "var(--sec)"}">favorite</span></button>
    </div>
    <div class="brand" style="margin-top:7px">${esc(g.brand)}</div>
    <div class="pname">${esc(g.name)}</div>
    ${priceHTML(gid)}
  </div>`;
}

function measureStrip(rv) {
  if (!rv.unlocks.length) return "";
  const u = rv.unlocks[0], src = u.source;
  return `<div id="measure">
    <img src="${photo(src.garment, 120, 160)}" alt="">
    <div style="flex:1;min-width:0">
      <div class="t">Measure your ${esc(GARMENTS[src.garment].brand)} ${esc(GARMENTS[src.garment].name)}</div>
      <div class="d">Unlocks ${u.count} ${u.count === 1 ? "item" : "items"}</div>
    </div>
    <button class="btn" data-act="measure">Measure</button>
  </div>`;
}

// --------------------------------------------------------------------------
// Fit rendering, shared by the sheet and the product page
// --------------------------------------------------------------------------

const TONE_COLOUR = {
  [fe.OK]: "var(--green)", [fe.CLEARS]: "var(--green)", [fe.INTENDED]: "var(--slate)",
  [fe.SNUG]: "var(--amber)", [fe.ROOMY]: "var(--amber)",
  [fe.FAIL_SMALL]: "var(--red)", [fe.FAIL_LARGE]: "var(--red)",
};
const ICON = {
  [fe.OK]: ["check_circle", "var(--green)"], [fe.CLEARS]: ["check_circle", "var(--green)"],
  [fe.INTENDED]: ["check_circle", "var(--slate)"],
  [fe.SNUG]: ["error", "var(--amber)"], [fe.ROOMY]: ["error", "var(--amber)"],
  [fe.FAIL_SMALL]: ["cancel", "var(--red)"], [fe.FAIL_LARGE]: ["cancel", "var(--red)"],
  [fe.UNKNOWN]: ["help", "var(--muted)"], [fe.UNPUBLISHED]: ["remove", "var(--muted)"],
};

function barHTML(f) {
  if (f.code === fe.UNKNOWN || f.code === fe.UNPUBLISHED || f.value === null) {
    return `<div class="track void"></div>`;
  }
  const pts = [f.value, ...(f.band || []).filter(x => x !== null)];
  let lo = Math.min(...pts), hi = Math.max(...pts);
  const pad = Math.max(1.2, (hi - lo) * 0.45);
  lo -= pad; hi += pad;
  const span = (hi - lo) || 1;
  const at = x => Math.max(0, Math.min(100, (x - lo) / span * 100));
  const band = (f.band && f.band[0] !== null)
    ? `<div class="band" style="left:${at(f.band[0]).toFixed(1)}%;width:${(at(f.band[1]) - at(f.band[0])).toFixed(1)}%"></div>` : "";
  return `<div class="track">${band}<div class="knob" style="left:${at(f.value).toFixed(1)}%;background:${TONE_COLOUR[f.code] || "var(--muted)"}"></div></div>`;
}

function fitRows(result) {
  return result.findings.map(f => {
    const [icon, colour] = ICON[f.code];
    const val = f.code === fe.UNPUBLISHED ? "—" : `${f.value.toFixed(1)}"`;
    return `<div class="mrow"><span class="n">${f.label}</span><span class="v">${val}</span>
      ${barHTML(f)}<span class="ms" style="color:${colour}">${icon}</span></div>`;
  }).join("");
}

function measureAsk(u) {
  const src = u.source;
  const why = (src.unresolved && src.unresolved.why) || "";
  const also = u.count > 1 ? ` Settles ${u.count} of your saved items.` : "";
  return `<div class="ask">
    <div class="t">Measure your ${esc(GARMENTS[src.garment].brand)} ${esc(GARMENTS[src.garment].name)}</div>
    <div class="w">${esc(why)} Lay it flat and measure the ${esc(u.label.toLowerCase())}.${also}</div>
    <div class="stepper">
      <div class="box">
        <span class="ms" data-act="dec">remove</span>
        <div style="text-align:center"><b>${state.measure.toFixed(1)}</b><small>inches</small></div>
        <span class="ms" data-act="inc">add</span>
      </div>
      <button class="btn" data-act="confirm" data-g="${src.garment}" data-d="${u.dim}">Confirm</button>
    </div></div>`;
}

// The ask only appears where a measurement the shopper can actually take is
// what blocks the item. A dimension the brand never published is not their job
// to fix, and pretending otherwise is the bluff this engine exists to avoid.
function fitExtras(row, rv, p) {
  const g = GARMENTS[row.gid];
  const alt = row.alt ? `<div class="ask" style="border-color:#c9e8de;background:#f2faf7">
      <div class="t" style="color:var(--green)">Size ${row.alt.size} clears it</div>
      <div class="w">Every measurement we can check works in ${row.alt.size}.</div></div>` : "";
  const ask = fe.askForItem(p, row.gid, row.size, rv.ctx, state.extra);
  const unpub = row.result.blocked.filter(f => f.code === fe.UNPUBLISHED);
  const gap = unpub.length ? `<div class="ask" style="border-color:var(--line);background:var(--fill)">
      <div class="t">${esc(g.brand)} doesn't publish ${esc(unpub[0].label.toLowerCase())}</div>
      <div class="w">That measurement decides this one on your body. We won't guess at it.</div></div>` : "";
  const proven = [...new Set(row.result.findings
    .map(f => fe.decidingEvidence(row.gid, f, rv.ctx)).filter(Boolean).map(e => title(e.garment)))];
  const foot = proven.length ? `<div class="foot">Compared with ${esc(proven.slice(0, 2).join(" and "))}.</div>` : "";
  return alt + (ask ? measureAsk(ask) : "") + gap + foot;
}

function evaluate(gid, size, ctx) {
  const r = fe.recommend(gid, size, ctx);
  return { gid, size, days: 0, result: r.current, alt: r.alt };
}

// --------------------------------------------------------------------------
// Screens
// --------------------------------------------------------------------------

const CAT_TILES = [
  ["kurta", "g_biba_kurta", "Kurtas"], ["dress", "w_zara_midi", "Dresses"],
  ["jeans", "w_levis_314", "Jeans"], ["top", "w_hm_oversized", "Tops"],
  ["occasion", "w_anouk_lehenga", "Ethnic"], ["outerwear", "g_zara_blazer", "Jackets"],
];

function homeScreen(rv) {
  const p = persona();
  const anchor = fe.anchorGarment(p);
  const good = rv.counts[fe.FITS] + rv.counts[fe.LIKELY];
  const seen = new Set([...p.wishlist.map(w => w.garment), ...p.wardrobe.map(w => w.garment)]);
  const others = Object.keys(GARMENTS).filter(g => !seen.has(g));
  const thumbs = rv.rows.filter(r => r.result.status === fe.FITS || r.result.status === fe.LIKELY)
    .slice(0, 4).map(r => `<img src="${photo(r.gid, 120, 160)}" alt="">`).join("");

  const fitcard = rv.rows.length ? `
    <div id="fitcard" data-act="go-wishlist">
      <div class="tag">FIT CHECK</div>
      <h3>Your ${esc(GARMENTS[anchor.garment].brand)} ${NOUN[GARMENTS[anchor.garment].category]} fits you.</h3>
      <p>So will ${good} of your ${rv.rows.length} saved items.</p>
      <div class="strip">${thumbs}<div class="go"><span class="ms">chevron_right</span></div></div>
    </div>` : "";

  return `
  <div class="cats hs">${CAT_TILES.map(([cat, gid, lab]) => `
    <div class="cat" data-cat="${cat}"><img src="${photo(gid, 130, 130)}" alt=""><span>${lab}</span></div>`).join("")}</div>

  <div class="banner" data-act="soon">
    <h2>END OF<br>SEASON SALE</h2><p>50–80% OFF · 900+ brands</p>
    <div class="dots"><i class="on"></i><i></i><i></i></div>
  </div>

  ${fitcard}

  <div class="rowhead"><span class="sec">Deals of the day</span>
    <button class="more" data-tab="categories">VIEW ALL</button></div>
  <div class="rail hs">${others.slice(0, 5).map(g => browseCard(g, "railcard")).join("")}</div>

  <div style="height:18px"></div>
  <div class="banner2" data-act="soon"><h3>MYNTRA INSIDER</h3><p>Earn points on every order</p></div>

  <div class="rowhead"><span class="sec">Trending near you</span></div>
  <div class="grid">${others.slice(5, 9).map(g => browseCard(g, "pc")).join("")}</div>
  ${disclaimer()}`;
}

function categoriesScreen() {
  const p = persona();
  const owned = new Set([...p.wishlist.map(w => w.garment), ...p.wardrobe.map(w => w.garment)]);
  let items = Object.keys(GARMENTS).filter(g => !owned.has(g));
  if (state.cat) items = items.filter(g => GARMENTS[g].category === state.cat);

  const tabs = `<div class="chips hs">
    <button class="chip${state.cat ? "" : " on"}" data-cat="">All</button>
    ${CAT_TILES.map(([cat, , lab]) =>
      `<button class="chip${state.cat === cat ? " on" : ""}" data-cat="${cat}">${lab}</button>`).join("")}</div>`;

  return `<div class="wtitle"><h1>Shop</h1><span>${items.length} items</span></div>
    ${tabs}
    ${items.length ? `<div class="grid">${items.map(g => browseCard(g, "pc")).join("")}</div>`
      : `<div class="empty">Nothing left in this category — it is all in your wishlist or your wardrobe already.</div>`}
    ${disclaimer()}`;
}

const FILTERS = [
  ["all", "All"], [fe.FITS, "Fits you"], [fe.LIKELY, "Likely"],
  [fe.CANT_SAY, "Need a measure"], [fe.WRONG_SIZE, "Wrong size"],
];

function wishlistScreen(rv) {
  if (!rv.rows.length) {
    return `<div class="wtitle"><h1>Wishlist</h1></div>
      <div class="empty">Nothing saved yet.<br>Tap the heart on anything in Shop and Fit Check
      will tell you whether it will fit you.</div>${disclaimer()}`;
  }
  const shown = state.filter === "all" ? rv.rows : rv.rows.filter(r => r.result.status === state.filter);
  const chips = FILTERS.map(([k, lab]) => {
    const n = k === "all" ? rv.rows.length : rv.counts[k];
    return `<button class="chip${state.filter === k ? " on" : ""}" data-filter="${k}">${lab} ${n}</button>`;
  }).join("");
  const gaps = rv.gaps.length ? `<div class="note">You own no ${esc(rv.gaps[0].catLabel.toLowerCase())}
    we can judge ${esc(rv.gaps[0].label.toLowerCase())} by. Add one in My Fit Profile.</div>` : "";

  return `<div class="wtitle"><h1>Wishlist</h1><span>${rv.rows.length} items</span></div>
    ${measureStrip(rv)}
    <div class="chips hs">${chips}</div>
    ${shown.length ? `<div class="grid">${shown.map(r => productCard(r, rv.ctx)).join("")}</div>`
      : `<div class="empty">Nothing in this group.</div>`}
    ${gaps}${disclaimer()}`;
}

function productScreen(rv) {
  const p = persona();
  const gid = state.product, g = GARMENTS[gid];
  const sizes = Object.keys(g.sizes);
  const size = state.productSize && g.sizes[state.productSize] ? state.productSize : sizes[0];
  const all = fe.recommend(gid, size, rv.ctx).all;
  const row = evaluate(gid, size, rv.ctx);
  const b = fe.badge(row.result);
  const saved = p.wishlist.some(w => w.garment === gid);
  const inBag = (state.bag[state.persona] || []).some(x => x.garment === gid && x.size === size);

  const chips = sizes.map(s => {
    const t = fe.badge(all[s]).tone;
    return `<button class="szchip${s === size ? " on" : ""}" data-size="${s}">${s}
      <i style="background:${TONE_BG[t]}"></i></button>`;
  }).join("");

  const specs = Object.entries(g.sizes[size]).filter(([d]) => fe.DIMENSIONS[d])
    .map(([d, v]) => `<div class="spec"><span>${fe.label(d, g.category)}</span><b>${v.toFixed(1)}"</b></div>`).join("");

  return `<div class="pdphero"><img src="${photo(gid, 600, 800)}" alt="${esc(g.alt)}"></div>
    <div class="pdpinfo">
      <h1>${esc(g.brand)}</h1><h2>${esc(g.name)}</h2>
      <div class="pdpprice">${rupees(g.price)} <s>${rupees(g.mrp)}</s> <em>(${g.off}% OFF)</em></div>
      <div style="font-size:11.5px;color:var(--green);font-weight:700;margin-top:6px">inclusive of all taxes</div>
    </div>

    <div class="sect"><span class="sec">Select size</span>
      <div class="sizes">${chips}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:10px">The dot on each size is what
        Fit Check makes of it, from clothes you already own.</div>
    </div>

    <div class="sect"><span class="sec">Fit check · size ${size}</span>
      <div class="fitbox">
        <div class="top"><span class="pill" style="background:${TONE_BG[b.tone]}">${b.text}</span>
          <span class="l t-${TONE[b.tone]}">${esc(fe.shortLine(row, rv.ctx))}</span></div>
        ${fitRows(row.result)}
      </div>
      ${fitExtras(row, rv, p)}
    </div>

    <div class="sect"><span class="sec">Product details</span>
      <div class="spec"><span>Composition</span><b>${esc(g.fabric)}</b></div>
      <div class="spec"><span>Category</span><b>${fe.CATEGORIES[g.category].label}</b></div>
      <div class="spec"><span>Sold as</span><b>Size ${size}</b></div>
    </div>

    <div class="sect"><span class="sec">Garment measurements · size ${size}</span>
      ${specs}
      <div style="font-size:11px;color:var(--muted);padding:10px 0 0">Measured flat and doubled for
        circumferences. A dimension the brand does not publish is left out rather than estimated.</div>
    </div>
    ${disclaimer()}
    <div class="ctabar">
      <button class="cta-w" data-act="${saved ? "unsave-pdp" : "save-pdp"}" data-g="${gid}">
        ${saved ? "♥ WISHLISTED" : "♡ WISHLIST"}</button>
      <button class="cta-b" data-act="bag" data-g="${gid}" data-s="${size}">
        ${inBag ? "IN BAG" : "ADD TO BAG"}</button>
    </div>`;
}

function searchScreen() {
  const q = state.query.trim().toLowerCase();
  const hits = q ? Object.keys(GARMENTS).filter(g =>
    (title(g) + " " + GARMENTS[g].category).toLowerCase().includes(q)) : [];
  if (!q) return `<div class="empty">Search for a brand, a product or a category.<br>
    Try “levi”, “kurta” or “jeans”.</div>`;
  return `<div class="wtitle"><h1>“${esc(state.query.trim())}”</h1><span>${hits.length} found</span></div>
    ${hits.length ? `<div class="grid">${hits.map(g => browseCard(g, "pc")).join("")}</div>`
      : `<div class="empty">Nothing matches that.</div>`}${disclaimer()}`;
}

function bagScreen() {
  const bag = state.bag[state.persona] || [];
  if (!bag.length) return `<div class="wtitle"><h1>Bag</h1></div>
    <div class="empty">Your bag is empty.</div>${disclaimer()}`;
  const total = bag.reduce((a, x) => a + GARMENTS[x.garment].price, 0);
  return `<div class="wtitle"><h1>Bag</h1><span>${bag.length} items</span></div>
    ${bag.map((x, i) => `<div class="orow">
      <img src="${photo(x.garment, 120, 160)}" alt="">
      <div style="flex:1;min-width:0"><div class="brand">${esc(GARMENTS[x.garment].brand)}</div>
        <div class="pname">${esc(GARMENTS[x.garment].name)} · Size ${esc(x.size)}</div>
        ${priceHTML(x.garment)}</div>
      <button class="ms" style="color:var(--muted)" data-debag="${i}">close</button></div>`).join("")}
    <div class="sect"><span class="sec">Total</span>
      <div class="spec"><span>${bag.length} items</span><b>${rupees(total)}</b></div></div>
    <div class="empty" style="padding:24px 24px 0">Checkout is not part of this prototype.</div>
    ${disclaimer()}`;
}

function ordersScreen() {
  const p = persona();
  return `<div class="wtitle"><h1>Orders</h1><span>${p.wardrobe.length} delivered</span></div>
    <div class="sub" style="padding:0 12px 8px">This is where your fit profile comes from. What you
      kept fits you; what you sent back for a size reason is a limit we won't cross again.</div>
    ${p.wardrobe.map(e => {
      const g = GARMENTS[e.garment];
      const returned = e.verdict !== "perfect";
      return `<div class="orow" data-open="${e.garment}">
        <img src="${photo(e.garment, 120, 160)}" alt="">
        <div style="flex:1;min-width:0"><div class="brand">${esc(g.brand)}</div>
          <div class="pname">${esc(g.name)} · Size ${esc(e.size)}</div>
          <div style="font-size:11.5px;font-weight:700;margin-top:4px;color:${returned ? "var(--amber)" : "var(--green)"}">
            ${returned ? "Returned · size issue" : "Delivered · kept"}</div></div>
        <span class="ms" style="color:var(--muted)">chevron_right</span></div>`;
    }).join("")}${disclaimer()}`;
}

function profileScreen(rv) {
  const p = persona();
  const avs = p.wardrobe.slice(0, 5).map(e => `<img src="${photo(e.garment, 80, 80)}" alt="">`).join("");
  const rows = [["Orders", "inventory_2", "orders"], ["Addresses", "location_on", ""],
    ["Payments", "credit_card", ""], ["Coupons", "local_offer", ""],
    ["Notifications", "notifications", ""], ["Help Centre", "support_agent", ""],
    ["Settings", "settings", ""]];

  return `<div class="phead">
      <div class="avatar">${esc(p.name[0])}</div>
      <div style="flex:1"><h1>${esc(p.name)}</h1><p>${esc(p.segment)} · ${esc(p.blurb.split(".")[0])}</p></div>
    </div>
    <div class="tiles">
      <div><b>${p.wardrobe.length}</b><span>Orders</span></div>
      <div><b>${p.wishlist.length}</b><span>Wishlist</span></div>
      <div><b>${(state.bag[state.persona] || []).length}</b><span>Bag</span></div>
    </div>
    <div id="fpcard" data-act="go-fitprofile">
      <div style="flex:1">
        <div class="tag">MY FIT PROFILE</div>
        <h3>Built from ${p.wardrobe.length} things you own</h3>
        <p>Used to check every saved item</p>
        <div class="avs">${avs}</div>
      </div>
      <div style="width:28px;height:28px;border-radius:50%;background:#fff;display:grid;place-items:center">
        <span class="ms" style="font-size:19px;color:var(--pink)">chevron_right</span></div>
    </div>
    ${rows.map(([lab, icon, act]) => `<div class="arow" ${act ? `data-act="${act}"` : `data-act="soon"`}>
      <span class="ms">${icon}</span><span>${lab}</span><span class="ms go">chevron_right</span></div>`).join("")}
    ${disclaimer()}`;
}

const VERDICT_TAG = {
  perfect: ["Fits", "var(--green)"], tight: ["Tight", "var(--red)"],
  loose: ["Loose", "var(--amber)"], short: ["Short", "var(--amber)"], long: ["Long", "var(--amber)"],
};

function fitProfileScreen(rv) {
  const p = persona();
  const wardrobe = p.wardrobe.map(e => {
    const g = GARMENTS[e.garment];
    const [word, colour] = VERDICT_TAG[e.verdict];
    const known = { ...g.sizes[e.size] };
    for (const [k, v] of Object.entries(state.extra)) {
      const [gid, dim] = k.split("|");
      if (gid === e.garment) known[dim] = v;
    }
    const meas = Object.entries(known).filter(([d]) => fe.DIMENSIONS[d])
      .map(([d, v]) => `${fe.DIMENSIONS[d].label} ${v.toFixed(1)}"`).join(" · ");
    return `<div class="wrow" data-open="${e.garment}">
      <img src="${photo(e.garment, 120, 160)}" alt="">
      <div class="m"><div class="brand">${esc(g.brand)}</div>
        <div class="pname">${esc(g.name)} · Size ${esc(e.size)}</div>
        <div class="meas">${esc(meas)}</div></div>
      <span class="tag2" style="background:${colour}">${word}</span></div>`;
  }).join("");

  const rows = [...rv.env.entries()].filter(([, e]) => e.hasAny)
    .sort((a, b) => a[1].owner.localeCompare(b[1].owner) || a[1].dim.localeCompare(b[1].dim))
    .map(([, e]) => {
      const bits = [];
      if (e.bandLo !== null) bits.push(`${e.bandLo.toFixed(1)}–${e.bandHi.toFixed(1)}"`);
      if (e.hardLo !== null) bits.push(`never under ${e.hardLo.toFixed(1)}"`);
      if (e.hardHi !== null) bits.push(`never over ${e.hardHi.toFixed(1)}"`);
      const owner = fe.CATEGORIES[e.owner] ? fe.CATEGORIES[e.owner].label.toLowerCase() : e.owner;
      return `<div class="kv"><span>${fe.DIMENSIONS[e.dim].label} <span style="color:var(--muted)">· ${owner}</span></span>
        <b>${bits.join(" · ")}</b></div>`;
    }).join("");

  const missing = rv.unlocks.length
    ? `<div class="kv"><span>${esc(rv.unlocks[0].label)} <span style="color:var(--muted)">· not measured</span></span>
       <b style="color:var(--pink)">not known yet</b></div>` : "";

  return `<div class="wtitle"><h1>My Fit Profile</h1></div>
    <div class="sub">Built from clothes you kept and returned. You typed none of it in.</div>
    <div class="rowhead"><span class="sec">Your wardrobe</span></div>
    ${wardrobe}
    <div style="padding:14px 12px 4px"><button class="btn ghost wide" data-act="add">+ Add something you own</button></div>
    <div class="rowhead"><span class="sec">What we know</span></div>
    ${rows}${missing}
    <div class="note">These are <b>garment</b> measurements proven to work on you, not your body
      measurements. A limit is one you found out the hard way.</div>
    ${disclaimer()}`;
}

function disclaimer() {
  return `<div class="disc"><b>Prototype for a product case study.</b> Not affiliated with Myntra
    and not endorsed by any brand named here. Products, prices and order history are invented for
    the demo, and photography from Unsplash illustrates the category rather than the exact garment.
    Nothing here can be bought. The fit engine is real — change your profile and every verdict
    recomputes.</div>`;
}

// --------------------------------------------------------------------------
// Sheets
// --------------------------------------------------------------------------

function fitSheet(row, rv) {
  const g = GARMENTS[row.gid], b = fe.badge(row.result);
  return `<div class="handle"></div>
    <div class="shead">
      <img src="${photo(row.gid, 160, 213)}" alt="">
      <div style="flex:1">
        <div class="brand" style="font-size:14px">${esc(g.brand)}</div>
        <div class="pname">${esc(g.name)} · Size ${esc(row.size)}</div>
        <div style="margin-top:8px"><span class="pill" style="background:${TONE_BG[b.tone]}">${b.text}</span></div>
      </div>
    </div>
    ${fitRows(row.result)}
    ${fitExtras(row, rv, persona())}`;
}

function personaSheet() {
  return `<div class="handle"></div>
    <div style="padding:6px 16px 4px"><div class="sec">View the prototype as</div></div>
    ${Object.entries(PERSONAS).map(([k, p]) => `
      <div class="wrow" data-persona="${k}" style="cursor:pointer">
        <div class="avatar" style="width:40px;height:40px;font-size:15px">${esc(p.name[0])}</div>
        <div class="m"><div class="brand">${esc(p.name)} · ${esc(p.segment)}</div>
          <div class="pname" style="white-space:normal">${esc(p.blurb)}</div></div>
        ${state.persona === k ? '<span class="ms" style="color:var(--pink)">check_circle</span>' : ""}
      </div>`).join("")}
    <div style="padding:14px 16px 0">
      <button class="btn ghost wide" data-act="reset">Reset everything I've changed</button></div>
    <div class="foot">Both shoppers come from the user interviews behind this project.</div>`;
}

function addSheet() {
  const p = persona();
  const owned = new Set(p.wardrobe.map(e => e.garment));
  const opts = Object.keys(GARMENTS).filter(g => !owned.has(g)).sort((a, b) => title(a).localeCompare(title(b)));
  const gid = opts[0];
  if (!gid) return `<div class="handle"></div><div class="empty">You already own everything in the catalog.</div>`;
  return `<div class="handle"></div>
    <div style="padding:6px 16px 16px">
      <div class="sec" style="margin-bottom:4px">Add something you own</div>
      <label class="fl">Garment</label>
      <select id="ag">${opts.map(g => `<option value="${g}">${esc(title(g))}</option>`).join("")}</select>
      <div style="display:flex;gap:9px">
        <div style="flex:1"><label class="fl">Size</label><select id="asz">${
          Object.keys(GARMENTS[gid].sizes).map(s => `<option>${s}</option>`).join("")}</select></div>
        <div style="flex:2"><label class="fl">How does it fit?</label><select id="av">${
          Object.entries(VERDICT_TAG).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></div>
      </div>
      <label class="fl">Where, if it isn't perfect</label>
      <select id="ad"><option value="">—</option>${
        fe.CATEGORIES[GARMENTS[gid].category].critical
          .map(d => `<option value="${d}">${fe.label(d, GARMENTS[gid].category)}</option>`).join("")}</select>
      <div id="aerr" style="color:var(--red);font-size:12px;margin-top:8px"></div>
      <div style="margin-top:14px"><button class="btn wide" data-act="addsave">Add to my profile</button></div>
    </div>`;
}

// --------------------------------------------------------------------------
// Shell
// --------------------------------------------------------------------------

const TABS = [["home", "home", "Home"], ["categories", "category", "Shop"],
  ["wishlist", "favorite", "Wishlist"], ["profile", "person", "Profile"]];
const ROOTS = new Set(["home", "categories", "wishlist", "profile"]);

function openSheet(html) {
  $("sheet").innerHTML = html;
  $("sheet").classList.add("open");
  $("sheet").removeAttribute("aria-hidden");
  $("scrim").classList.add("open");
}
function closeSheet() {
  $("sheet").classList.remove("open");
  // The sheet keeps its markup so it can slide out, so it has to be marked
  // hidden - otherwise a screen reader still reaches a sheet that is gone.
  $("sheet").setAttribute("aria-hidden", "true");
  $("scrim").classList.remove("open");
}

function toast(msg) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:88px;left:50%;transform:translateX(-50%);
    background:#282c3f;color:#fff;padding:11px 18px;border-radius:6px;font-size:13px;font-weight:700;
    z-index:60;box-shadow:0 4px 18px rgba(22,27,45,.3);max-width:88vw;text-align:center`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

function go(page, push = true) {
  if (push && page !== state.page) state.stack.push(state.page);
  if (ROOTS.has(page)) state.stack = [];
  state.page = page;
  render();
}
function back() {
  state.page = state.stack.pop() || "home";
  render();
}

function topbar() {
  const bag = (state.bag[state.persona] || []).length;
  const left = ROOTS.has(state.page)
    ? `<span class="logo">MYNTRA<i>.</i></span><span class="proto">PROTOTYPE</span>`
    : `<button class="ms topicon" data-act="back">arrow_back</button>
       <span class="logo" style="font-size:17px">MYNTRA<i>.</i></span>`;
  const search = state.page === "search"
    ? `<input id="searchfield" placeholder="Search for products, brands" value="${esc(state.query)}" autofocus>`
    : `<span class="spacer"></span>
       <button id="whobtn"><span id="whoname">${esc(persona().name)}</span><span class="ms">expand_more</span></button>
       <button class="ms topicon" data-act="search">search</button>`;
  return `${left}${search}
    <button class="ms topicon" data-act="bagpage">shopping_bag${
      bag ? `<span class="bagdot">${bag}</span>` : ""}</button>`;
}

function render() {
  const p = persona();
  const rv = fe.reviewWishlist(p, state.extra);
  window.__rv = rv;

  $("topbar").innerHTML = topbar();
  const screens = {
    home: () => homeScreen(rv), categories: categoriesScreen,
    wishlist: () => wishlistScreen(rv), profile: () => profileScreen(rv),
    fitprofile: () => fitProfileScreen(rv), product: () => productScreen(rv),
    search: searchScreen, bag: bagScreen, orders: ordersScreen,
  };
  $("screen").innerHTML = (screens[state.page] || screens.home)();
  $("screen").style.paddingBottom = state.page === "product" ? "88px" : "76px";

  const showNav = state.page !== "product";
  $("nav").style.display = showNav ? "flex" : "none";
  $("nav").innerHTML = TABS.map(([k, icon, lab]) => {
    const on = k === state.page ||
      (k === "profile" && (state.page === "fitprofile" || state.page === "orders"));
    return `<button class="${on ? "on" : ""}" data-tab="${k}">
      <span class="ms${on ? " fill" : ""}">${icon}</span>${lab}</button>`;
  }).join("");
  window.scrollTo(0, 0);
}

// --------------------------------------------------------------------------
// Events
// --------------------------------------------------------------------------

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-tab],[data-act],[data-filter],[data-open],[data-persona],[data-cat],[data-size],[data-save],[data-unsave],[data-debag]");
  if (!t) return;
  const rv = window.__rv;
  const p = persona();

  // Saving must not also open the product it sits on.
  if (t.dataset.save !== undefined && t.dataset.save) {
    ev.stopPropagation();
    const gid = t.dataset.save;
    const removed = listOf(state.wishRemove);
    const i = removed.indexOf(gid);
    if (i >= 0) removed.splice(i, 1);
    else if (!p.wishlist.some(w => w.garment === gid)) {
      listOf(state.wishAdd).push({ garment: gid, size: Object.keys(GARMENTS[gid].sizes)[0], days: 0 });
    }
    render(); toast("Saved to wishlist");
    return;
  }
  if (t.dataset.unsave) {
    ev.stopPropagation();
    unsave(t.dataset.unsave); render(); toast("Removed from wishlist");
    return;
  }
  if (t.dataset.debag !== undefined && t.dataset.debag !== "") {
    listOf(state.bag).splice(+t.dataset.debag, 1); render(); return;
  }
  if (t.dataset.tab) { closeSheet(); state.filter = "all"; state.cat = null; go(t.dataset.tab); return; }
  if (t.dataset.filter) { state.filter = t.dataset.filter; render(); return; }
  if (t.dataset.cat !== undefined && !t.dataset.open) {
    state.cat = t.dataset.cat || null; go("categories"); return;
  }
  if (t.dataset.persona) {
    state.persona = t.dataset.persona; state.filter = "all"; state.cat = null;
    closeSheet(); go("home"); return;
  }
  if (t.dataset.open) {
    state.product = t.dataset.open;
    state.productSize = t.dataset.size || null;
    closeSheet(); go("product"); return;
  }
  if (t.dataset.size && state.page === "product") { state.productSize = t.dataset.size; render(); return; }

  switch (t.dataset.act) {
    case "back": back(); break;
    case "go-wishlist": go("wishlist"); break;
    case "go-fitprofile": go("fitprofile"); break;
    case "orders": go("orders"); break;
    case "search": state.query = ""; go("search"); break;
    case "bagpage": go("bag"); break;
    case "soon": toast("Not part of this prototype"); break;
    case "measure": openSheet(`<div class="handle"></div>
        <div style="padding:6px 16px 0"><div class="sec">One measurement</div></div>
        ${measureAsk(rv.unlocks[0])}
        <div class="foot">Measuring a garment lying flat is easier, and far more accurate,
          than measuring yourself.</div>`); break;
    case "inc": state.measure = Math.min(60, state.measure + 0.5); syncStepper(); break;
    case "dec": state.measure = Math.max(4, state.measure - 0.5); syncStepper(); break;
    case "confirm": {
      const before = rv.counts[fe.FITS];
      state.extra[`${t.dataset.g}|${t.dataset.d}`] = state.measure;
      closeSheet();
      const after = fe.reviewWishlist(persona(), state.extra);
      const gained = after.counts[fe.FITS] - before;
      render();
      toast(gained > 0 ? `${gained} ${gained === 1 ? "item" : "items"} now fit you` : "Fit profile updated");
      break;
    }
    case "save-pdp": {
      listOf(state.wishAdd).push({ garment: t.dataset.g, size: state.productSize ||
        Object.keys(GARMENTS[t.dataset.g].sizes)[0], days: 0 });
      const rem = listOf(state.wishRemove);
      const i = rem.indexOf(t.dataset.g); if (i >= 0) rem.splice(i, 1);
      render(); toast("Saved to wishlist"); break;
    }
    case "unsave-pdp": unsave(t.dataset.g); render(); toast("Removed from wishlist"); break;
    case "bag": {
      const bag = listOf(state.bag);
      if (!bag.some(x => x.garment === t.dataset.g && x.size === t.dataset.s)) {
        bag.push({ garment: t.dataset.g, size: t.dataset.s });
        render(); toast("Added to bag");
      } else toast("Already in your bag");
      break;
    }
    case "reset":
      state.extra = {}; state.added = {}; state.wishAdd = {}; state.wishRemove = {}; state.bag = {};
      closeSheet(); go("home"); toast("Back to the start"); break;
    case "add": openSheet(addSheet()); break;
    case "addsave": {
      const gid = $("ag").value, size = $("asz").value, verdict = $("av").value, dim = $("ad").value;
      if (verdict !== "perfect" && !dim) {
        $("aerr").textContent = "Tell us which measurement is wrong, or there's nothing to learn from.";
        return;
      }
      listOf(state.added).push({ garment: gid, size, verdict, dims: dim ? [dim] : [], note: "Added by you." });
      closeSheet(); render(); toast("Added to your fit profile");
      break;
    }
  }
});

function unsave(gid) {
  const added = listOf(state.wishAdd);
  const i = added.findIndex(w => w.garment === gid);
  if (i >= 0) added.splice(i, 1);
  else listOf(state.wishRemove).push(gid);
}

// Keep the stepper's own display in sync without rebuilding the screen behind it.
function syncStepper() {
  const b = document.querySelector("#sheet .box b") || document.querySelector(".box b");
  if (b) b.textContent = state.measure.toFixed(1);
}

document.addEventListener("input", ev => {
  if (ev.target.id === "searchfield") {
    state.query = ev.target.value;
    $("screen").innerHTML = searchScreen();
  }
});

document.addEventListener("click", ev => {
  if (ev.target.id === "whobtn" || ev.target.closest("#whobtn")) openSheet(personaSheet());
});
$("scrim").addEventListener("click", closeSheet);

// The size and dimension menus have to follow the chosen garment, or you can
// pick a size it does not come in.
document.addEventListener("change", ev => {
  if (ev.target.id !== "ag") return;
  const g = GARMENTS[ev.target.value];
  $("asz").innerHTML = Object.keys(g.sizes).map(s => `<option>${s}</option>`).join("");
  $("ad").innerHTML = `<option value="">—</option>` + fe.CATEGORIES[g.category].critical
    .map(d => `<option value="${d}">${fe.label(d, g.category)}</option>`).join("");
});

render();
