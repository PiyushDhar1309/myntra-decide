"""Invariants of the fit engine. Run with: python test_engine.py"""

import dims
import fit_engine as fe
from catalog import PERSONAS, GARMENTS

FAILS = []


def check(name, cond):
    if cond:
        print("  ok   %s" % name)
    else:
        FAILS.append(name)
        print("  FAIL %s" % name)


def ctx_for(pid, extra=None):
    return fe.context(PERSONAS[pid]["wardrobe"], extra)


print("scoping")
check("a short sleeve and a full sleeve are not comparable",
      fe.scope_for("g_hrx_tshirt", "sleeve_length") != fe.scope_for("g_vh_formal_shirt", "sleeve_length"))
check("inseam pools across jeans and trousers, because it is a body measurement",
      fe.scope_for("w_levis_512", "inseam") == fe.scope_for("w_vh_chinos", "inseam"))
check("hem length does not pool across categories",
      fe.scope_for("g_biba_kurta", "length") != fe.scope_for("g_mh_shirtdress", "length"))
check("a kurta bust and a shirt chest are the same evidence",
      fe.scope_for("g_biba_kurta", "chest") == fe.scope_for("g_vh_formal_shirt", "chest"))

print("stretch")
check("elastane adds wearable inches to a circumference",
      fe.effective(40.0, "chest", 0.04) > 40.0)
check("elastane does not lengthen a sleeve",
      fe.effective(25.0, "sleeve_length", 0.04) == 25.0)
check("usable stretch is capped well below the fabric's rating",
      dims.usable_stretch(0.20) <= 0.075)

print("evidence")
env = ctx_for("ananya")["env"]
shoulder = env[fe.scope_for("g_zara_blazer", "shoulder")]
check("a garment returned as loose sets an upper limit", shoulder["hard_hi"] == 15.5)
check("a garment returned as loose proves no good value", not shoulder["core_lo"])
top_len = env.get(fe.scope_for("g_hm_ribbed", "length"))
check("a complaint about the chest does not vouch for the hem",
      top_len is None or not top_len["core_lo"])

print("judging")
c = ctx_for("ananya")
midi_s = fe.judge("w_zara_midi", "S", c)
check("a bust under a proven-too-tight value is refused", midi_s["status"] == fe.WRONG_SIZE)
rec = fe.recommend("w_zara_midi", "S", c)
check("a size that clears it is offered instead", rec["alt"] and rec["alt"]["size"] == "M")

wide = fe.judge("w_only_wideleg", "26", c)
thigh = [f for f in wide["findings"] if f["dim"] == "thigh"][0]
check("a relaxed cut is not penalised for a roomy thigh", thigh["code"] == fe.INTENDED)
waist28 = [f for f in fe.judge("w_only_wideleg", "28", c)["findings"] if f["dim"] == "waist"][0]
check("a relaxed cut is still judged at the waist", waist28["code"] != fe.INTENDED)

mh = fe.judge("w_mh_casual_shirt", "XL", ctx_for("rohan"))
sleeve = [f for f in mh["findings"] if f["dim"] == "sleeve_length"][0]
check("an unpublished dimension is reported, not guessed", sleeve["code"] == fe.UNPUBLISHED)
check("and it blocks the verdict", mh["status"] == fe.CANT_SAY)

print("the measurement loop")
before = fe.review_wishlist(PERSONAS["ananya"])
after = fe.review_wishlist(PERSONAS["ananya"], {("g_levis_711", "inseam"): 30.5})
check("before: three items wait on one number", before["counts"][fe.CANT_SAY] == 3)
check("after: none of them do", after["counts"][fe.CANT_SAY] == 0)
check("two become buyable", after["counts"][fe.FITS] - before["counts"][fe.FITS] == 2)
check("and one is revealed as a mistake",
      after["counts"][fe.WRONG_SIZE] - before["counts"][fe.WRONG_SIZE] == 1)
check("the ask names a garment the shopper owns",
      before["unlocks"][0]["source"]["garment"] in {e["garment"] for e in PERSONAS["ananya"]["wardrobe"]})

print("honesty")
for pid in PERSONAS:
    p = PERSONAS[pid]
    rv = fe.review_wishlist(p)
    for u in rv["unlocks"]:
        src = u["source"]
        published = GARMENTS[src["garment"]]["sizes"][src["size"]]
        check("%s: never asks for a measurement it already has" % pid, u["dim"] not in published)
    for row in rv["rows"]:
        res = row["result"]
        unpub = [f["dim"] for f in res["findings"] if f["code"] == fe.UNPUBLISHED]
        check("%s/%s: a brand's missing data is never sold as a shopper's task" % (pid, row["gid"]),
              not (set(unpub) & {u["dim"] for u in rv["unlocks"]}))
        check("%s/%s: nothing is called a fit while something critical is unmeasured" % (pid, row["gid"]),
              not (res["status"] == fe.FITS and res["blocked"]))

print()
print("FAILED: %d" % len(FAILS) if FAILS else "all passed")
raise SystemExit(1 if FAILS else 0)
