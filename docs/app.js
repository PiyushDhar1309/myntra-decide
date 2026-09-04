// Myntra · Decide - screens, rendering and interaction.
//
// The wishlist is the point. Everything else is the storefront it has to live
// inside to be judged fairly.

import { PRODUCTS, CATEGORIES, CLUSTER_SEEDS, photo, rupees, title } from "./data.js";
import * as de from "./decide.js";

// A wishlist the size real ones actually get. Six decision sets are in here,
// buried in twenty-odd unrelated saves — so they have to be found rather than
// handed over, which is the whole job.
const SEED_WISH = [
  ...CLUSTER_SEEDS.A, ...CLUSTER_SEEDS.B, ...CLUSTER_SEEDS.C,
  ...CLUSTER_SEEDS.D, ...CLUSTER_SEEDS.E, ...CLUSTER_SEEDS.F,
  "saree_kalini", "zara_blazer", "mango_skirt", "fabindia_kurta", "anouk_lehenga",
  "f00", "f03", "f06", "f09", "f12", "f15", "f18", "f21", "f24", "f27",
  "f30", "f33", "f36", "f39", "f42", "f45", "f48", "f51",
];

const state = {
  page: "home", stack: [],
  wish: [...SEED_WISH],
  collections: [{ id: "c1", name: "Cousin's wedding", items: [...CLUSTER_SEEDS.A],
                  decided: null, parked: [] }],
  bag: [],
  product: null, productSize: null,
  cat: null, sub: null, sort: "recommended", tab: "items",
  collection: null, cmpIds: [], cmpAll: false, tour: null,
  query: "", dismissed: [], introSeen: false,
  selecting: false, selected: [], cmpFrom: null, pendingPick: null, tips: [], picked: [],
  coach: null,
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const P = id => PRODUCTS[id];
const saved = id => state.wish.includes(id);
const inAnyCollection = id => state.collections.some(c => c.items.includes(id));
const collection = id => state.collections.find(c => c.id === id);

// Saved items not yet filed into a collection - the pool the suggestion works on.
function loose() { return state.wish.filter(id => !inAnyCollection(id)); }

function openDecisions() {
  const fromCollections = state.collections
    .filter(c => !c.decided && c.items.length >= 3)
    .map(c => ({ kind: "collection", id: c.id, name: c.name, items: c.items }));
  const suggested = de.findClusters(loose())
    .filter(c => !state.dismissed.includes(c.sub))
    .map(c => ({ kind: "suggestion", sub: c.sub, name: c.sub, items: c.items }));
  return [...fromCollections, ...suggested];
}

// --------------------------------------------------------------------------
// Pieces
// --------------------------------------------------------------------------

function priceHTML(id) {
  const p = P(id);
  return `<div class="price">${rupees(p.price)} <s>${rupees(p.mrp)}</s> <em>(${p.off}% OFF)</em></div>`;
}

function starsHTML(id) {
  const p = P(id);
  return `<span class="stars"><b>${p.rating}</b><span class="ms fill">star</span>
    <span>${(p.ratingCount / 1000).toFixed(1)}k</span></span>`;
}

function outOfStock(id) { return P(id).sizes.every(s => !s.inStock); }

function card(id, cls = "pc", menu = false) {
  const p = P(id);
  // In selection mode the whole card toggles instead of opening the product.
  if (state.selecting) {
    const on = state.selected.includes(id);
    return `<div class="${cls}${on ? " sel" : ""}" data-toggle="${id}">
      <div class="shot"><img src="${photo(id, 360, 480)}" alt="${esc(p.name)}" loading="lazy">
        <div class="tick"><span class="ms${on ? " fill" : ""}">${
          on ? "check_circle" : "radio_button_unchecked"}</span></div></div>
      <div class="brand">${esc(p.brand)}</div>
      <div class="pname">${esc(p.name)}</div>
      ${priceHTML(id)}</div>`;
  }
  return `<div class="${cls}" data-open="${id}">
    <div class="shot"><img src="${photo(id, 360, 480)}" alt="${esc(p.name)}" loading="lazy">
      ${menu ? `<button class="cardmenu" data-more="${id}" aria-label="More options">
        <span class="ms">more_horiz</span></button>` : ""}
      <button class="heart${saved(id) ? " on" : ""}" data-heart="${id}" aria-label="${saved(id) ? "Remove from" : "Add to"} wishlist">
        <span class="ms${saved(id) ? " fill" : ""}">favorite</span></button>
      ${outOfStock(id) ? '<div class="oostag">OUT OF STOCK</div>' : ""}</div>
    <div class="brand">${esc(p.brand)}</div>
    <div class="pname">${esc(p.name)}</div>
    ${priceHTML(id)}
    <div style="margin-top:6px">${starsHTML(id)}</div>
  </div>`;
}

function mosaic(items) {
  const four = items.slice(0, 4);
  const cells = [];
  for (let i = 0; i < 4; i++) {
    cells.push(four[i] ? `<img src="${photo(four[i], 200, 200)}" alt="" loading="lazy">`
                       : `<div class="fillcell"></div>`);
  }
  return `<div class="mosaic">${cells.join("")}</div>`;
}

// A one-line hint that appears once and can be sent away for good. Guidance
// that nags is worse than none.
function tip(id, text) {
  if (state.tips.includes(id)) return "";
  return `<div class="hint"><span class="ms">lightbulb</span><span>${text}</span>
    <button data-tip="${id}" aria-label="Dismiss"><span class="ms">close</span></button></div>`;
}

function disclaimer() {
  return `<div class="disc"><b>Prototype for a product case study.</b> Not affiliated with Myntra
    and not endorsed by any brand named here. Products, prices, ratings and reviews are sample data
    written for the demo — no real person wrote them, and nothing here can be bought.
    Photography from Unsplash illustrates the category, not the exact garment.</div>`;
}

// --------------------------------------------------------------------------
// Screens
// --------------------------------------------------------------------------

const CAT_TILES = [
  ["Kurtas", "libas_anar"], ["Dresses", "zara_midi"], ["Jeans", "only_wide"],
  ["Tops", "hm_shirt"], ["Sarees", "saree_kalini"], ["Co-ords", "global_coord"],
];

function homeScreen() {
  const d = openDecisions();
  const debt = d.reduce((n, x) => n + x.items.length, 0);
  const browse = Object.keys(PRODUCTS).filter(id => !state.wish.includes(id));

  const decideCard = d.length ? `
    <div id="decidecard" data-act="go-wishlist">
      <div class="tag">YOUR WISHLIST</div>
      <h3>${d.length} decision${d.length === 1 ? "" : "s"} waiting</h3>
      <p>${debt} saved items, and you're choosing between them.</p>
      <div class="strip">${d[0].items.slice(0, 4).map(i =>
        `<img src="${photo(i, 120, 160)}" alt="">`).join("")}
        <div class="go"><span class="ms">chevron_right</span></div></div>
    </div>` : "";

  const intro = state.introSeen ? "" : `<div id="intro">
      <button class="x" data-act="hideintro" aria-label="Dismiss"><span class="ms">close</span></button>
      <div class="k">PROTOTYPE · WHAT THIS IS</div>
      <h3>Your wishlist stores items. You're holding decisions.</h3>
      <p>Six saved kurtas aren't six choices — they're one you keep putting off. This adds a way to
      finish it. Everything else here is an ordinary Myntra clone, so you can see it in context.</p>
      <button class="go" data-act="tour">Show me how →</button>
    </div>`;

  return `${intro}
  <div class="cats hs">${CAT_TILES.map(([lab, id]) =>
    `<div class="cat" data-sub="${lab}"><img src="${photo(id, 130, 130)}" alt=""><span>${lab}</span></div>`).join("")}</div>
  <div class="banner" data-act="soon"><h2>END OF<br>SEASON SALE</h2>
    <p>50–80% OFF · 900+ brands</p>
    <div class="dots"><i class="on"></i><i></i><i></i></div></div>
  ${decideCard}
  <div class="rowhead"><span class="sec">Deals of the day</span>
    <button class="more" data-tab="shop">VIEW ALL</button></div>
  <div class="rail hs">${browse.slice(0, 6).map(id => card(id, "railcard")).join("")}</div>
  <div style="height:18px"></div>
  <div class="banner2" data-act="soon"><h3>MYNTRA INSIDER</h3><p>Earn points on every order</p></div>
  <div class="rowhead"><span class="sec">Trending near you</span></div>
  <div class="grid">${browse.slice(6, 10).map(id => card(id)).join("")}</div>
  ${disclaimer()}`;
}

const SORTS = { recommended: "Recommended", plh: "Price: low to high", phl: "Price: high to low",
  rating: "Customer rating", discount: "Better discount" };

function shopScreen() {
  let ids = Object.keys(PRODUCTS);
  if (state.sub) ids = ids.filter(id => P(id).sub === state.sub);
  if (state.cat) ids = ids.filter(id => P(id).category === state.cat);
  if (state.query) {
    const q = state.query.toLowerCase();
    ids = ids.filter(id => (title(id) + " " + P(id).sub + " " + P(id).colour).toLowerCase().includes(q));
  }
  const s = state.sort;
  ids.sort((a, b) => s === "plh" ? P(a).price - P(b).price
    : s === "phl" ? P(b).price - P(a).price
    : s === "rating" ? P(b).rating - P(a).rating
    : s === "discount" ? P(b).off - P(a).off : 0);

  const subs = [...new Set(Object.values(CATEGORIES).flat())];
  return `<div class="wtitle"><h1>${esc(state.sub || "Shop")}</h1><span>${ids.length} items</span></div>
    <div class="chips hs">
      <button class="chip${state.sub ? "" : " on"}" data-sub="">All</button>
      ${subs.map(x => `<button class="chip${state.sub === x ? " on" : ""}" data-sub="${x}">${x}</button>`).join("")}
    </div>
    <div style="display:flex;gap:9px;padding:0 12px 10px">
      <button class="btn ghost" style="flex:1;padding:9px" data-act="sort">
        <span class="ms" style="font-size:15px;vertical-align:-3px">swap_vert</span> ${SORTS[s]}</button>
    </div>
    ${ids.length ? `<div class="grid">${ids.map(id => card(id)).join("")}</div>`
      : `<div class="empty">Nothing matches that.</div>`}
    ${disclaimer()}`;
}

function productScreen() {
  const id = state.product, p = P(id);
  const size = state.productSize;
  const similar = Object.keys(PRODUCTS)
    .filter(x => x !== id && P(x).sub === p.sub).slice(0, 6);
  const inBag = state.bag.some(b => b.id === id);

  const dist = [5, 4, 3, 2, 1].map(n => {
    const share = n === Math.round(p.rating) ? 0.55 : n === Math.round(p.rating) - 1 ? 0.22 : 0.08;
    return `<div style="display:flex;align-items:center;gap:7px;font-size:11px;color:var(--sec)">
      <span style="width:8px">${n}</span><span class="ms" style="font-size:10px">star</span>
      <div style="flex:1;height:4px;background:var(--hair);border-radius:2px;overflow:hidden">
        <div style="width:${(share * 100).toFixed(0)}%;height:100%;background:${n >= 4 ? "var(--green)" : "var(--amber)"}"></div></div></div>`;
  }).join("");

  return `<div class="gallery"><img src="${photo(id, 600, 800)}" alt="${esc(p.name)}"></div>
    <div class="pdpinfo">
      <h1>${esc(p.brand)}</h1><h2>${esc(p.name)}</h2>
      <div style="margin-top:9px">${starsHTML(id)}</div>
      <div class="pdpprice">${rupees(p.price)} <s>${rupees(p.mrp)}</s> <em>(${p.off}% OFF)</em></div>
      <div style="font-size:11.5px;color:var(--green);font-weight:700;margin-top:5px">inclusive of all taxes</div>
    </div>
    <div class="sect">
      <div class="sechead"><span class="sec">Select size</span>
        <button class="more" data-act="chart">SIZE CHART</button></div>
      <div class="sizes">${p.sizes.map(s2 =>
        `<button class="szchip ${size === s2.label ? "on" : ""} ${s2.inStock ? "" : "dead"}"
          ${s2.inStock ? `data-size="${s2.label}"` : `data-act="oos"`}>${s2.label}</button>`).join("")}</div>
      ${p.sizes.some(s2 => !s2.inStock) ? `<div style="font-size:11px;color:var(--muted);margin-top:10px">Struck-through sizes are out of stock.</div>` : ""}
    </div>
    <div class="sect"><span class="sec">Product details</span>
      <div style="font-size:12.5px;color:var(--sec);line-height:1.7;margin-bottom:12px">${esc(p.desc)}</div>
      ${[["Fabric", p.fabric], ["Pattern", p.pattern], ["Sleeve", p.sleeve], ["Length", p.length],
         ["Fit", p.fit], ["Occasion", p.occasion], ["Wash care", p.wash], ["Sold by", p.seller]]
        .map(([k, v]) => `<div class="spec"><span>${k}</span><b>${esc(v)}</b></div>`).join("")}
    </div>
    <div class="sect"><span class="sec">Delivery &amp; returns</span>
      <div class="spec"><span>Get it by</span><b>${p.delivery === 1 ? "Tomorrow" : `${p.delivery} days`}</b></div>
      <div class="spec"><span>Return window</span><b>${p.returns} days</b></div>
      <div class="spec"><span>Exchange</span><b>Available</b></div>
    </div>
    <div class="sect"><span class="sec">Ratings &amp; reviews</span>
      <div class="ratebig">
        <div><div class="n">${p.rating}<span class="ms fill">star</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">${p.ratingCount.toLocaleString("en-IN")} ratings</div></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:3px">${dist}</div>
      </div>
      ${p.reviews.map(r => `<div class="revcard">
        <div class="top"><span class="stars"><b>${r.stars}</b><span class="ms fill">star</span></span>
          <span style="font-size:11px;color:var(--muted)">Size ${r.size}</span></div>
        <div class="t">${esc(r.title)}</div><div class="b">${esc(r.body)}</div>
        <div class="m">Verified Buyer · ${r.when}</div></div>`).join("")}
      <div style="font-size:11px;color:var(--muted);padding:12px 0">Sample reviews written for this
        prototype. No real customer wrote them.</div>
    </div>
    <div class="sect"><span class="sec">Similar products</span>
      <div class="rail hs" style="padding-left:0">${similar.map(x => card(x, "railcard")).join("")}</div>
    </div>
    ${disclaimer()}
    <div class="ctabar">
      <button class="cta-w" ${saved(id) ? `data-more="${id}"` : `data-heart="${id}"`}>${
        saved(id) ? "♥ WISHLISTED" : "♡ WISHLIST"}</button>
      <button class="cta-b" data-act="bag" data-g="${id}">${inBag ? "GO TO BAG" : "ADD TO BAG"}</button>
    </div>`;
}

function wishlistScreen() {
  const items = state.wish;
  const tabs = `<div class="tabs">
    <button class="${state.tab === "items" ? "on" : ""}" data-wtab="items">All items (${items.length})</button>
    <button class="${state.tab === "cols" ? "on" : ""}" data-wtab="cols">Collections (${state.collections.length})</button>
  </div>`;

  if (state.tab === "cols") {
    return `<div class="wtitle"><h1>Wishlist</h1></div>${tabs}
      <div class="colgrid">
        <div class="colcard" data-act="newcol"><div class="colnew">
          <span class="ms">add</span>Create collection</div></div>
        ${state.collections.map(c => `<div class="colcard" data-col="${c.id}">
          ${mosaic(c.items)}
          <div class="colname">${esc(c.name)}</div>
          <div class="colmeta">${c.items.length} item${c.items.length === 1 ? "" : "s"}${
            c.parked.length ? ` · ${c.parked.length} parked` : ""}</div>
          ${c.decided ? `<span class="pillsm done">DECIDED</span>`
            : c.items.length >= 3 ? `<span class="pillsm">DECISION WAITING</span>` : ""}
        </div>`).join("")}
      </div>${disclaimer()}`;
  }

  // Suggestions go straight to the comparison. Grouping first was a step nobody
  // asked for and a concept people had to learn before they could get value.
  const sugg = de.findClusters(loose()).filter(c => !state.dismissed.includes(c.sub));
  const suggestHTML = state.selecting ? "" : sugg.slice(0, 1).map(c => `<div class="suggest">
      <div class="t">We found ${c.items.length} similar items in your wishlist</div>
      <div class="d">${esc(de.sharedLine(c.items))}. Want us to compare them and show you what
        actually separates them?</div>
      <div class="row"><div class="thumbs">${c.items.slice(0, 6).map(i =>
        `<img src="${photo(i, 100, 133)}" alt="">`).join("")}</div></div>
      <div class="acts">
        <button class="btn ghost" data-dismiss="${c.sub}">Not now</button>
        <button class="btn" data-cmpsub="${c.sub}">Compare these ${c.items.length}</button></div>
    </div>`).join("");

  const bar = state.selecting ? "" : `<div class="wbar">
      <button class="primary" data-act="startsel"><span class="ms">library_add_check</span>Compare items</button>
      <button data-act="newcol"><span class="ms">create_new_folder</span>New collection</button>
    </div>`;

  const selbar = state.selecting ? `<div class="selbar">
      <div class="n">${state.selected.length} selected<small>${
        state.selected.length < 2 ? "Pick at least two" : "Tap Compare when you're ready"}</small></div>
      <button class="cx" data-act="cancelsel">Cancel</button>
      <button class="go" data-act="docompare" ${state.selected.length < 2 ? "disabled" : ""}>Compare</button>
    </div>` : "";

  const hint = state.selecting ? "" : tip("wish",
    "Some of these are the same decision saved several times. Tap <b>Compare items</b> to pick them, or use the suggestion below.");

  return `<div class="wtitle"><h1>${state.selecting ? "Pick items to compare" : "Wishlist"}</h1>
      <span>${items.length} items</span></div>${state.selecting ? "" : tabs}${bar}${hint}
    ${suggestHTML}
    ${items.length ? `<div class="grid">${items.map(id => card(id, "pc", true)).join("")}</div>`
      : `<div class="empty">Nothing saved yet.<br>Tap the heart on anything in Shop.</div>`}
    ${state.selecting ? "" : disclaimer()}${selbar}`;
}

function collectionScreen() {
  const c = collection(state.collection);
  if (!c) return `<div class="empty">This collection is gone.</div>`;
  const ready = c.items.length >= 3;
  return `<div class="wtitle"><h1>${esc(c.name)}</h1><span>${c.items.length} items</span></div>
    <div class="sub">${c.decided ? "You picked one. The rest are parked, not deleted."
      : ready ? "You're choosing between these."
      : c.items.length ? `Add ${3 - c.items.length} more to compare them side by side.`
      : "Nothing in here yet."}</div>
    <div style="padding:0 12px 12px"><button class="btn ${c.items.length ? "ghost " : ""}wide"
      data-act="additems">+ Add items</button></div>
    ${c.decided ? `<div class="suggest"><div class="t">Your pick: ${esc(title(c.decided))}</div>
        <div class="d">${rupees(P(c.decided).price)} · arrives in ${P(c.decided).delivery} days</div>
        <div class="row"><div class="thumbs"><img src="${photo(c.decided, 100, 133)}" alt=""></div>
          <button class="btn ghost" style="padding:9px 12px" data-act="reopen">Reopen</button>
          <button class="btn" style="padding:9px 14px" data-act="bag" data-g="${c.decided}">Move to bag</button></div></div>`
      : ready ? `<div style="padding:0 12px 12px"><button class="btn wide" data-act="compare">
          Compare &amp; decide</button></div>` : ""}
    ${c.items.length ? `<div class="grid">${c.items.map(id => card(id, "pc", true)).join("")}</div>`
      : `<div class="empty" style="padding:30px 26px">Add a few items and we'll show you what
         actually separates them.</div>`}
    ${c.parked.length ? `<div class="rowhead"><span class="sec">Parked (${c.parked.length})</span></div>
      <div class="sub">Kept, not deleted. Move any of them back whenever you want.</div>
      <div class="grid parked" style="opacity:.62">${c.parked.map(id => card(id)).join("")}</div>
      <div style="padding:10px 12px"><button class="btn ghost wide" data-act="unpark">Move all back</button></div>` : ""}
    <div style="padding:14px 12px"><button class="btn ghost wide" data-act="delcol">Delete collection</button></div>
    ${disclaimer()}`;
}

function compareScreen() {
  const ids = state.cmpIds;
  if (ids.length < 2) return `<div class="empty">Not enough to compare.</div>`;
  const { differs } = de.diff(ids);
  const shown = state.cmpAll ? differs : differs.slice(0, 4);

  const on = id => state.picked.includes(id);
  const head = ids.map(id => `<th class="${on(id) ? "picked" : ""}">
    <img class="ph" src="${photo(id, 140, 187)}" alt="">
    <div class="bname">${esc(P(id).brand)}</div>
    <button class="pickbtn ${on(id) ? "on" : ""}" data-pick="${id}">${
      on(id) ? "\u2713 Picked" : "Pick"}</button></th>`).join("");

  const body = shown.map(d => {
    const winners = de.bestOn(ids, d.attr);
    return `<tr><td class="rowlab">${d.attr.label}</td>${ids.map(id =>
      `<td class="${winners.includes(id) ? "win " : ""}${on(id) ? "pickedcol" : ""}">${
        esc(d.values[id])}</td>`).join("")}</tr>`;
  }).join("");

  return `<div class="cmphead">
      <h1>${ids.length} items, one decision</h1>
      <div class="shared">${esc(de.sharedLine(ids))}</div>
      <div class="trade">${esc(de.tradeoff(ids))} Of ${differs.length} differences, these
        ${Math.min(4, differs.length)} should decide it.</div>
    </div>
    <div class="cmpwrap"><table class="cmp">
      <thead><tr><th class="rowlab"></th>${head}</tr></thead>
      <tbody>${body}</tbody></table></div>
    ${differs.length > 4 ? `<button class="cmpmore" data-act="cmpmore">${
      state.cmpAll ? "Hide the rest" : `Show ${differs.length - 4} more differences`}</button>` : ""}
    <div class="foot">A tick marks the lowest price, the fastest delivery, the longest returns
      or the best rating. Nothing is ticked on fabric, colour or pattern — those are taste, and
      we are not going to pretend otherwise.</div>
    ${disclaimer()}
    <div class="tip">
      <span class="ms">compare_arrows</span>
      <div><b>Still can't choose?</b>
        <p>Picking one out of ${ids.length} is hard — that's why the list has sat there. Two at a
        time is easy. ${ids.length - 1} quick either-or picks and you're done.</p></div>
    </div>
    ${state.picked.length ? `<div class="pickbar">
        <div class="top">
          <div class="thumbs">${state.picked.map(i => `<img src="${photo(i, 90, 120)}" alt="">`).join("")}</div>
          <div class="n">${state.picked.length} picked<small>${
            state.picked.length === ids.length ? "That's all of them — nothing decided yet"
                                               : "Tap Pick on another, or finish below"}</small></div>
        </div>
        <div class="acts">
          <button class="bagb" data-act="bagpicked">Move to bag</button>
          <button class="doneb" data-act="donepicks">Keep ${
            state.picked.length === 1 ? "this one" : `these ${state.picked.length}`} →</button>
        </div>
      </div>`
      : `<div class="cmpbar">
        <button class="tourbtn" data-act="tournament">
          <span class="ms">compare_arrows</span>Compare two at a time</button>
      </div>`}`;
}

function tournamentScreen() {
  const t = state.tour;
  if (!t) return `<div class="empty">Nothing to compare.</div>`;
  const pair = de.nextPair(t.pool, t.champion);
  if (!pair) return `<div class="empty">Done.</div>`;
  const [a, b] = pair;
  const cardOf = id => `<div class="vscard" data-win="${id}">
    <div class="shot" style="border-radius:0"><img src="${photo(id, 300, 400)}" alt=""></div>
    <div class="body"><div class="brand">${esc(P(id).brand)}</div>
      <div class="pname">${esc(P(id).name)}</div>${priceHTML(id)}
      <div style="margin-top:6px">${starsHTML(id)}</div>
      <div style="font-size:11.5px;color:var(--sec);margin-top:6px">${esc(P(id).fabric)}<br>
        ${P(id).delivery === 1 ? "Tomorrow" : P(id).delivery + " days"} · ${P(id).returns}d returns</div>
    </div></div>`;
  return `<div class="wtitle"><h1>Which one?</h1><span>Round ${t.round} of ${t.total}</span></div>
    <div class="progress"><div style="width:${(t.round - 1) / t.total * 100}%"></div></div>
    <div class="sub" style="padding-top:12px">Pick the one you'd rather have. Two at a time is far
      easier than ${t.total + 1} at once — that's the whole trick.</div>
    <div class="vs">${cardOf(a)}${cardOf(b)}</div>
    <div class="foot">Whichever you pick carries on to the next round.</div>`;
}

function bagScreen() {
  if (!state.bag.length) return `<div class="wtitle"><h1>Bag</h1></div>
    <div class="empty">Your bag is empty.</div>${disclaimer()}`;
  const total = state.bag.reduce((n, b) => n + P(b.id).price * b.qty, 0);
  const mrp = state.bag.reduce((n, b) => n + P(b.id).mrp * b.qty, 0);
  return `<div class="wtitle"><h1>Bag</h1><span>${state.bag.length} items</span></div>
    ${state.bag.map((b, i) => `<div class="orow" data-open="${b.id}">
      <img src="${photo(b.id, 120, 160)}" alt="">
      <div style="flex:1;min-width:0"><div class="brand">${esc(P(b.id).brand)}</div>
        <div class="pname">${esc(P(b.id).name)}${b.size ? " · Size " + b.size : ""}</div>
        ${priceHTML(b.id)}
        <div class="qty"><button data-qty="${i}:-1">−</button><b>${b.qty}</b><button data-qty="${i}:1">+</button></div>
      </div>
      <button class="ms" style="color:var(--muted)" data-debag="${i}">close</button></div>`).join("")}
    <div class="sect"><span class="sec">Price details</span>
      <div class="spec"><span>Total MRP</span><b>${rupees(mrp)}</b></div>
      <div class="spec"><span>Discount</span><b style="color:var(--green)">− ${rupees(mrp - total)}</b></div>
      <div class="spec"><span>Delivery</span><b style="color:var(--green)">FREE</b></div>
      <div class="spec"><span><b>Total</b></span><b>${rupees(total)}</b></div>
    </div>
    <div class="empty" style="padding:22px 24px 0">Checkout is not part of this prototype.</div>
    ${disclaimer()}`;
}

function profileScreen() {
  const rows = [["Orders", "inventory_2", "orders"], ["Addresses", "location_on", ""],
    ["Payments", "credit_card", ""], ["Coupons", "local_offer", ""],
    ["Notifications", "notifications", ""], ["Help Centre", "support_agent", ""]];
  return `<div style="display:flex;align-items:center;gap:12px;padding:18px 12px">
      <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#ff3f6c,#ff905a);
        color:#fff;display:grid;place-items:center;font-weight:800;font-size:18px">P</div>
      <div><div style="font-size:17px;font-weight:800">Priya</div>
        <div style="font-size:12px;color:var(--muted)">Member since 2023</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);margin:0 12px;border:1px solid var(--line);
      border-radius:8px;overflow:hidden">
      ${[["4", "Orders"], [String(state.wish.length), "Wishlist"], [String(state.bag.length), "Bag"]]
        .map(([n, l], i) => `<div style="padding:12px 4px;text-align:center;${i < 2 ? "border-right:1px solid var(--line)" : ""}">
          <b style="display:block;font-size:16px">${n}</b>
          <span style="font-size:10px;color:var(--muted);letter-spacing:.07em;text-transform:uppercase;font-weight:700">${l}</span></div>`).join("")}
    </div>
    <div style="height:14px"></div>
    ${rows.map(([lab, icon, act]) => `<div class="srow" data-act="${act || "soon"}">
      <span class="ms">${icon}</span><span>${lab}</span>
      <span class="ms" style="font-size:18px;color:var(--muted)">chevron_right</span></div>`).join("")}
    ${disclaimer()}`;
}

function ordersScreen() {
  const past = ["fabindia_kurta", "levis_skinny", "hm_tee", "vh_trousers"];
  return `<div class="wtitle"><h1>Orders</h1><span>4 delivered</span></div>
    ${past.map((id, i) => `<div class="orow" data-open="${id}">
      <img src="${photo(id, 120, 160)}" alt="">
      <div style="flex:1;min-width:0"><div class="brand">${esc(P(id).brand)}</div>
        <div class="pname">${esc(P(id).name)}</div>
        <div style="font-size:11.5px;font-weight:700;margin-top:4px;color:var(--green)">
          Delivered ${["last week", "3 weeks ago", "last month", "2 months ago"][i]}</div></div>
      <span class="ms" style="color:var(--muted)">chevron_right</span></div>`).join("")}
    ${disclaimer()}`;
}

// --------------------------------------------------------------------------
// Sheets
// --------------------------------------------------------------------------

function addToCollectionSheet(id) {
  return `<div class="handle"></div>
    <div style="padding:6px 16px 4px"><div class="sec">Add to collection</div></div>
    <div class="srow" data-act="newcol" data-g="${id}"><span class="ms" style="color:var(--pink)">add</span>
      <span style="color:var(--pink);font-weight:800">Create new collection</span></div>
    ${state.collections.map(c => {
      const has = c.items.includes(id);
      return `<div class="srow" data-addto="${c.id}:${id}">
        <span class="ms">${has ? "check_box" : "check_box_outline_blank"}</span>
        <span>${esc(c.name)}</span>
        <span style="font-size:11.5px;color:var(--muted)">${c.items.length}</span></div>`;
    }).join("")}
    <div class="foot">An item can sit in your wishlist and in as many collections as you like.
      Nothing is moved or lost.</div>`;
}

function newCollectionSheet(addId) {
  return `<div class="handle"></div>
    <div style="padding:6px 16px 16px">
      <div class="sec">Create a collection</div>
      <label class="fl">Name</label>
      <input class="tin" id="colname" placeholder="Cousin's wedding" autocomplete="off">
      <div style="font-size:11.5px;color:var(--muted);margin-top:8px">Give it the occasion or the
        job, not the category — that's how you'll look for it later.</div>
      <div style="margin-top:16px"><button class="btn wide" data-act="createcol"
        data-g="${addId || ""}">Create</button></div>
    </div>`;
}

// Filling a collection has to be possible from inside it. The only route used
// to be the moment you first hearted an unsaved item, which meant a collection
// created after the fact could never be filled.
function addItemsSheet(cid, query = "") {
  const c = collection(cid);
  const q = query.trim().toLowerCase();
  const match = id => !q || (title(id) + " " + P(id).sub + " " + P(id).colour).toLowerCase().includes(q);
  const skip = id => c.parked.includes(id);

  const mine = state.wish.filter(id => !skip(id) && match(id));
  let store = Object.keys(PRODUCTS).filter(id => !state.wish.includes(id) && !skip(id) && match(id));
  if (!q) store = store.slice(0, 12);

  const row = id => {
    const has = c.items.includes(id);
    return `<div class="srow" data-toggleitem="${cid}:${id}">
      <img src="${photo(id, 90, 120)}" alt="" style="width:38px;border-radius:4px">
      <span><span style="font-weight:800">${esc(P(id).brand)}</span>
        <span style="color:var(--sec);font-weight:400"> ${esc(P(id).name)}</span>
        <span style="display:block;font-size:11px;color:var(--muted)">${rupees(P(id).price)}</span></span>
      <span class="ms" style="color:${has ? "var(--pink)" : "var(--line)"}">${
        has ? "check_circle" : "radio_button_unchecked"}</span></div>`;
  };

  const group = (label, ids) => ids.length
    ? `<div style="padding:14px 16px 4px"><div class="sec">${label}</div></div>${ids.map(row).join("")}`
    : "";

  const nothing = !mine.length && !store.length
    ? `<div class="empty" style="padding:34px 24px">Nothing matches “${esc(query)}”.</div>` : "";

  return `<div class="handle"></div>
    <div style="padding:6px 16px 0"><div class="sec">Add to ${esc(c.name)}</div>
      <input class="tin" id="addq" placeholder="Search products" value="${esc(query)}"
        autocomplete="off" style="margin-top:10px">
      <div style="font-size:11.5px;color:var(--muted);margin-top:7px">Tap to add or remove. Anything
        you add is saved to your wishlist too.</div></div>
    ${group("From your wishlist", mine)}
    ${group(q ? "More results" : "From the store", store)}
    ${nothing}
    <div style="padding:16px"><button class="btn wide" data-act="closesheet">Done</button></div>`;
}

function itemSheet(id) {
  return `<div class="handle"></div>
    <div style="padding:6px 16px 4px"><div class="sec">${esc(title(id))}</div></div>
    <div class="srow" data-act="tocollection" data-g="${id}">
      <span class="ms">bookmark_add</span><span>Add to collection</span>
      <span class="ms" style="font-size:18px;color:var(--muted)">chevron_right</span></div>
    <div class="srow" data-act="bag" data-g="${id}">
      <span class="ms">shopping_bag</span><span>Move to bag</span></div>
    <div class="srow" data-heart="${id}">
      <span class="ms" style="color:var(--red)">delete_outline</span>
      <span style="color:var(--red)">Remove from wishlist</span></div>`;
}

// Elimination, asked rather than assumed. The old flow parked the losers inside
// a collection, which only worked if a collection already existed.
function removeOthersSheet() {
  const { keep, others } = state.pendingPick;
  const kept = keep.length;
  const row = id => `<div style="display:flex;gap:11px;align-items:center;padding:9px 0">
    <img src="${photo(id, 110, 147)}" alt="" style="width:44px;border-radius:4px">
    <div style="flex:1;min-width:0"><div class="brand">${esc(P(id).brand)}</div>
      <div class="pname">${esc(P(id).name)}</div></div>
    <div style="font-size:12.5px;font-weight:700">${rupees(P(id).price)}</div></div>`;

  // Keeping everything is not a decision, and the product should not pretend it
  // is. The metric does not count it either.
  const nothingCut = others.length === 0;

  return `<div class="handle"></div>
    <div style="padding:6px 16px 4px">
      <div class="sec">You kept ${kept === 1 ? "this one" : `these ${kept}`}</div>
      ${keep.map(row).join("")}
      ${nothingCut
        ? `<div class="keptall"><b>You kept all of them</b>
             <p>Which is fine — but the decision is still open and your wishlist is the same size
             it was. We don't count this one as decided.</p></div>
           <div style="margin-top:16px"><button class="btn wide" data-act="keepall">Back to it</button></div>`
        : `<div style="font-size:14px;font-weight:800;margin-top:18px">Remove the other ${others.length} from your wishlist?</div>
           <div style="font-size:12.5px;color:var(--sec);margin-top:5px;line-height:1.6">You were
             choosing between them, so keeping them means the decision stays open. Nothing is
             deleted from the store — you can save them again any time.</div>
           <div style="display:flex;gap:9px;margin-top:10px;overflow-x:auto;padding:4px 0">${
             others.map(i => `<img src="${photo(i, 90, 120)}" alt="" style="width:42px;border-radius:4px;flex:none">`).join("")}</div>
           <div style="display:flex;gap:9px;margin-top:16px">
             <button class="btn ghost" style="flex:1" data-act="keepall">Keep them</button>
             <button class="btn" style="flex:1" data-act="removeothers">Remove ${others.length}</button>
           </div>`}
      <button class="btn ghost wide" style="margin-top:9px" data-act="bagpicked">Move ${
        kept === 1 ? "it" : `all ${kept}`} to bag</button>
    </div>`;
}

// A five-step walkthrough that points at the real controls rather than
// describing them. Each step names the screen it needs, sets up whatever state
// that screen requires, and the selector to spotlight.
const TOUR = [
  { page: "home", sel: "#decidecard",
    title: "You have more decisions than you think",
    body: "Seven of your saved items aren't seven choices — they're the same choice, saved over and over. Nothing in a wishlist ever closes one." },
  { page: "wishlist", sel: '.wbar button[data-act="startsel"]',
    setup: () => { state.tab = "items"; state.selecting = false; },
    title: "Pick what you're torn between",
    body: "Tap this and your wishlist becomes selectable. Choose the ones you keep going back and forth on." },
  { page: "wishlist", sel: ".suggest",
    title: "Or take one we've already spotted",
    body: "We look for saved items that answer the same need at a similar price. Seven black tees, six pairs of jeans — that sort of thing." },
  { page: "compare", sel: ".cmp",
    setup: () => {
      const cl = de.findClusters(loose())[0];
      if (cl) { state.cmpIds = [...cl.items]; state.cmpAll = false; state.cmpFrom = "wishlist"; }
    },
    title: "Only what actually separates them",
    body: "Near-identical products differ on a dozen things and almost none of them matter. You get the few that do, and a tick on whichever wins each row." },
  { page: "compare", sel: ".cmpbar .tourbtn",
    title: "Still can't choose?",
    body: "Two at a time. One out of seven is hard — six either-or picks is easy. Then we ask what to do with the ones you didn't pick." },
];

function startTour() {
  closeSheet();
  state.coach = 0;
  applyTourStep();
}

function applyTourStep() {
  const step = TOUR[state.coach];
  if (!step) return endTour();
  if (step.setup) step.setup();
  state.page = step.page;
  render();
}

function endTour() {
  state.coach = null;
  const el = $("coach");
  if (el) el.remove();
  render();
}

// Painted after every render, because the screen underneath is rebuilt each time.
function paintCoach() {
  const existing = $("coach");
  if (state.coach === null) { if (existing) existing.remove(); return; }
  const step = TOUR[state.coach];
  const target = step && document.querySelector(step.sel);
  if (!target) { // nothing to point at — don't strand the reader on a blank overlay
    state.coach++;
    return state.coach < TOUR.length ? applyTourStep() : endTour();
  }

  let box = existing;
  if (!box) {
    box = document.createElement("div");
    box.id = "coach";
    box.innerHTML = `<div class="veil"></div><div class="spot"></div>
      <div class="arw"></div><div class="bub"></div>`;
    document.body.appendChild(box);
  }
  try { target.scrollIntoView({ block: "center", behavior: "auto" }); } catch (e) { /* no layout */ }

  const r = target.getBoundingClientRect();
  const pad = 6;
  const spot = box.querySelector(".spot");
  spot.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;` +
    `width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;

  const bub = box.querySelector(".bub");
  bub.innerHTML = `<div class="n">STEP ${state.coach + 1} OF ${TOUR.length}</div>
    <h4>${esc(step.title)}</h4><p>${esc(step.body)}</p>
    <div class="row"><button class="skip" data-act="tourskip">Skip — let me explore</button>
      <button class="next" data-act="tournext">${
        state.coach === TOUR.length - 1 ? "Done" : "Next"}</button></div>`;

  // Below the target if there is room, otherwise above it.
  const vh = window.innerHeight || 800;
  const below = r.bottom + 16 + 190 < vh;
  const top = below ? r.bottom + 16 : Math.max(12, r.top - 16 - bub.offsetHeight);
  const left = Math.max(12, Math.min((window.innerWidth || 400) - 292, r.left + r.width / 2 - 140));
  bub.style.top = `${top}px`;
  bub.style.left = `${left}px`;

  const arw = box.querySelector(".arw");
  arw.className = "arw " + (below ? "up" : "down");
  arw.style.top = `${below ? r.bottom + 6 : top + bub.offsetHeight - 1}px`;
  arw.style.left = `${Math.min(Math.max(r.left + r.width / 2 - 10, left + 14), left + 250)}px`;
}

function guideSheet() {
  const d = openDecisions();
  return `<div class="handle"></div>
    <div style="padding:6px 16px 4px">
      <div class="sec">How this prototype works</div>
      <div style="font-size:13px;color:var(--sec);line-height:1.65;margin-top:8px">
        Everything here is an ordinary Myntra clone — browse it, save things, put them in your bag.
        One thing is new, and it lives in your wishlist.</div>
    </div>
    ${[["Your wishlist is full of repeats",
        `You have ${state.wish.length} saved items, and ${d.length} of them are really the same
         decision saved several times over — seven black tees, six pairs of jeans, five white shirts.`],
       ["Pick the ones you're torn between",
        `Open Wishlist and tap <b>Compare items</b>, then select them. Or take the suggestion at the
         top, which finds a set for you.`],
       ["See what actually separates them",
        `Near-identical products differ on a dozen things and almost none of them matter. You get the
         few that do — and if it's still close, two at a time.`],
       ["Then close the decision",
        `Pick one, and we ask whether to clear the rest out of your wishlist. Nothing is deleted
         behind your back.`]]
      .map(([t, b], i) => `<div class="step">
        <span class="n">${i + 1}</span>
        <div><b>${t}</b><p>${b}</p></div></div>`).join("")}
    <div style="padding:14px 16px 0">
      <button class="btn wide" data-act="tour">Walk me through it</button></div>
    <div class="foot">Case-study prototype. Nothing here can be bought.</div>`;
}

function sortSheet() {
  return `<div class="handle"></div>
    <div style="padding:6px 16px 4px"><div class="sec">Sort by</div></div>
    ${Object.entries(SORTS).map(([k, v]) => `<div class="srow" data-sort="${k}">
      <span class="ms" style="color:${state.sort === k ? "var(--pink)" : "var(--line)"}">
        ${state.sort === k ? "radio_button_checked" : "radio_button_unchecked"}</span>
      <span>${v}</span></div>`).join("")}`;
}

function chartSheet(id) {
  const p = P(id);
  return `<div class="handle"></div>
    <div style="padding:6px 16px 12px"><div class="sec">${esc(p.brand)} · size chart</div>
      <div style="font-size:11.5px;color:var(--sec);margin-top:6px;line-height:1.6">
        Body measurements in inches. Sizes vary between brands.</div></div>
    <div style="padding:0 16px">
      ${p.sizes.map((s, i) => `<div class="spec"><span>${s.label}${s.inStock ? "" : " · out of stock"}</span>
        <b>Bust ${32 + i * 2}" · Waist ${26 + i * 2}"</b></div>`).join("")}
    </div>
    <div class="foot">Illustrative sizing for the prototype.</div>`;
}

// --------------------------------------------------------------------------
// Shell
// --------------------------------------------------------------------------

const TABS = [["home", "home", "Home"], ["shop", "category", "Shop"],
  ["wishlist", "favorite", "Wishlist"], ["profile", "person", "Profile"]];
const ROOTS = new Set(["home", "shop", "wishlist", "profile"]);

const openSheet = html => {
  $("sheet").innerHTML = html;
  $("sheet").classList.add("open");
  $("sheet").removeAttribute("aria-hidden");
  $("scrim").classList.add("open");
  const f = $("colname"); if (f) f.focus();
};
const closeSheet = () => {
  $("sheet").classList.remove("open");
  $("sheet").setAttribute("aria-hidden", "true");
  $("scrim").classList.remove("open");
};

// Flip a row's tick without rebuilding the sheet around it.
function mark(icon, on, onGlyph, offGlyph) {
  if (!icon) return;
  icon.textContent = on ? onGlyph : offGlyph;
  icon.style.color = on ? "var(--pink)" : "var(--line)";
}

let undo = null;
function toast(msg, action) {
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.style.cssText = `position:fixed;bottom:88px;left:50%;transform:translateX(-50%);
    background:#282c3f;color:#fff;padding:11px 16px;border-radius:6px;font-size:12.5px;font-weight:700;
    z-index:60;box-shadow:0 4px 18px rgba(22,27,45,.3);max-width:92vw;display:flex;gap:14px;align-items:center`;
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-act="${action}"
    style="color:#ff8fab;font-weight:800;font-size:12px">UNDO</button>` : ""}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function topbar() {
  const bag = state.bag.length;
  // The wordmark goes home, the way it does on every storefront.
  const left = ROOTS.has(state.page)
    ? `<button class="logo" data-tab="home" aria-label="Myntra home">MYNTRA<i>.</i></button>
       <span class="proto">PROTOTYPE</span>`
    : `<button class="ms topicon" data-act="back">arrow_back</button>
       <button class="logo" data-tab="home" style="font-size:17px" aria-label="Myntra home">MYNTRA<i>.</i></button>`;
  const mid = state.page === "shop"
    ? `<input id="searchfield" placeholder="Search for products, brands" value="${esc(state.query)}">`
    : `<span class="spacer"></span><button class="ms topicon" data-act="search">search</button>`;
  return `${left}${mid}<button class="ms topicon" data-act="guide" aria-label="How this works">help_outline</button>
    <button class="ms topicon" data-act="bagpage">shopping_bag${
    bag ? `<span class="bagdot">${bag}</span>` : ""}</button>`;
}

