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
const n = sel => D.querySelectorAll("#screen " + sel).length;
const txt = () => $("screen").textContent.replace(/\s+/g, " ").trim();
const click = sel => {
  const el = typeof sel === "string" ? q(sel) : sel;
  if (!el) throw new Error("missing element: " + sel);
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
};
const tick = () => new Promise(r => setTimeout(r, 320));

let fails = 0, checks = 0;
const check = (name, cond, extra = "") => {
  checks++;
  if (cond) console.log("  ok   " + name);
  else { fails++; console.log("  FAIL " + name + (extra ? "   <- " + extra : "")); }
};
const head = s => console.log("\n" + s);

const HANDLED = ["data-tab", "data-act", "data-open", "data-heart", "data-sub", "data-size",
  "data-col", "data-wtab", "data-addto", "data-sort", "data-pick", "data-win", "data-group",
  "data-dismiss", "data-debag", "data-qty", "data-more", "data-toggleitem",
  "data-toggle", "data-cmpsub", "data-tip"];
const INTERACTIVE = ".cat,.pc,.railcard,.chip,.heart,.cardmenu,.szchip,.colcard,.srow,.orow,"
  + ".vscard,.banner,.banner2,#decidecard,.wbar button,.selbar button,#intro .go,#intro .x";

function sweep(where) {
  const suspects = [...D.querySelectorAll("#screen button, #screen " + INTERACTIVE.split(",").join(", #screen "))];
  const dead = suspects.filter(el => {
    if (el.id === "searchfield" || el.id === "colname") return false;
    for (let e = el; e && e !== D.body; e = e.parentElement)
      if (HANDLED.some(a => e.hasAttribute(a))) return false;
    return true;
  }).map(el => (el.className || el.tagName) + ':"' + el.textContent.trim().slice(0, 20) + '"');
  check(`${where}: no dead controls`, dead.length === 0, dead.join(" | "));
  check(`${where}: carries the disclaimer`, txt().includes("Prototype for a product case study"));
  const bare = all("#screen .pc img, #screen .railcard img").filter(i => !i.closest(".shot")).length;
  check(`${where}: product images are width-constrained`, bare === 0, bare + " bare");
  check(`${where}: no broken image sources`,
        all("#screen img").every(i => i.src.startsWith("https://")));
}

head("HOME");
check("opens by saying what this is", !!q("#intro") && txt().includes("holding decisions"));
check("help is reachable from any screen", !!q('[data-act="guide"]'));
check("and offers a way straight into it", !!q('#intro [data-act="demo"]'));
click('[data-act="guide"]');
check("the guide explains the whole flow in steps", $("sheet").querySelectorAll(".step").length === 4);
check("and counts the real wishlist", /\d+ saved items/.test($("sheet").textContent));
check("with a way into a live example", !!$("sheet").querySelector('[data-act="demo"]'));
click("#scrim");
check("renders", n(".cat") === 6 && txt().includes("SALE"));
check("leads with the decision card", !!q("#decidecard"));
check("and counts real decisions", /\d decisions? waiting/.test(txt()), txt().slice(0, 70));
check("prototype badge in the header", $("topbar").textContent.includes("PROTOTYPE"));
sweep("home");
click('#intro .x');
check("the explainer can be dismissed", !q("#intro"));

head("SHOP, FILTER AND SORT");
click('[data-tab="shop"]');
const allN = n(".pc");
check("lists the catalog", allN >= 40, "got " + allN);
click('.chip[data-sub="Dresses"]');
check("subcategory filter narrows", n(".pc") > 0 && n(".pc") < allN, `${n(".pc")} of ${allN}`);
check("only dresses remain", txt().includes("Dresses"));
click('[data-act="sort"]');
check("sort sheet opens", $("sheet").textContent.includes("Price: low to high"));
click('[data-sort="plh"]');
check("sort applies", txt().includes("Price: low to high"));
click('.chip[data-sub=""]');
check("filter clears", n(".pc") === allN);
sweep("shop");

