// Visual and geometric UI audit across engines and devices.
//
// jsdom cannot lay anything out, so the existing suite proves behaviour but says
// nothing about whether things overlap. This drives real engines - Chromium for
// Android, WebKit for iOS Safari - measures actual boxes, and writes screenshots.

import { chromium, webkit, devices } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/private/tmp/claude-502/-Users-piyush-MVP/8d14c251-deda-4580-a12f-db40305c4b94/scratchpad/shots";
mkdirSync(OUT, { recursive: true });

const URL = process.env.TARGET || "http://localhost:8123/";

// WebKit is Safari's engine, so it is the only way to catch iOS-specific bugs
// from a desktop. Where it will not start we still measure at the iPhone
// viewport under Chromium - that finds geometry bugs but not engine ones, and
// the run says so rather than implying iOS was covered.
async function iosEngine() {
  if (process.env.NO_WEBKIT) return { engine: chromium, real: false, why: "NO_WEBKIT set" };
  try {
    const b = await webkit.launch({ timeout: 30000 });
    await b.close();
    return { engine: webkit, real: true };
  } catch (e) {
    return { engine: chromium, real: false, why: e.message.split("\n")[0] };
  }
}

const ios = await iosEngine();
if (!ios.real) {
  console.log("\n!! Safari's engine is unavailable — " + ios.why);
  console.log("!! The iOS rows below are Chromium at an iPhone viewport. They catch layout and");
  console.log("!! overflow bugs, but NOT WebKit-specific ones. Verify on a real device.\n");
}
const RIGS = [
  { name: ios.real ? "ios (webkit)" : "ios (chromium at iPhone size)", engine: ios.engine,
    device: devices["iPhone 13"] },
  { name: "android", engine: chromium, device: devices["Pixel 5"] },
];

// Each stop: a label, the clicks to get there, and a moment to settle.
const STOPS = [
  { id: "home",     steps: [] },
  { id: "wishlist", steps: ['[data-tab="wishlist"]'] },
  { id: "compare",  steps: ['[data-tab="wishlist"]', "[data-cmpsub]"] },
  { id: "picked",   steps: ['[data-tab="wishlist"]', "[data-cmpsub]", ".pickbtn", ".pickbtn:not(.on)"] },
  { id: "product",  steps: ['[data-tab="shop"]', "#screen .pc"] },
  { id: "bag",      steps: ['[data-act="bagpage"]'] },
  { id: "profile",  steps: ['[data-tab="profile"]'] },
  { id: "sheet",    steps: ['[data-tab="wishlist"]', "#screen .cardmenu"] },
];

