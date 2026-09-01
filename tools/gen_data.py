"""Regenerate site/data.js from catalog.py.

The Python engine stays the reference implementation and keeps the test suite;
the deployed app is JavaScript. Generating the data rather than maintaining two
copies means the measurements cannot drift apart.

Run from the repo root:  python3 tools/gen_data.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import catalog
import fit_engine as fe
from catalog import GARMENTS, PERSONAS, IMAGES, FALLBACK_IMAGE

# Scenarios the parity check replays against both engines. The second one is the
# whole point of the product, so it is the one that matters most.
SCENARIOS = [
    ("baseline", {}),
    ("ananya-measures-711", {("g_levis_711", "inseam"): 30.5}),
    ("rohan-measures-505", {("g_levis_505", "inseam"): 31.0}),
]


def expectations():
    """Snapshot the Python engine's verdicts, for the JS port to be held to."""
    out = {}
    for name, extra in SCENARIOS:
        per_persona = {}
        for pid, p in PERSONAS.items():
            rv = fe.review_wishlist(p, extra)
            per_persona[pid] = {
                "counts": rv["counts"],
                "rows": [{"gid": r["gid"], "size": r["size"],
                          "status": r["result"]["status"],
                          "confidence": r["result"]["confidence"],
                          "alt": r["alt"]["size"] if r["alt"] else None}
                         for r in rv["rows"]],
                "unlocks": [{"dim": u["dim"], "count": u["count"],
                             "source": u["source"]["garment"]} for u in rv["unlocks"]],
            }
        out[name] = {"extra": ["%s|%s" % k + "=%s" % v for k, v in extra.items()],
                     "personas": per_persona}
    return out

HELPERS = '''export function photo(gid, w, h) {
  const g = GARMENTS[gid];
  return `https://images.unsplash.com/${g.photo}?w=${w}&h=${h}&fit=crop&crop=entropy&q=80`;
}

export function title(gid) {
  const g = GARMENTS[gid];
  return `${g.brand} ${g.name}`;
}

export function rupees(n) {
  return "\\u20b9" + n.toLocaleString("en-IN");
}
'''


def main():
    out = {}
    for gid, g in GARMENTS.items():
        pid, alt = IMAGES.get(gid, FALLBACK_IMAGE)
        price, mrp, pct = catalog.pricing(gid)
        out[gid] = {
            "brand": g["brand"], "name": g["name"], "category": g["category"],
            "price": price, "mrp": mrp, "off": pct,
            "fabric": g["fabric"], "elastane": g.get("elastane", 0.0),
            "sleeve": g.get("sleeve", "full"), "silhouette": g.get("silhouette"),
            "sizes": g["sizes"], "photo": pid, "alt": alt,
        }

    body = "// Generated from catalog.py by tools/gen_data.py - do not edit by hand.\n"
    body += "export const GARMENTS = %s;\n\n" % json.dumps(out, indent=1)
    body += "export const PERSONAS = %s;\n\n" % json.dumps(PERSONAS, indent=1)
    body += HELPERS

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    site = os.path.join(root, "docs")
    with open(os.path.join(site, "data.js"), "w") as fh:
        fh.write(body)
    with open(os.path.join(site, "expected.json"), "w") as fh:
        json.dump(expectations(), fh, indent=1)
    print("wrote docs/data.js (%d garments, %d personas) and docs/expected.json"
          % (len(out), len(PERSONAS)))


if __name__ == "__main__":
    main()