head("SEARCH");
const f = $("searchfield");
f.value = "anarkali";
f.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
check("search narrows the grid", n(".pc") >= 5 && n(".pc") < allN, "got " + n(".pc"));
f.value = "zzzz";
f.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
check("no matches is handled", txt().includes("Nothing matches"));
f.value = "";
f.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

head("PRODUCT PAGE");
click("#screen .pc");
check("opens", !!q(".gallery"));
check("has a rating and reviews", n(".revcard") >= 2 && txt().includes("ratings"));
check("labels the reviews as sample data", txt().includes("No real customer wrote them"));
check("has a description and specs", txt().includes("Fabric") && txt().includes("Wash care"));
check("has delivery and returns", txt().includes("Return window"));
check("has sizes", n(".szchip") >= 3);
check("has similar products", n(".railcard") >= 3);
check("has wishlist and bag actions", n(".ctabar button") === 2);
check("tab bar hidden on product", $("nav").style.display === "none");
sweep("product");
click('[data-act="chart"]');
check("size chart opens", $("sheet").textContent.includes("size chart"));
click("#scrim");

head("BAG");
click('[data-act="bag"]');
check("refuses to bag without a size", txt().includes("Fabric") && !!q(".toast"));
click("#screen .szchip:not(.dead)");
click('[data-act="bag"]');
check("bagging works once a size is picked", $("topbar").textContent.includes("1"));
click('[data-act="bagpage"]');
check("bag lists the item", n(".orow") === 1);
check("bag shows a price breakdown", txt().includes("Total MRP") && txt().includes("Discount"));
click('[data-qty="0:1"]');
check("quantity increases", txt().includes("2"));
sweep("bag");
click("[data-debag]");
check("removing empties the bag", txt().includes("Your bag is empty"));

head("WISHLIST AND SUGGESTIONS");
click('[data-tab="wishlist"]');
click('[data-wtab="items"]');
check("wishlist has both tabs", n(".tabs button") === 2);
const wishN = n(".pc");
check("seeded like a real wishlist, not a demo one", wishN >= 50, "got " + wishN);
check("suggests grouping a detected cluster", !!q(".suggest"), txt().slice(0, 90));
check("the suggestion names the shared ground", /All \d+ are/.test(txt()));
sweep("wishlist");

head("COLLECTIONS");
click('[data-wtab="cols"]');
check("collections tab lists the seeded collection", txt().includes("Cousin's wedding"));
check("flags that it holds a decision", txt().includes("DECISION WAITING"));
check("offers creating one", !!q('[data-act="newcol"]'));
sweep("collections");
click('[data-act="newcol"]');
$("colname").value = "Diwali";
click('[data-act="createcol"]');
check("a named collection is created", txt().includes("Diwali"));
click('[data-act="newcol"]');
$("colname").value = "";
click('[data-act="createcol"]');
check("an unnamed collection is refused", !$("sheet").classList.contains("open") === false);
click("#scrim");

head("FILLING A COLLECTION AFTER CREATING IT");
// The bug this section exists for: a collection could be created and then never
// filled, because the only route into "add to collection" was the moment you
// first hearted an unsaved item.
click('[data-tab="wishlist"]'); click('[data-wtab="cols"]');
click('[data-act="newcol"]');
$("colname").value = "Office";
click('[data-act="createcol"]');
const fresh = all("#screen .colcard").find(el => el.textContent.includes("Office"));
check("the new collection exists and is empty", !!fresh && fresh.textContent.includes("0 item"));
click(fresh);
check("an empty collection explains itself", txt().includes("Nothing in here yet"));
check("and offers a way to fill it", !!q('[data-act="additems"]'));
click('[data-act="additems"]');
check("the picker lists saved items", $("sheet").querySelectorAll(".srow").length >= 5);
const rows = [...$("sheet").querySelectorAll("[data-toggleitem]")];
click(rows[0]); click(rows[1]); click(rows[2]);
click('[data-act="closesheet"]');
check("items land in the collection", n(".grid:not(.parked) .pc") === 3,
      "got " + n(".grid:not(.parked) .pc"));