const SCREENS = { home: homeScreen, shop: shopScreen, product: productScreen,
  wishlist: wishlistScreen, collection: collectionScreen, compare: compareScreen,
  tournament: tournamentScreen, bag: bagScreen, profile: profileScreen, orders: ordersScreen };

function render() {
  $("topbar").innerHTML = topbar();
  $("screen").innerHTML = (SCREENS[state.page] || homeScreen)();
  const hideNav = state.page === "product" || state.page === "compare"
    || (state.page === "wishlist" && state.selecting);
  $("nav").style.display = hideNav ? "none" : "flex";
  $("screen").style.paddingBottom =
    (state.page === "compare" && state.picked.length) ? "150px" : hideNav ? "88px" : "76px";
  $("nav").innerHTML = TABS.map(([k, icon, lab]) => {
    const on = k === state.page ||
      (k === "wishlist" && ["collection", "compare", "tournament"].includes(state.page)) ||
      (k === "profile" && state.page === "orders");
    return `<button class="${on ? "on" : ""}" data-tab="${k}">
      <span class="ms${on ? " fill" : ""}">${icon}</span>${lab}</button>`;
  }).join("");
  window.scrollTo(0, 0);
  paintCoach();
}

function go(page, push = true) {
  if (push && page !== state.page) state.stack.push(state.page);
  if (ROOTS.has(page)) state.stack = [];
  state.page = page;
  render();
}
const back = () => { state.page = state.stack.pop() || "home"; render(); };

