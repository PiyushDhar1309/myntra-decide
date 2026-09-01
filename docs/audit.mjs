// In-depth audit: every screen, every control, every flow.
//
// The dead-control sweep is the important part. A prototype where a button
// looks live and does nothing is what a reviewer finds first, so every
// interactive element on every screen has to resolve to a handler.

import { JSDOM } from "jsdom";
import { readFileSync } from "fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const dom = new JSDOM(html, { url: "https://example.com/", pretendToBeVisual: true });
dom.window.scrollTo = () => {};
for (const k of ["window", "document", "Node", "Element", "HTMLElement", "getComputedStyle"]) {
  globalThis[k] = k === "window" ? dom.window : dom.window[k];
}
const errors = [];
dom.window.addEventListener("error", e => errors.push(e.message));
await import("./app.js");

const D = dom.window.document;
const $ = id => D.getElementById(id);
const q = sel => D.querySelector(sel);
const all = sel => [...D.querySelectorAll(sel)];
// Scoped to the screen on purpose: .wrow and .pc also appear inside the bottom
// sheet, which keeps its markup after closing so it can animate out.
const n = sel => D.querySelectorAll("#screen " + sel).length;
const txt = () => $("screen").textContent.replace(/\s+/g, " ").trim();
const click = sel => {
  const el = typeof sel === "string" ? q(sel) : sel;
  if (!el) throw new Error("missing element: " + sel);
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
};

let fails = 0, checks = 0;
const check = (name, cond, extra = "") => {
  checks++;
  if (cond) console.log("  ok   " + name);
  else { fails++; console.log("  FAIL " + name + (extra ? "   <- " + extra : "")); }
};
const head = s => console.log("\n" + s);

// Attributes the delegated click handler actually responds to.
const HANDLED = ["data-tab", "data-act", "data-filter", "data-open", "data-persona",
                 "data-cat", "data-size", "data-save", "data-unsave", "data-debag"];
const INTERACTIVE = ".cat,.pc,.railcard,.arow,.szchip,.chip,.heart,#fitcard,#fpcard,.banner,.banner2";

function deadControls(where) {
  const suspects = [...D.querySelectorAll("#screen button, #screen " + INTERACTIVE.split(",").join(", #screen "))];
  return suspects.filter(el => {
    if (el.id === "whobtn" || el.id === "searchfield") return false;
    for (let e = el; e && e !== D.body; e = e.parentElement) {
      if (HANDLED.some(a => e.hasAttribute(a))) return false;
    }
    return true;
  }).map(el => (el.className || el.tagName) + ':"' + el.textContent.trim().slice(0, 22) + '"');
}

function sweep(where) {
  const dead = deadControls(where);
  check(`${where}: no dead controls`, dead.length === 0, dead.join(" | "));
  check(`${where}: carries the prototype disclaimer`, txt().includes("Prototype for a product case study"));
  const bare = all("#screen .pc img, #screen .railcard img").filter(i => !i.closest(".shot")).length;
  check(`${where}: every product image is width-constrained`, bare === 0, bare + " bare");
  const broken = all("#screen img").filter(i => !i.src.startsWith("https://")).length;
  check(`${where}: no broken image sources`, broken === 0, broken + " broken");
}

// ---------------------------------------------------------------------------
head("HOME");
check("renders", txt().includes("FIT CHECK") && n(".cat") === 6);
check("closed sheet is hidden from assistive tech", $("sheet").getAttribute("aria-hidden") === "true" || !$("sheet").innerHTML.trim());
check("names the anchor garment", /Your \w+ (kurta|jacket) fits you/.test(txt()));
check("does not recommend what she already owns",
      !all("#screen .pname").some(e => e.textContent === "Cotton Anarkali Kurta"));
check("prototype badge is visible in the header", $("topbar").textContent.includes("PROTOTYPE"));
sweep("home");

head("SHOP + CATEGORY FILTER");
click('[data-tab="categories"]');
const shopAll = n(".pc");
check("shop lists products", shopAll > 4, "got " + shopAll);
check("count matches the grid", txt().includes(shopAll + " items"));
click('.chip[data-cat="jeans"]');
check("category filter narrows the grid", n(".pc") > 0 && n(".pc") < shopAll, `${n(".pc")} of ${shopAll}`);
check("only jeans remain", all("#screen .pname").every(e => /Jean/i.test(e.textContent)),
      all("#screen .pname").map(e => e.textContent).join(", "));
click('.chip[data-cat=""]');
check("filter clears", n(".pc") === shopAll);
sweep("shop");