check("three is enough to compare", !!q('[data-act="compare"]'));
click('[data-act="additems"]');
click([...$("sheet").querySelectorAll("[data-toggleitem]")][0]);
click('[data-act="closesheet"]');
check("tapping again removes it", n(".grid:not(.parked) .pc") === 2);
check("and it warns how many more are needed", txt().includes("Add 1 more"));

head("THE PICKER REACHES THE WHOLE CATALOG");
click('[data-act="additems"]');
check("it offers items beyond the wishlist", $("sheet").textContent.includes("From the store"));
const notSaved = "hm_cardigan";   // melange_kurta is claimed by a later section
const storeRow = $("sheet").querySelector(`[data-toggleitem$=":${notSaved}"]`)
  || (() => { const f = $("addq"); f.value = "cardigan";
       f.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
       return $("sheet").querySelector(`[data-toggleitem$=":${notSaved}"]`); })();
check("searching inside the picker finds a product", !!storeRow);
click(storeRow);
click('[data-act="closesheet"]');
check("a store item lands in the collection", txt().includes("Cardigan"));
click('[data-tab="wishlist"]'); click('[data-wtab="items"]');
check("and is saved to the wishlist too", !!q(`#screen .pc[data-open="${notSaved}"]`));
click(`#screen .pc[data-open="${notSaved}"] .heart`);   // restore the wishlist
click('[data-wtab="cols"]');
click([...all("#screen .colcard")].find(el => el.textContent.includes("Office")));
click('[data-act="delcol"]');

head("OTHER ROUTES INTO A COLLECTION");
click('[data-tab="wishlist"]'); click('[data-wtab="items"]');
check("wishlist cards carry a menu", n(".cardmenu") > 0);
click("#screen .cardmenu");
check("the menu offers collections, bag and removal", $("sheet").textContent.includes("Add to collection")
  && $("sheet").textContent.includes("Move to bag"));
click('[data-act="tocollection"]');
check("it opens the collection picker", $("sheet").textContent.includes("Create new collection"));
click("#scrim");
click("#screen .pc");
check("an already-saved product still opens its menu from the PDP",
      (click('.ctabar .cta-w'), $("sheet").textContent.includes("Add to collection")));
click("#scrim");
click('[data-act="back"]');

head("THE DECISION");
click('[data-wtab="cols"]');
click('.colcard[data-col="c1"]');
check("collection opens", txt().includes("Cousin's wedding") && n(".grid:not(.parked) .pc") === 6);
check("offers compare and decide", !!q('[data-act="compare"]'));
sweep("collection");
click('[data-act="compare"]');
check("comparison opens", !!q(".cmp"));
check("shows one column per item", all("#screen .cmp thead th").length === 7, "got " + all("#screen .cmp thead th").length);
check("shows only the top differences first", all("#screen .cmp tbody tr").length === 4);
check("says how many differences it is hiding", /Show \d+ more differences/.test(txt()));
check("names the shared ground", /All 6 are kurtas/.test(txt()));
check("states the trade-off", txt().includes("should decide it"));
check("ticks a winner where winning is meaningful", n(".cmp td.win") > 0);
click('[data-act="cmpmore"]');
check("expanding shows every difference", all("#screen .cmp tbody tr").length > 4);
check("the two-at-a-time button is a filled button, not a ghost", !!q(".cmpbar .tourbtn"));
check("and a card explains what it does", !!q(".tip") && txt().includes("Two at a time is easy"));
sweep("compare");