// --------------------------------------------------------------------------
// Events
// --------------------------------------------------------------------------

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-tab],[data-act],[data-open],[data-heart],[data-sub],[data-size],"
    + "[data-col],[data-wtab],[data-addto],[data-sort],[data-pick],[data-win],[data-group],"
    + "[data-dismiss],[data-debag],[data-qty],[data-more],[data-toggleitem],[data-toggle],"
    + "[data-cmpsub],[data-tip]");
  if (!t) return;
  const d = t.dataset;

  if (d.heart !== undefined && d.heart) {
    ev.stopPropagation();
    const id = d.heart;
    if (saved(id)) {
      state.wish = state.wish.filter(x => x !== id);
      state.collections.forEach(c => {
        c.items = c.items.filter(x => x !== id);
        c.parked = c.parked.filter(x => x !== id);
      });
      undo = { id };
      render(); toast("Removed from wishlist", "undo-heart");
    } else {
      state.wish.unshift(id);
      render(); toast("Saved to wishlist");
      setTimeout(() => openSheet(addToCollectionSheet(id)), 260);
    }
    return;
  }
  if (d.tab) {
    closeSheet(); state.query = ""; state.sub = null;
    state.selecting = false; state.selected = []; state.picked = [];
    go(d.tab); return;
  }
  if (d.wtab) { state.tab = d.wtab; render(); return; }
  if (d.open) { state.product = d.open; state.productSize = null; closeSheet(); go("product"); return; }
  if (d.sub !== undefined && !d.open) { state.sub = d.sub || null; go("shop"); return; }
  if (d.size) { state.productSize = d.size; render(); return; }
  if (d.col) { state.collection = d.col; go("collection"); return; }
  if (d.sort) { state.sort = d.sort; closeSheet(); render(); return; }
  if (d.tip) { state.tips.push(d.tip); render(); return; }
  if (d.toggle) {
    const i = state.selected.indexOf(d.toggle);
    if (i >= 0) state.selected.splice(i, 1); else state.selected.push(d.toggle);
    render(); return;
  }
  if (d.cmpsub) {
    const cl = de.findClusters(loose()).find(c => c.sub === d.cmpsub);
    if (!cl) return;
    state.cmpIds = [...cl.items]; state.cmpAll = false; state.cmpFrom = "wishlist";
    go("compare"); return;
  }
  if (d.more) { ev.stopPropagation(); openSheet(itemSheet(d.more)); return; }
  if (d.toggleitem) {
    // Toggle the row in place. Rebuilding the sheet on every tap would detach
    // the rows and throw away the scroll position mid-list.
    const [cid, pid] = d.toggleitem.split(":");
    const c = collection(cid);
    const had = c.items.includes(pid);
    if (had) c.items = c.items.filter(x => x !== pid);
    else { c.items.push(pid); if (!saved(pid)) state.wish.unshift(pid); }
    mark(t.querySelector(".ms"), !had, "check_circle", "radio_button_unchecked");
    render();
    return;
  }
  if (d.addto) {
    const [cid, pid] = d.addto.split(":");
    const c = collection(cid);
    const had = c.items.includes(pid);
    if (had) c.items = c.items.filter(x => x !== pid);
    else { c.items.push(pid); if (!saved(pid)) state.wish.unshift(pid); }
    mark(t.querySelector(".ms"), !had, "check_box", "check_box_outline_blank");
    render();
    return;
  }
  if (d.group) {
    const cl = de.findClusters(loose()).find(c => c.sub === d.group);
    if (!cl) return;
    const c = { id: "c" + Date.now(), name: cl.sub, items: [...cl.items], decided: null, parked: [] };
    state.collections.push(c);
    state.collection = c.id;
    go("collection"); toast("Collection created");
    return;
  }
  if (d.dismiss) { state.dismissed.push(d.dismiss); render(); return; }
  if (d.debag !== undefined && d.debag !== "") {
    state.bag.splice(+d.debag, 1); render(); return;
  }
  if (d.qty) {
    const [i, delta] = d.qty.split(":").map(Number);
    state.bag[i].qty = Math.max(1, state.bag[i].qty + delta);
    render(); return;
  }
  if (d.pick) {
    const i = state.picked.indexOf(d.pick);
    if (i >= 0) state.picked.splice(i, 1); else state.picked.push(d.pick);
    render(); return;
  }
  if (d.win) {
    // Each round consumes exactly one challenger from the pool, whether or not
    // it won. Filtering the winner out as well would silently drop a contestant.
    const t2 = state.tour;
    t2.pool = t2.pool.slice(1);
    t2.champion = d.win;
    t2.round++;
    if (!t2.pool.length) { resolve(d.win); return; }
    render(); return;
  }

  switch (d.act) {
    case "back": state.picked = []; back(); break;
    case "go-wishlist": state.tab = "items"; go("wishlist"); break;
    case "orders": go("orders"); break;
    case "search": state.query = ""; state.sub = null; go("shop"); break;
    case "bagpage": go("bag"); break;
    case "soon": toast("Not part of this prototype"); break;
    case "oos": toast("That size is out of stock"); break;
    case "sort": openSheet(sortSheet()); break;
    case "hideintro": state.introSeen = true; render(); break;
    case "guide": openSheet(guideSheet()); break;
    case "tour": state.introSeen = true; startTour(); break;
    case "donepicks":
      if (!state.picked.length) { toast("Pick at least one"); break; }
      resolve([...state.picked]); break;
    case "bagpicked": {
      const list = state.pendingPick ? state.pendingPick.keep : state.picked;
      let added = 0;
      list.forEach(id => {
        const size = (P(id).sizes.find(x => x.inStock) || {}).label;
        if (!state.bag.some(b => b.id === id && b.size === size)) {
          state.bag.push({ id, size, qty: 1 }); added++;
        }
      });
      if (state.pendingPick) { closeSheet(); state.pendingPick = null; state.picked = []; }
      else state.picked = [];
      render();
      toast(added ? `${added} moved to bag` : "Already in your bag");
      break;
    }
    case "tournext": state.coach++; applyTourStep(); break;
    case "tourskip": endTour(); toast("Have a look around. Tap ? any time."); break;
    case "startsel": state.selecting = true; state.selected = []; render(); break;
    case "cancelsel": state.selecting = false; state.selected = []; render(); break;
    case "docompare":
      if (state.selected.length < 2) { toast("Pick at least two"); break; }
      state.cmpIds = [...state.selected]; state.cmpAll = false; state.cmpFrom = "wishlist";
      go("compare"); break;
    case "removeothers": {
      const { others } = state.pendingPick;
      state.wish = state.wish.filter(x => !others.includes(x));
      state.collections.forEach(c => {
        c.items = c.items.filter(x => !others.includes(x));
        c.parked = c.parked.filter(x => !others.includes(x));
      });
      state.pendingPick = null; closeSheet(); render();
      toast(`${others.length} removed. Decision closed.`);
      break;
    }
    case "keepall": state.pendingPick = null; closeSheet(); render();
      toast("Kept. They're still in your wishlist."); break;
    case "additems": openSheet(addItemsSheet(state.collection)); break;
    case "tocollection": openSheet(addToCollectionSheet(d.g)); break;
    case "closesheet": closeSheet(); break;
    case "chart": openSheet(chartSheet(state.product)); break;
    case "cmpmore": state.cmpAll = !state.cmpAll; render(); break;
    case "newcol": openSheet(newCollectionSheet(d.g)); break;
    case "createcol": {
      const name = ($("colname").value || "").trim();
      if (!name) { $("colname").style.borderColor = "var(--red)"; return; }
      const c = { id: "c" + Date.now(), name, items: d.g ? [d.g] : [], decided: null, parked: [] };
      state.collections.push(c);
      closeSheet(); state.tab = "cols"; render(); toast("Collection created");
      break;
    }
    case "compare": {
      const c = collection(state.collection);
      state.cmpIds = [...c.items]; state.cmpAll = false; state.cmpFrom = "collection";
      go("compare"); break;
    }
    case "tournament": {
      const ids = state.cmpIds;
      state.tour = { pool: ids.slice(1), champion: ids[0], round: 1, total: ids.length - 1 };
      go("tournament"); break;
    }
    case "reopen": {
      const c = collection(state.collection);
      c.items = [...c.items, ...c.parked]; c.parked = []; c.decided = null;
      render(); break;
    }
    case "unpark": {
      const c = collection(state.collection);
      c.items = [...c.items, ...c.parked]; c.parked = []; c.decided = null;
      render(); toast("Moved back"); break;
    }
    case "delcol": {
      state.collections = state.collections.filter(x => x.id !== state.collection);
      go("wishlist"); state.tab = "cols"; render(); toast("Collection deleted"); break;
    }
    case "bag": {
      const id = d.g || state.product;
      const size = state.productSize;
      const existing = state.bag.find(b => b.id === id && b.size === size);
      if (existing) { go("bag"); break; }
      if (state.page === "product" && !size && P(id).sizes.some(s => s.inStock)) {
        toast("Pick a size first"); break;
      }
      state.bag.push({ id, size, qty: 1 });
      render(); toast("Added to bag"); break;
    }
    case "undo-heart": {
      if (undo) { state.wish.unshift(undo.id); undo = null; render(); }
      break;
    }
  }
});

