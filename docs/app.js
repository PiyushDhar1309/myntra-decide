// Fit Check - screens, rendering and interaction.
//
// All fit reasoning lives in engine.js. This file only decides what to show.

import { GARMENTS, PERSONAS, photo, title, rupees } from "./data.js";
import * as fe from "./engine.js";

const state = {
  page: "home", persona: "ananya", extra: {}, added: {},
  filter: "all", measure: 30.5,
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function persona() {
  const p = PERSONAS[state.persona];
  return { ...p, wardrobe: [...p.wardrobe, ...(state.added[state.persona] || [])] };
}

const TONE = { good: "good", warn: "warn", info: "info", bad: "bad" };

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
  return `<div class="pc" data-item="${row.gid}">
    <div class="shot">
      <img src="${photo(row.gid, 360, 480)}" alt="${esc(g.alt)}" loading="lazy">
      <div class="heart"><span class="ms fill">favorite</span></div>
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
  return `<div class="${cls}">
    <img src="${photo(gid, 320, 427)}" alt="${esc(g.alt)}" loading="lazy">
    <div class="brand" style="margin-top:7px">${esc(g.brand)}</div>
    <div class="pname">${esc(g.name)}</div>
    ${priceHTML(gid)}
  </div>`;
}

function measureStrip(rv) {
  if (!rv.unlocks.length) return "";
  const u = rv.unlocks[0];
  const src = u.source;
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
// Screens
// --------------------------------------------------------------------------

const CAT_TILES = [
  ["g_biba_kurta", "Kurtas"], ["w_zara_midi", "Dresses"], ["w_levis_314", "Jeans"],
  ["w_hm_oversized", "Tops"], ["w_anouk_lehenga", "Ethnic"], ["g_zara_blazer", "Jackets"],
];

function homeScreen(rv) {
  const p = persona();
  const anchor = fe.anchorGarment(p);
  const good = rv.counts[fe.FITS] + rv.counts[fe.LIKELY];
  const wishIds = new Set(p.wishlist.map(w => w.garment));
  const others = Object.keys(GARMENTS).filter(g => !wishIds.has(g)).slice(0, 6);

  const thumbs = rv.rows.filter(r => r.result.status === fe.FITS || r.result.status === fe.LIKELY)
    .slice(0, 4).map(r => `<img src="${photo(r.gid, 120, 160)}" alt="">`).join("");

  return `
  <div class="cats hs">${CAT_TILES.map(([gid, lab]) => `
    <div class="cat"><img src="${photo(gid, 130, 130)}" alt=""><span>${lab}</span></div>`).join("")}</div>

  <div class="banner">
    <h2>END OF<br>SEASON SALE</h2>
    <p>50–80% OFF · 900+ brands</p>
    <div class="dots"><i class="on"></i><i></i><i></i></div>
  </div>

  <div id="fitcard" data-act="go-wishlist">
    <div class="tag">FIT CHECK</div>
    <h3>Your ${esc(GARMENTS[anchor.garment].brand)} ${NOUN[GARMENTS[anchor.garment].category]} fits you.</h3>
    <p>So will ${good} of your ${rv.rows.length} saved items.</p>
    <div class="strip">${thumbs}<div class="go"><span class="ms">chevron_right</span></div></div>
  </div>

  <div class="rowhead"><span class="sec">Deals of the day</span><span class="more">VIEW ALL</span></div>
  <div class="rail hs">${others.slice(0, 4).map(g => browseCard(g, "railcard")).join("")}</div>

  <div style="height:18px"></div>
  <div class="banner2"><h3>MYNTRA INSIDER</h3><p>Earn points on every order</p></div>

  <div class="rowhead"><span class="sec">Trending near you</span></div>
  <div class="grid">${others.slice(0, 4).map(g => browseCard(g, "pc")).join("")}</div>
  ${disclaimer()}`;
}

function categoriesScreen() {
  const p = persona();
  const wishIds = new Set(p.wishlist.map(w => w.garment));
  const owned = new Set(p.wardrobe.map(w => w.garment));
  const items = Object.keys(GARMENTS).filter(g => !wishIds.has(g) && !owned.has(g));
  return `<div class="wtitle"><h1>Shop</h1><span>${items.length} items</span></div>
    <div class="grid">${items.map(g => browseCard(g, "pc")).join("")}</div>
    ${disclaimer()}`;
}

const FILTERS = [
  ["all", "All"], [fe.FITS, "Fits you"], [fe.LIKELY, "Likely"],
  [fe.CANT_SAY, "Need a measure"], [fe.WRONG_SIZE, "Wrong size"],
];

function wishlistScreen(rv) {
  const shown = state.filter === "all" ? rv.rows
    : rv.rows.filter(r => r.result.status === state.filter);

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
                   : `<div class="note">Nothing in this group.</div>`}
    ${gaps}${disclaimer()}`;
}