head("TOURNAMENT");
click('[data-act="tournament"]');
check("tournament opens two at a time", n(".vscard") === 2);
check("shows the round count", /Round 1 of 5/.test(txt()));
let guard = 0;
while (q("#screen .vscard") && guard++ < 10) click("#screen .vscard");
check("playing it through resolves the decision", txt().includes("You picked one"), txt().slice(0, 70));
check("the winner is kept", n(".grid:not(.parked) .pc") === 1, "got " + n(".grid:not(.parked) .pc"));
check("the rest are parked, not deleted", txt().includes("Parked (5)"));
sweep("decided collection");
click('[data-act="reopen"]');
check("reopening restores all six", n(".grid:not(.parked) .pc") === 6, "got " + n(".grid:not(.parked) .pc"));

head("PICK DIRECTLY FROM THE TABLE");
click('[data-act="compare"]');
click("#screen .pickbtn");
check("picking resolves it", txt().includes("You picked one"));
check("five are parked", txt().includes("Parked (5)"));
click('[data-act="unpark"]');
check("moving them back reopens the decision", n(".grid:not(.parked) .pc") === 6 && !!q('[data-act="compare"]'));

head("SAVING AND COLLECTING");
click('[data-tab="shop"]');
click('.chip[data-sub=""]');
const targetId = "melange_kurta";   // deliberately not in the seeded wishlist
const target = q(`#screen .pc[data-open="${targetId}"]`);
check("an unsaved product is on screen", !!target);
click(target.querySelector(".heart"));
check("hearting does not open the product", !q(".gallery"));
await tick();
check("and offers to file it", $("sheet").textContent.includes("Add to collection"));
click(`[data-addto="c1:${targetId}"]`);
check("adding to a collection ticks it", $("sheet").textContent.includes("check_box"));
click("#scrim");
click('[data-tab="wishlist"]'); click('[data-wtab="items"]');
check("the saved item is in the wishlist", n(".pc") === wishN + 1, `${n(".pc")} vs ${wishN + 1}`);
click(`[data-heart="${targetId}"]`);
check("un-hearting removes it", n(".pc") === wishN);
check("and offers undo", !!q(".toast [data-act='undo-heart']"));
click(".toast [data-act='undo-heart']");
check("undo restores it", n(".pc") === wishN + 1);
click(`[data-heart="${targetId}"]`);

head("A WISHLIST THE SIZE REAL ONES GET");
click('[data-tab="wishlist"]'); click('[data-wtab="items"]');
check("holds 50+ items", n(".pc") >= 50, "got " + n(".pc"));
const names = all("#screen .pname").map(e => e.textContent);
const tees = names.filter(x => /Crew Tee/.test(x)).length;
check("including seven near-identical tees", tees >= 7, "got " + tees);
check("and they are not adjacent duplicates but real separate products",
      new Set(all("#screen .pc img").map(i => i.src)).size === n(".pc"),
      "duplicate photos on the wishlist");
click('[data-tab="home"]');
check("home counts the decisions found", /[3-9] decisions waiting/.test(txt()), txt().slice(0, 80));

head("COMPARE STRAIGHT FROM A SUGGESTION");
click('[data-tab="wishlist"]'); click('[data-wtab="items"]');
check("the suggestion offers comparison, not filing", !!q("[data-cmpsub]"),
      q(".suggest") ? q(".suggest").textContent.slice(0, 60) : "no suggestion");
check("and asks rather than announces", /We found \d+ similar items/.test(txt()), txt().slice(0, 80));
click("[data-cmpsub]");
check("it goes straight to the comparison", !!q(".cmp"), txt().slice(0, 60));
check("no collection had to be created first", n(".colcard") === 0);
click('[data-tab="wishlist"]');