// Picking a winner ends the decision. The others are parked inside the
// collection - kept, not deleted - because elimination only happens when it
// does not feel like loss.
// Finish a comparison with one or more keepers. Nothing is removed without being
// asked, and keeping everything is treated as what it is - not a decision.
function resolve(keep) {
  const kept = Array.isArray(keep) ? keep : [keep];
  const others = state.cmpIds.filter(x => !kept.includes(x));
  state.tour = null;
  state.picked = [];

  if (state.cmpFrom === "collection") {
    const c = collection(state.collection);
    if (c) { c.parked = [...c.parked, ...others]; c.items = [...kept]; c.decided = kept[0]; }
    go("collection");
    toast(others.length ? "Decided. The rest are parked, not deleted." : "Kept all of them.");
    return;
  }
  state.pendingPick = { keep: kept, others };
  state.selecting = false; state.selected = [];
  go("wishlist");
  openSheet(removeOthersSheet());
}

document.addEventListener("input", ev => {
  if (ev.target.id === "searchfield") {
    state.query = ev.target.value;
    $("screen").innerHTML = shopScreen();
  }
  if (ev.target.id === "addq") {
    const v = ev.target.value, at = ev.target.selectionStart;
    $("sheet").innerHTML = addItemsSheet(state.collection, v);
    const f = $("addq");
    if (f) { f.focus(); f.setSelectionRange(at, at); }
  }
});
$("scrim").addEventListener("click", closeSheet);

render();