head("PRODUCT PAGE");
click('[data-tab="home"]');
click('.cat[data-cat="kurta"]');
check("a category circle lands on shop, filtered", txt().includes("Shop"));
click('[data-tab="categories"]'); click('.chip[data-cat=""]');
const firstCard = q("#screen .pc");
const firstName = firstCard.querySelector(".pname").textContent;
click(firstCard);
check("tapping a card opens the product page", !!q(".pdphero"), txt().slice(0, 60));
check("product page shows that product", txt().includes(firstName));
check("shows size selector", n(".szchip") > 0);
check("shows a fit verdict", !!q(".fitbox .pill"));
check("shows measurement rows", n(".fitbox .mrow") > 0);
check("shows garment measurements", txt().includes("Garment measurements"));
check("shows composition", txt().includes("Composition"));
check("has wishlist and bag actions", n(".ctabar button") === 2);
check("bottom tab bar is hidden on the product page", $("nav").style.display === "none");
check("has a back arrow", !!q('[data-act="back"]'));
sweep("product");

head("PRODUCT: SIZE CHANGES THE VERDICT");
click('[data-tab="wishlist"]');
click('.pc[data-open="w_zara_midi"]');
const sizeS = q(".fitbox .pill").textContent.trim();
check("size S on the Zara dress is refused", sizeS === "WRONG SIZE", sizeS);
click('.szchip[data-size="M"]');
const sizeM = q(".fitbox .pill").textContent.trim();
check("size M is not", sizeM !== "WRONG SIZE", sizeM);
check("each size chip carries its own verdict dot", n(".szchip i") === 2);

head("WISHLIST");
click('[data-act="back"]');
check("back returns to the wishlist", txt().includes("Wishlist"));
check("8 saved items", n(".pc") === 8, "got " + n(".pc"));
check("every card has a badge", n(".badge") === 8);
click('[data-filter="wrong_size"]');
check("filter narrows", n(".pc") === 2, "got " + n(".pc"));
click('[data-filter="all"]');
sweep("wishlist");

head("SAVE AND UNSAVE");
click('[data-tab="categories"]'); click('.chip[data-cat=""]');
const target = q("#screen .pc").dataset.open;
click(`.pc[data-open="${target}"] .heart`);
check("hearting from shop does not open the product", !q(".pdphero"));
click('[data-tab="wishlist"]');
check("the saved item joins the wishlist", n(".pc") === 9, "got " + n(".pc"));
check("and Fit Check judged it", !!q(`.pc[data-open="${target}"] .badge`));
click(`.pc[data-open="${target}"] .heart`);
check("un-hearting removes it", n(".pc") === 8, "got " + n(".pc"));
click('.pc[data-open="w_levis_314"] .heart');
check("a seeded item can be removed too", n(".pc") === 7, "got " + n(".pc"));
click('[data-tab="categories"]'); click('.chip[data-cat=""]');
click('.pc[data-open="w_levis_314"] .heart');
click('[data-tab="wishlist"]');
check("and put back", n(".pc") === 8, "got " + n(".pc"));

head("BAG");
click('.pc[data-open="w_libas_anarkali"]');
click('[data-act="bag"]');
check("bag badge appears in the header", $("topbar").textContent.includes("1"));
click('[data-act="bagpage"]');
check("bag lists the item", txt().includes("Libas"));
check("bag shows a total", txt().includes("Total"));
check("checkout is declared out of scope", txt().includes("not part of this prototype"));
sweep("bag");
click("[data-debag]");
check("removing from the bag empties it", txt().includes("Your bag is empty"));

head("SEARCH");
click('[data-act="search"]');
check("search opens with a prompt", txt().includes("Search for a brand"));
const f = $("searchfield");
f.value = "levi";
f.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
check("typing finds matches", n(".pc") >= 2, "got " + n(".pc"));
check("results are relevant", all("#screen .brand").every(e => /Levi/i.test(e.textContent)),
      all("#screen .brand").map(e => e.textContent).join(", "));
f.value = "zzzz";
f.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
check("no matches is handled", txt().includes("Nothing matches"));

head("PROFILE AND ORDERS");
click('[data-tab="profile"]');
check("profile renders", !!q("#screen #fpcard"));
check("no invented personal data", !/\+91|@|\d{10}/.test(txt()), txt().slice(0, 120));
check("tiles reflect real state", txt().includes("6") && txt().includes("8"));
sweep("profile");
click('[data-act="orders"]');
check("orders opens", txt().includes("Orders"));
check("orders shows kept and returned", txt().includes("kept") && txt().includes("Returned"));
check("orders explains the link to the fit profile", txt().includes("fit profile comes from"));
sweep("orders");
click('[data-act="back"]');
click('[data-act="go-fitprofile"]');
check("fit profile opens", n(".wrow") === 6, "got " + n(".wrow"));
check("shows the unknown inseam", txt().includes("not known yet"));
sweep("fit profile");

