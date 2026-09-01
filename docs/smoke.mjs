// Headless functional check: render every screen and click through the flows.
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const dom = new JSDOM(html, { url: "https://example.com/", pretendToBeVisual: true });
dom.window.scrollTo = () => {};  // jsdom does not implement it
for (const k of ["window", "document", "Node", "Element", "HTMLElement", "getComputedStyle"]) {
  globalThis[k] = k === "window" ? dom.window : dom.window[k];
}

const errors = [];
dom.window.addEventListener("error", e => errors.push(e.message));

await import("./app.js");

const $ = id => dom.window.document.getElementById(id);
const click = sel => {
  const el = dom.window.document.querySelector(sel);
  if (!el) throw new Error("no element for " + sel);
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
};
const text = () => $("screen").textContent.replace(/\s+/g, " ").trim();
const count = sel => dom.window.document.querySelectorAll(sel).length;

let fails = 0;
const check = (name, cond, extra = "") => {
  if (cond) console.log("  ok   " + name);
  else { fails++; console.log("  FAIL " + name + (extra ? "  <- " + extra : "")); }
};

console.log("screens");
check("home renders", text().includes("FIT CHECK") && count(".cat") === 6);
check("home names the anchor garment", /Your \w+ (kurta|jacket) fits you/.test(text()), text().slice(0, 90));
check("home shows no broken images", ![...dom.window.document.querySelectorAll("img")].some(i => !i.src.startsWith("https://")));

click('[data-tab="wishlist"]');
check("wishlist renders 8 cards", count(".pc") === 8, "got " + count(".pc"));
check("wishlist shows the measure strip", !!$("measure"));
check("badges present", count(".badge") === 8);

click('[data-tab="categories"]');
check("shop renders", text().includes("Shop") && count(".pc") > 4);
click('[data-tab="profile"]');
check("profile renders with fit profile card", !!$("fpcard"));
click('[data-act="go-fitprofile"]');
check("fit profile renders wardrobe", count(".wrow") === 6, "got " + count(".wrow"));
check("fit profile shows the unknown inseam", text().includes("not known yet"));

console.log("sheets");
click('[data-tab="wishlist"]');
click('.pc[data-item="w_levis_314"]');
check("fit sheet opens", $("sheet").classList.contains("open"));
check("sheet shows four measurement rows", count("#sheet .mrow") === 4, "got " + count("#sheet .mrow"));
check("inseam row has no band, only a hatched track", count("#sheet .track.void") === 1);
check("sheet carries the measurement ask", $("sheet").textContent.includes("Lay it flat"));

console.log("the measurement loop");
const before = text();
check("three items need a measure before", (before.match(/Inseam unknown/g) || []).length === 3);
click('#sheet [data-act="confirm"]');
const after = text();
check("sheet closed", !$("sheet").classList.contains("open"));
check("none need a measure after", !after.includes("Inseam unknown"), after.slice(0, 120));
check("two more items now fit", (after.match(/FITS YOU/g) || []).length === 3,
      "got " + (after.match(/FITS YOU/g) || []).length);
check("one is revealed as wrong", (after.match(/WRONG SIZE/g) || []).length === 3);

console.log("filters and personas");
click('[data-filter="wrong_size"]');
check("filter narrows the grid", count(".pc") === 3, "got " + count(".pc"));
click('[data-filter="all"]');
check("filter restores", count(".pc") === 8);

click("#whobtn");
check("persona sheet opens", $("sheet").textContent.includes("Rohan"));
click('[data-persona="rohan"]');
check("switched to rohan", $("whoname").textContent === "Rohan");
click('[data-tab="wishlist"]');
check("rohan has 7 saved items", count(".pc") === 7, "got " + count(".pc"));
check("rohan keeps his own measurement state", !text().includes("Levi's 711"));
click("#whobtn"); click('[data-act="reset"]');
click('[data-tab="wishlist"]');
check("reset restores the unmeasured state", text().includes("Inseam unknown"));

console.log("\nruntime errors: " + (errors.length ? errors.join(" | ") : "none"));
console.log(fails ? `\nFAILED ${fails}` : "\nall passed");
process.exit(fails || errors.length ? 1 : 0);