// Measured in the page: things that are wrong regardless of taste.
const PROBE = () => {
  const out = { overflowX: 0, offFrame: [], overlaps: [], clipped: [], tiny: [], iconText: [] };
  const doc = document.documentElement;
  out.overflowX = doc.scrollWidth - doc.clientWidth;

  const frame = document.getElementById("frame");
  const fr = frame.getBoundingClientRect();

  const vis = el => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  // Anything sticking out of the phone frame horizontally, ignoring what lives
  // inside a deliberate horizontal scroller.
  const inScroller = el => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const ox = getComputedStyle(e).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("#screen *, #sheet *")) {
    if (!vis(el) || inScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > fr.right + 1 || r.left < fr.left - 1) {
      out.offFrame.push({ sel: el.className || el.tagName,
        left: Math.round(r.left - fr.left), right: Math.round(r.right - fr.right) });
    }
  }

  // Fixed bars covering content that should be reachable.
  // A fixed bar always covers whatever is behind it mid-scroll; that is not a
  // bug. What matters is content still hidden once you have scrolled as far as
  // the page goes.
  const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 2;
  const sheetUp = document.getElementById("scrim").classList.contains("open");
  if (atBottom && !sheetUp) {
    const bars = [...document.querySelectorAll("#nav,.ctabar,.cmpbar,.pickbar,.selbar")].filter(vis);
    const cards = [...document.querySelectorAll("#screen .pc,#screen .orow,.srow,#screen .btn")].filter(vis);
    for (const bar of bars) {
      const b = bar.getBoundingClientRect();
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        const overlap = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
        if (overlap > 4) out.overlaps.push({ bar: bar.className || bar.id,
          hit: (c.className || c.tagName).slice(0, 28), px: Math.round(overlap) });
      }
    }
  }

  // Siblings inside one row sitting on top of each other - the class of bug that
  // put the suggestion buttons over its thumbnails.
  for (const row of document.querySelectorAll("#screen .row,#screen .acts,.wbar,.selbar .n,#sheet .srow")) {
    const kids = [...row.children].filter(vis);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b2 = kids[j].getBoundingClientRect();
      const ox = Math.min(a.right, b2.right) - Math.max(a.left, b2.left);
      const oy = Math.min(a.bottom, b2.bottom) - Math.max(a.top, b2.top);
      if (ox > 3 && oy > 3) out.overlaps.push({ bar: "siblings in " + (row.className || row.tagName),
        hit: (kids[j].className || kids[j].tagName).slice(0, 24), px: Math.round(ox) });
    }
  }

  // Text cut off by its own box.
  for (const el of document.querySelectorAll("#screen .brand,#screen .pname,.szchip,.chip,.btn,.pickbtn,#nav button")) {
    if (!vis(el)) continue;
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).textOverflow !== "ellipsis") {
      out.clipped.push({ sel: el.className, text: el.textContent.trim().slice(0, 26),
        over: el.scrollWidth - el.clientWidth });
    }
  }

  // Tap targets too small to hit reliably.
  for (const el of document.querySelectorAll("button,[data-act],[data-tab],[data-pick]")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 28 || r.width < 28) {
      out.tiny.push({ sel: (el.className || el.tagName).slice(0, 24),
        w: Math.round(r.width), h: Math.round(r.height), text: el.textContent.trim().slice(0, 18) });
    }
  }

  // Icon font failing shows the ligature name as words - which makes the glyph
  // far wider than its own font-size. Measure the text, not the box.
  for (const el of document.querySelectorAll(".ms")) {
    if (!vis(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    const range = document.createRange();
    range.selectNodeContents(el);
    const w = range.getBoundingClientRect().width;
    if (w > fs * 2.2) out.iconText.push(`${el.textContent.trim().slice(0, 18)} (${Math.round(w)}px)`);
  }
  return out;
};

const dedupe = a => [...new Map(a.map(x => [JSON.stringify(x), x])).values()];

for (const rig of RIGS) {
  const browser = await rig.engine.launch();
  const ctx = await browser.newContext({ ...rig.device });
  const page = await ctx.newPage();
  console.log("\n" + "=".repeat(64) + "\n" + rig.name.toUpperCase()
    + `  (${rig.device.viewport.width}×${rig.device.viewport.height})`);

  for (const stop of STOPS) {
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    for (const sel of stop.steps) {
      const el = page.locator(sel).first();
      if (await el.count()) { await el.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(220); }
    }
    await page.waitForTimeout(350);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${rig.name}-${stop.id}.png`, fullPage: false });

    const r = await page.evaluate(PROBE);
    const bits = [];
    if (r.overflowX > 1) bits.push(`H-SCROLL +${r.overflowX}px`);
    if (r.offFrame.length) bits.push(`OFF-FRAME ${dedupe(r.offFrame).length}`);
    if (r.overlaps.length) bits.push(`COVERED ${dedupe(r.overlaps).length}`);
    if (r.clipped.length) bits.push(`CLIPPED ${dedupe(r.clipped).length}`);
    if (r.tiny.length) bits.push(`TINY-TAP ${dedupe(r.tiny).length}`);
    if (r.iconText.length) bits.push(`ICON-FONT-FAIL ${r.iconText.length}`);
    console.log(`  ${stop.id.padEnd(9)} ${bits.length ? bits.join(" · ") : "clean"}`);
    for (const o of dedupe(r.offFrame).slice(0, 3)) console.log(`      off-frame: ${o.sel} (right +${o.right}px)`);
    for (const o of dedupe(r.overlaps).slice(0, 3)) console.log(`      ${o.bar} covers ${o.hit} by ${o.px}px`);
    for (const o of dedupe(r.clipped).slice(0, 3)) console.log(`      clipped: "${o.text}" by ${o.over}px`);
    for (const o of dedupe(r.tiny).slice(0, 3)) console.log(`      small tap: ${o.sel} ${o.w}×${o.h} "${o.text}"`);
    if (r.iconText.length) console.log(`      icons rendering as text: ${r.iconText.slice(0, 3).join(", ")}`);
  }
  await browser.close();
}
console.log("\nshots in " + OUT);