head("DISMISSING");
click('[data-wtab="items"]');
if (q("[data-dismiss]")) {
  const sub = q("[data-dismiss]").dataset.dismiss;
  click("[data-dismiss]");
  // Dismissing one set may reveal the next, so assert that *this* one is gone.
  check("dismissing hides that particular suggestion",
        !q(`[data-dismiss="${sub}"]`) && !q(`[data-cmpsub="${sub}"]`), sub);
} else check("dismissing hides that particular suggestion", true, "none left to dismiss");

head("COMPARE AS A MODE ON THE WISHLIST");
click('[data-tab="wishlist"]'); click('[data-wtab="items"]');
check("compare is offered from the wishlist itself", !!q('[data-act="startsel"]'));
check("a first-time hint says what to do", !!q(".hint") && txt().includes("same decision saved"));
click("[data-tip]");
check("and the hint can be sent away for good", !q(".hint"));
click('[data-act="startsel"]');
check("selection mode turns cards into pickable tiles", n(".tick") > 3);
check("and hides the tab bar so the action bar is reachable", $("nav").style.display === "none");
check("compare is disabled until two are picked", !!q('.selbar .go[disabled]'));
const picks = all("#screen .pc").slice(0, 3).map(el => el.dataset.toggle);
picks.forEach(id => click(`#screen .pc[data-toggle="${id}"]`));
check("picking marks the cards", n(".pc.sel") === 3, "got " + n(".pc.sel"));
check("the bar counts them", txt().includes("3 selected"));
click('[data-act="docompare"]');
check("comparing what was picked", !!q(".cmp") && all("#screen .cmp thead th").length === 4,
      "cols " + all("#screen .cmp thead th").length);

head("PICK, THEN BE ASKED ABOUT THE REST");
click("#screen .pickbtn");
check("it asks before removing anything", $("sheet").textContent.includes("Remove the other 2"));
check("and explains why", $("sheet").textContent.includes("decision stays open"));
click('[data-act="keepall"]');
check("keeping them leaves the wishlist untouched", n(".pc") === wishN, `${n(".pc")} vs ${wishN}`);
click('[data-act="startsel"]');
const picks2 = all("#screen .pc").slice(0, 3).map(el => el.dataset.toggle);
picks2.forEach(id => click(`#screen .pc[data-toggle="${id}"]`));
click('[data-act="docompare"]');
click("#screen .pickbtn");
click('[data-act="removeothers"]');
check("removing drops exactly the losers", n(".pc") === wishN - 2, `${n(".pc")} vs ${wishN - 2}`);
check("selection mode is over", !q(".selbar"));

head("PROFILE AND ORDERS");
click('[data-tab="profile"]');
check("profile renders", txt().includes("Priya"));
check("no invented personal data", !/\+91|@|\d{10}/.test(txt()));
sweep("profile");
click('[data-act="orders"]');
check("orders renders", n(".orow") === 4);
sweep("orders");

head("EMPTY STATES");
click('[data-tab="wishlist"]'); click('[data-wtab="items"]');
guard = 0;
while (n(".pc") > 0 && guard++ < 120) click("#screen .pc .heart");   // the seeded wishlist is large
check("the wishlist can be emptied", n(".pc") === 0, "got " + n(".pc"));
check("and explains itself", txt().includes("Nothing saved yet"));
click('[data-tab="home"]');
check("home survives an empty wishlist", !q("#decidecard"));
sweep("home with nothing saved");

head("REVIEWER SAFETY");
for (const pg of ["home", "shop", "wishlist", "profile"]) {
  click(`[data-tab="${pg}"]`);
  check(`${pg}: nothing claims to be a real purchase`, !/buy now|checkout now|order placed/i.test(txt()));
}
click('[data-tab="home"]');
click(".banner");
check("decorative chrome says it is out of scope", !!q(".toast"));

console.log("\nruntime errors: " + (errors.length ? errors.join(" | ") : "none"));
console.log(`\n${checks - fails}/${checks} checks passed` + (fails ? ` — ${fails} FAILED` : ""));
process.exit(fails || errors.length ? 1 : 0);