head("THE MEASUREMENT LOOP");
click('[data-tab="wishlist"]');
check("three items need a measure", (txt().match(/Inseam unknown/g) || []).length === 3);
click('[data-act="measure"]');
check("the ask names a garment she owns", $("sheet").textContent.includes("711"));
click('#sheet [data-act="inc"]');
check("stepper increments", $("sheet").textContent.includes("31.0"));
click('#sheet [data-act="dec"]');
click('#sheet [data-act="confirm"]');
check("sheet closed", !$("sheet").classList.contains("open"));
check("nothing is waiting on a measurement", !txt().includes("Inseam unknown"));
check("two more items now fit", (txt().match(/FITS YOU/g) || []).length === 3,
      "got " + (txt().match(/FITS YOU/g) || []).length);
check("one is exposed as the wrong size", (txt().match(/WRONG SIZE/g) || []).length === 3);
check("the measure strip is gone", !q("#screen #measure"));

head("ADD A GARMENT");
click('[data-tab="profile"]'); click('[data-act="go-fitprofile"]');
click('[data-act="add"]');
$("av").value = "tight";
click('#sheet [data-act="addsave"]');
check("a complaint with no dimension is rejected", $("aerr").textContent.length > 10);
$("ad").value = "chest";
click('#sheet [data-act="addsave"]');
check("a valid garment is added", n(".wrow") === 7, "got " + n(".wrow"));

head("PERSONAS AND RESET");
click("#whobtn");
click('[data-persona="rohan"]');
check("switches shopper", $("topbar").textContent.includes("Rohan"));
click('[data-tab="wishlist"]');
check("rohan has his own 7 items", n(".pc") === 7, "got " + n(".pc"));
check("and none of ananya's edits", txt().includes("Inseam unknown"));
click("#whobtn"); click('[data-persona="ananya"]');
click('[data-tab="wishlist"]');
check("ananya's measurement survived the round trip", !txt().includes("Inseam unknown"));
click("#whobtn"); click('[data-act="reset"]');
click('[data-tab="wishlist"]');
check("reset restores the seeded state", txt().includes("Inseam unknown") && n(".pc") === 8);
click('[data-tab="profile"]'); click('[data-act="go-fitprofile"]');
check("reset also drops added garments", n(".wrow") === 6, "got " + n(".wrow"));

head("EDGE CASES A REVIEWER WILL TRY");
// Open a wardrobe garment, which is sold in exactly one size.
click('[data-tab="profile"]'); click('[data-act="go-fitprofile"]');
click('#screen .wrow');
check("a single-size garment opens cleanly", !!q(".pdphero") && n(".szchip") === 1,
      n(".szchip") + " size chips");
check("and still gets a verdict", !!q(".fitbox .pill"));
click('[data-act="back"]');

// Strip the wishlist bare.
click('[data-tab="wishlist"]');
let guard = 0;
while (n(".pc") > 0 && guard++ < 20) click("#screen .pc .heart");
check("the wishlist can be emptied", n(".pc") === 0, "got " + n(".pc"));
check("empty wishlist explains itself", txt().includes("Nothing saved yet"));
check("no measure strip with nothing saved", !q("#screen #measure"));
click('[data-tab="home"]');
check("home survives an empty wishlist", !q("#fitcard") && txt().includes("SALE"));
sweep("home with an empty wishlist");
click('[data-tab="profile"]');
check("profile counts drop to zero", txt().includes("0"));

// And build it back up.
click('[data-tab="categories"]'); click('.chip[data-cat=""]');
click("#screen .pc .heart");
click('[data-tab="wishlist"]');
check("saving again brings the wishlist back", n(".pc") === 1, "got " + n(".pc"));
check("and the fit card returns home", (click('[data-tab="home"]'), !!q("#fitcard")));
click("#whobtn"); click('[data-act="reset"]');

head("REVIEWER SAFETY");
const pages = ["home", "categories", "wishlist", "profile"];
for (const pg of pages) {
  click(`[data-tab="${pg}"]`);
  check(`${pg}: no star ratings or review counts invented`,
        !/★|\d\.\d\s*★|\d+k? ratings|\d+ reviews/i.test(txt()));
}
click('[data-tab="home"]');
check("decorative banners say so rather than doing nothing", !!q('.banner[data-act="soon"]'));
click(".banner");
check("and they tell the user", !!q(".toast"), "no toast");

console.log("\nruntime errors: " + (errors.length ? errors.join(" | ") : "none"));
console.log(`\n${checks - fails}/${checks} checks passed` + (fails ? ` — ${fails} FAILED` : ""));
process.exit(fails || errors.length ? 1 : 0);