function profileScreen(rv) {
  const p = persona();
  const avs = p.wardrobe.slice(0, 5)
    .map(e => `<img src="${photo(e.garment, 80, 80)}" alt="">`).join("");
  const rows = ["Orders", "Addresses", "Payments", "Coupons", "Notifications", "Help Centre", "Settings"];
  const icons = ["inventory_2", "location_on", "credit_card", "local_offer", "notifications", "support_agent", "settings"];

  return `<div class="phead">
      <div class="avatar">${esc(p.name[0])}</div>
      <div style="flex:1"><h1>${esc(p.name)}</h1><p>${esc(p.segment)} · ${esc(p.blurb.split(".")[0])}</p></div>
    </div>
    <div class="tiles">
      <div><b>12</b><span>Orders</span></div>
      <div><b>${p.wishlist.length}</b><span>Wishlist</span></div>
      <div><b>4</b><span>Coupons</span></div>
    </div>
    <div id="fpcard" data-act="go-fitprofile">
      <div style="flex:1">
        <div class="tag">MY FIT PROFILE</div>
        <h3>Built from ${p.wardrobe.length} things you own</h3>
        <p>Used to check every saved item</p>
        <div class="avs">${avs}</div>
      </div>
      <div class="go" style="width:28px;height:28px;border-radius:50%;background:#fff;display:grid;place-items:center">
        <span class="ms" style="font-size:19px;color:var(--pink)">chevron_right</span></div>
    </div>
    ${rows.map((r, i) => `<div class="arow"><span class="ms">${icons[i]}</span>
      <span>${r}</span><span class="ms go">chevron_right</span></div>`).join("")}
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
    return `<div class="wrow">
      <img src="${photo(e.garment, 120, 160)}" alt="">
      <div class="m"><div class="brand">${esc(g.brand)}</div>
        <div class="pname">${esc(g.name)} · Size ${esc(e.size)}</div>
        <div class="meas">${esc(meas)}</div></div>
      <span class="tag2" style="background:${colour}">${word}</span></div>`;
  }).join("");

  const rows = [...rv.env.entries()]
    .filter(([, e]) => e.hasAny)
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
    ? `<div class="kv"><span>${esc(rv.unlocks[0].label)} <span style="color:var(--muted)">· ${
        fe.CATEGORIES[GARMENTS[rv.unlocks[0].source.garment].category].region}</span></span>
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
  return `<div class="disc">Case-study prototype. Not affiliated with Myntra and not endorsed by any
    brand shown. Catalog and order history are illustrative; photography from Unsplash illustrates
    the category, not the exact garment. The fit engine is real — change your profile and every
    verdict recomputes.</div>`;
}

// --------------------------------------------------------------------------
// Bottom sheets
// --------------------------------------------------------------------------

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
  const colour = TONE_COLOUR[f.code] || "var(--muted)";
  const band = (f.band && f.band[0] !== null)
    ? `<div class="band" style="left:${at(f.band[0]).toFixed(1)}%;width:${(at(f.band[1]) - at(f.band[0])).toFixed(1)}%"></div>` : "";
  return `<div class="track">${band}<div class="knob" style="left:${at(f.value).toFixed(1)}%;background:${colour}"></div></div>`;
}

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

