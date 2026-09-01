// Parity: the JavaScript engine must agree with the Python reference exactly.
//
// docs/expected.json is a snapshot of fit_engine.py's verdicts, written by
// tools/gen_data.py. Regenerate it whenever the catalog or the rules change; if
// the port has drifted, this is what catches it.

import { readFileSync } from "fs";
import { PERSONAS } from "./data.js";
import * as fe from "./engine.js";

const expected = JSON.parse(readFileSync(new URL("./expected.json", import.meta.url), "utf8"));
let fails = 0;
const bad = (what, got, want) => {
  fails++;
  console.log(`  FAIL ${what}\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`);
};

for (const [scenario, spec] of Object.entries(expected)) {
  const extra = {};
  for (const s of spec.extra) {
    const [key, val] = s.split("=");
    extra[key] = parseFloat(val);
  }
  for (const [pid, want] of Object.entries(spec.personas)) {
    const rv = fe.reviewWishlist(PERSONAS[pid], extra);
    const where = `${scenario}/${pid}`;

    if (JSON.stringify(rv.counts) !== JSON.stringify(want.counts)) bad(where + " counts", rv.counts, want.counts);

    const got = rv.rows.map(r => ({ gid: r.gid, size: r.size, status: r.result.status,
                                    confidence: r.result.confidence, alt: r.alt ? r.alt.size : null }));
    if (got.length !== want.rows.length) bad(where + " row count", got.length, want.rows.length);
    for (let i = 0; i < Math.min(got.length, want.rows.length); i++) {
      if (JSON.stringify(got[i]) !== JSON.stringify(want.rows[i])) bad(`${where} row ${i}`, got[i], want.rows[i]);
    }

    const gotU = rv.unlocks.map(u => ({ dim: u.dim, count: u.count, source: u.source.garment }));
    if (JSON.stringify(gotU) !== JSON.stringify(want.unlocks)) bad(where + " unlocks", gotU, want.unlocks);
  }
  if (!fails) console.log(`  ok   ${scenario} — both engines agree on every persona, row and unlock`);
}

console.log(fails ? `\nFAILED ${fails}` : "\nJavaScript matches the Python reference exactly");
process.exit(fails ? 1 : 0);
