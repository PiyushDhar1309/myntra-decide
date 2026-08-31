"""Turning a verdict into words.

Same split as the discovery engine: the numbers and the evidence are decided
before any model is called, and the model only ever writes prose over facts it
has been handed. With the AI switched off the app still explains itself, just
in plainer sentences.
"""

import os
from dims import label_of
from catalog import GARMENTS, title
import fit_engine as fe


def deciding_evidence(gid, finding, ctx):
    """Which garment in the wardrobe set the bound this finding ran into."""
    e = ctx["env"].get(fe.scope_for(gid, finding["dim"]))
    if not e:
        return None
    want = {fe.FAIL_SMALL: "low", fe.SNUG: "good", fe.FAIL_LARGE: "high",
            fe.ROOMY: "good", fe.OK: "good", fe.CLEARS: None}.get(finding["code"])
    if want is None:
        want = "high" if e["hard_hi"] is not None else "low"
    for ev in e["evidence"]:
        if ev["role"] == want:
            return ev
    return e["evidence"][0] if e["evidence"] else None


def inches(x):
    x = abs(x)
    if x < 0.1:
        return "a fraction of an inch"
    if abs(x - round(x)) < 0.05:
        return "%d\"" % round(x)
    return "%.1f\"" % x


def headline(row, ctx):
    """One deterministic sentence. Always available."""
    res = row["result"]
    gid, cat = row["gid"], res["category"]
    cat_label = fe.CATEGORIES[cat]["label"].lower()

    if res["status"] == fe.WRONG_SIZE:
        f = res["fails"][0]
        ev = deciding_evidence(gid, f, ctx)
        direction = "narrower" if f["code"] == fe.FAIL_SMALL else "longer" \
            if f["dim"] in ("length", "sleeve_length", "inseam") else "wider"
        base = "The %s is %s %s than the point you have already been burned at" % (
            f["label"].lower(), inches(f["delta"]), direction)
        if ev:
            base += ", set by your %s" % title(ev["garment"])
        if row["alt"]:
            return base + ". Size %s clears it." % row["alt"]["size"]
        return base + "."

    if res["status"] == fe.CANT_SAY:
        f = res["blocked_binding"][0] if res["blocked_binding"] else res["blocked"][0]
        if f["code"] == fe.UNPUBLISHED:
            return ("%s decides this one on your body, and %s does not publish it. "
                    "We will not guess at it." % (f["label"], GARMENTS[gid]["brand"]))
        return ("%s decides this one on your body, and nothing in your wardrobe "
                "pins it down yet." % f["label"])

    clears = [f for f in res["findings"] if f["code"] == fe.CLEARS]
    blocked = res["blocked"]
    if res["status"] == fe.FITS:
        s = "Every measurement that matters on a %s sits inside what already works on you." % cat_label
        if clears:
            ev = deciding_evidence(gid, clears[0], ctx)
            if ev:
                s += " The %s clears your %s." % (clears[0]["label"].lower(), title(ev["garment"]))
        return s

    if blocked:
        f = blocked[0]
        tail = ("%s does not publish it" % GARMENTS[gid]["brand"]) if f["code"] == fe.UNPUBLISHED \
            else "you own nothing that pins it down"
        return ("Everything we can check works. %s is the one we cannot, because %s."
                % (f["label"], tail))
    return "Close to what works on you, with a little more give than usual."


def fabric_line(res):
    if not res["fabric"]:
        return None
    parts = []
    for n in res["fabric"]:
        if n["kind"] == "no_give":
            parts.append(
                "%s, with no stretch, and it sits only %s inside your proven range. "
                "Your %s has give to fall back on; this will not."
                % (n["candidate"], inches(n["margin"]), title(n["ref"])))
        else:
            lead = "" if parts else n["candidate"] + ". "
            parts.append("%sYou have never bought %s here, so nothing you own tells "
                         "you how it will behave." % (lead, " or ".join(n["families"])))
    return " ".join(parts)


# --------------------------------------------------------------------------
# Optional AI layer
# --------------------------------------------------------------------------

PROMPT = """You are writing one short paragraph for a shopper looking at a saved item.

FACTS (the only things you may assert):
{facts}

Rules:
- Two or three sentences, at most 55 words. Plain British English, second person.
- Use only the numbers and garment names in FACTS. Invent nothing.
- Do not state a size unless FACTS gives one. Do not mention price, delivery,
  returns, discounts, reviews or other shoppers.
- If FACTS says something is unknown, say so plainly. Do not reassure.
- No greeting, no sign-off, no bullet points.
"""


def _facts(row, ctx):
    res = row["result"]
    lines = ["Item: %s, size %s, a %s" % (title(row["gid"]), row["size"],
                                          fe.CATEGORIES[res["category"]]["label"].lower()),
             "Verdict: %s at %d%% confidence" % (res["status"], res["confidence"])]
    for f in res["findings"]:
        if f["code"] == fe.UNPUBLISHED:
            lines.append("- %s: not published by %s" % (f["label"], GARMENTS[row["gid"]]["brand"]))
        elif f["code"] == fe.UNKNOWN:
            lines.append("- %s: garment is %s\", but nothing you own establishes what works" % (f["label"], f["value"]))
        else:
            ev = deciding_evidence(row["gid"], f, ctx)
            ref = (" (bound set by your %s)" % title(ev["garment"])) if ev else ""
            band = ""
            if f["band"] and f["band"][0] is not None:
                band = ", your proven range %.1f-%.1f\"" % (f["band"][0], f["band"][1])
            lines.append("- %s: garment is %s\"%s, judged %s%s" % (f["label"], f["value"], band, f["code"], ref))
    fab = fabric_line(res)
    if fab:
        lines.append("- Fabric: " + fab)
    if row["alt"]:
        lines.append("- A better size exists: %s" % row["alt"]["size"])
    return "\n".join(lines)


def ai_available():
    return bool(_key())


def _key():
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key
    try:
        import streamlit as st
        return st.secrets.get("GEMINI_API_KEY")
    except Exception:
        return None


def ai_paragraph(row, ctx):
    """Gemini's prose, or None. Never allowed to change a number."""
    key = _key()
    if not key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        out = model.generate_content(PROMPT.format(facts=_facts(row, ctx)))
        text = (out.text or "").strip()
        return text or None
    except Exception:
        return None