function fitSheet(row, rv) {
  const g = GARMENTS[row.gid];
  const b = fe.badge(row.result);
  const BADGE_BG = { good: "var(--green)", warn: "var(--amber)", info: "var(--slate)", bad: "var(--red)" };

  const rows = row.result.findings.map(f => {
    const [icon, colour] = ICON[f.code];
    const val = f.code === fe.UNPUBLISHED ? "—" : `${f.value.toFixed(1)}"`;
    return `<div class="mrow"><span class="n">${f.label}</span><span class="v">${val}</span>
      ${barHTML(f)}<span class="ms" style="color:${colour}">${icon}</span></div>`;
  }).join("");

  const alt = row.alt ? `<div class="ask" style="border-color:#c9e8de;background:#f2faf7">
      <div class="t" style="color:var(--green)">Size ${row.alt.size} clears it</div>
      <div class="w">Every measurement we can check works in ${row.alt.size}.</div></div>` : "";

  // The ask only appears when a measurement the shopper can actually take is
  // what blocks this item. A dimension the brand never published is not their
  // job to fix, and pretending otherwise is the bluff this engine avoids.
  const unlock = rv.unlocks.find(u => u.items.includes(row.gid));
  const ask = unlock ? measureAsk(unlock) : "";

  const unpub = row.result.blocked.filter(f => f.code === fe.UNPUBLISHED);
  const brandGap = unpub.length ? `<div class="ask" style="border-color:var(--line);background:var(--fill)">
      <div class="t">${esc(g.brand)} doesn't publish ${esc(unpub[0].label.toLowerCase())}</div>
      <div class="w">That measurement decides this one on your body. We won't guess at it.</div></div>` : "";

  const proven = [...new Set(row.result.findings
    .map(f => fe.decidingEvidence(row.gid, f, rv.ctx))
    .filter(e => e).map(e => title(e.garment)))];

  return `<div class="handle"></div>
    <div class="shead">
      <img src="${photo(row.gid, 160, 213)}" alt="">
      <div style="flex:1">
        <div class="brand" style="font-size:14px">${esc(g.brand)}</div>
        <div class="pname">${esc(g.name)} · Size ${esc(row.size)}</div>
        <div style="margin-top:8px"><span class="pill" style="background:${BADGE_BG[b.tone]}">${b.text}</span></div>
      </div>
    </div>
    ${rows}
    ${alt}${ask}${brandGap}
    <div class="foot">${proven.length ? "Compared with " + esc(proven.slice(0, 2).join(" and ")) + "." : ""}</div>`;
}

function measureAsk(u) {
  const src = u.source;
  const why = (src.unresolved && src.unresolved.why) || "";
  return `<div class="ask">
    <div class="t">Measure your ${esc(GARMENTS[src.garment].brand)} ${esc(GARMENTS[src.garment].name)}</div>
    <div class="w">${esc(why)} Lay it flat and measure the ${esc(u.label.toLowerCase())}.
      Unlocks ${u.count} ${u.count === 1 ? "item" : "items"}.</div>
    <div class="stepper">
      <div class="box">
        <span class="ms" data-act="dec">remove</span>
        <div style="text-align:center"><b>${state.measure.toFixed(1)}</b><small>inches</small></div>
        <span class="ms" data-act="inc">add</span>
      </div>
      <button class="btn" data-act="confirm" data-g="${src.garment}" data-d="${u.dim}">Confirm</button>
    </div></div>`;
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
  const opts = Object.keys(GARMENTS).filter(g => !owned.has(g))
    .sort((a, b) => title(a).localeCompare(title(b)));
  const gid = opts[0];
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
      <div id="aerr" class="w" style="color:var(--red);font-size:12px;margin-top:8px"></div>
      <div style="margin-top:14px"><button class="btn wide" data-act="addsave">Add to my profile</button></div>
    </div>`;
}

// --------------------------------------------------------------------------
// Shell
// --------------------------------------------------------------------------

const TABS = [
  ["home", "home", "Home"], ["categories", "category", "Shop"],
  ["wishlist", "favorite", "Wishlist"], ["profile", "person", "Profile"],
];

function openSheet(html) {
  $("sheet").innerHTML = html;
  $("sheet").classList.add("open");
  $("scrim").classList.add("open");
}
function closeSheet() {
  $("sheet").classList.remove("open");
  $("scrim").classList.remove("open");
}

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:88px;left:50%;transform:translateX(-50%);
    background:#282c3f;color:#fff;padding:11px 18px;border-radius:6px;font-size:13px;
    font-weight:700;z-index:60;box-shadow:0 4px 18px rgba(22,27,45,.3);max-width:88vw;text-align:center`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function render() {
  const p = persona();
  const rv = fe.reviewWishlist(p, state.extra);
  window.__rv = rv;

  $("whoname").textContent = p.name;
  $("screen").innerHTML =
    state.page === "home" ? homeScreen(rv)
    : state.page === "categories" ? categoriesScreen()
    : state.page === "wishlist" ? wishlistScreen(rv)
    : state.page === "profile" ? profileScreen(rv)
    : fitProfileScreen(rv);

  $("nav").innerHTML = TABS.map(([k, icon, lab]) => {
    const on = k === state.page || (k === "profile" && state.page === "fitprofile");
    return `<button data-tab="${k}"><span class="ms${on ? " fill" : ""}">${icon}</span>${lab}</button>`;
  }).join("");
  [...$("nav").children].forEach((b, i) => {
    const k = TABS[i][0];
    if (k === state.page || (k === "profile" && state.page === "fitprofile")) b.classList.add("on");
  });
  $("screen").scrollTop = 0;
  window.scrollTo(0, 0);
}

function go(page) { state.page = page; render(); }

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-tab],[data-act],[data-filter],[data-item],[data-persona]");
  if (!t) return;
  const rv = window.__rv;

  if (t.dataset.tab) { closeSheet(); go(t.dataset.tab); return; }
  if (t.dataset.filter) { state.filter = t.dataset.filter; render(); return; }
  if (t.dataset.persona) { state.persona = t.dataset.persona; state.filter = "all"; closeSheet(); render(); return; }

  if (t.dataset.item) {
    const row = rv.rows.find(r => r.gid === t.dataset.item);
    if (row) openSheet(fitSheet(row, rv));
    return;
  }

  switch (t.dataset.act) {
    case "go-wishlist": go("wishlist"); break;
    case "go-fitprofile": go("fitprofile"); break;
    case "measure": openSheet(`<div class="handle"></div>
        <div style="padding:6px 16px 0"><div class="sec">One measurement</div></div>
        ${measureAsk(rv.unlocks[0])}
        <div class="foot">Measuring a garment lying flat is easier, and far more accurate,
          than measuring yourself.</div>`); break;
    case "inc": state.measure = Math.min(60, state.measure + 0.5); refreshSheet(); break;
    case "dec": state.measure = Math.max(4, state.measure - 0.5); refreshSheet(); break;
    case "confirm": {
      const before = rv.counts[fe.FITS];
      state.extra[`${t.dataset.g}|${t.dataset.d}`] = state.measure;
      closeSheet();
      const after = fe.reviewWishlist(persona(), state.extra);
      const gained = after.counts[fe.FITS] - before;
      state.page = "wishlist"; state.filter = "all";
      render();
      toast(gained > 0 ? `${gained} ${gained === 1 ? "item" : "items"} now fit you`
                       : "Wishlist updated");
      break;
    }
    case "reset": state.extra = {}; state.added = {}; closeSheet(); render(); toast("Back to the start"); break;
    case "add": openSheet(addSheet()); break;
    case "addsave": {
      const gid = $("ag").value, size = $("asz").value, verdict = $("av").value, dim = $("ad").value;
      if (verdict !== "perfect" && !dim) {
        $("aerr").textContent = "Tell us which measurement is wrong, or there's nothing to learn from.";
        return;
      }
      (state.added[state.persona] ||= []).push({
        garment: gid, size, verdict, dims: dim ? [dim] : [], note: "Added by you.",
      });
      closeSheet(); render(); toast("Added to your fit profile");
      break;
    }
  }
});

// Keep the sheet's own state in sync without rebuilding the screen behind it.
function refreshSheet() {
  const b = $("sheet").querySelector(".box b");
  if (b) b.textContent = state.measure.toFixed(1);
}

$("whobtn").addEventListener("click", () => openSheet(personaSheet()));
$("scrim").addEventListener("click", closeSheet);

// The size dropdown has to follow the garment, or you can pick a size that
// garment does not come in.
document.addEventListener("change", ev => {
  if (ev.target.id !== "ag") return;
  const g = GARMENTS[ev.target.value];
  $("asz").innerHTML = Object.keys(g.sizes).map(s => `<option>${s}</option>`).join("");
  $("ad").innerHTML = `<option value="">—</option>` + fe.CATEGORIES[g.category].critical
    .map(d => `<option value="${d}">${fe.label(d, g.category)}</option>`).join("");
});

render();
