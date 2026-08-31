"""Fit Check - a wishlist that knows what already fits you.

A case-study prototype. The shopper never tells us their size. Everything is
worked out from garments they already own, measurement against measurement.
"""

import streamlit as st

import fit_engine as fe
import narrate
import styles
from catalog import GARMENTS, PERSONAS, title
from dims import CATEGORIES, DIMENSIONS

st.set_page_config(page_title="Fit Check", page_icon="👗", layout="centered",
                   initial_sidebar_state="expanded")
st.markdown(styles.CSS, unsafe_allow_html=True)

PAGES = ["Home", "Wishlist", "My fit profile"]


def state():
    st.session_state.setdefault("persona", "ananya")
    st.session_state.setdefault("extra", {})
    st.session_state.setdefault("page", "Home")
    st.session_state.setdefault("added", {})


def persona():
    p = dict(PERSONAS[st.session_state.persona])
    p["wardrobe"] = list(p["wardrobe"]) + st.session_state.added.get(st.session_state.persona, [])
    return p


def extras():
    return {k: v for k, v in st.session_state.extra.items()}


def topbar(active):
    links = "".join(
        '<span class="%s">%s</span>' % ("on" if l == active else "", l)
        for l in ["Home", "Wishlist", "My fit profile"])
    st.markdown(
        '<div class="fc-topbar"><div class="fc-logo">MYNTRA<span>.</span></div>'
        '<div class="fc-navlinks">%s</div>'
        '<div class="fc-demo">Fit Check · prototype</div></div>' % links,
        unsafe_allow_html=True)


def money(n):
    return "₹%s" % format(n, ",d")


# --------------------------------------------------------------------------
# Item card
# --------------------------------------------------------------------------

def item_card(row, ctx, key):
    res = row["result"]
    g = GARMENTS[row["gid"]]
    meta = styles.STATUS[res["status"]]

    pill = ('<span class="fc-pill" style="background:%s;color:%s">%s</span>'
            % (meta["tint"], meta["color"], meta["label"].upper()))
    alt = ""
    if row["alt"]:
        alt = '<div class="fc-alt">Size %s clears it — %d%% there</div>' % (
            row["alt"]["size"], row["alt"]["confidence"])

    # Confidence is a statement about how much we know, so it is only shown
    # where we are actually claiming something about the fit.
    conf = ""
    if res["status"] in (fe.FITS, fe.LIKELY, fe.CANT_SAY):
        conf = ('<div class="fc-conf"><div style="width:%d%%;background:%s"></div></div>'
                '<div class="fc-conflabel">%d%% of what decides a %s on you is settled by clothes you own</div>'
                % (res["confidence"], meta["color"], res["confidence"],
                   CATEGORIES[res["category"]]["label"].lower()))

    st.markdown(
        '<div class="fc-card">%s<div class="meta">%s'
        '<div class="fc-brand">%s</div><div class="fc-name">%s</div>'
        '<div class="fc-price">%s &nbsp;·&nbsp; size %s</div>'
        '<div class="fc-saved">Saved %d days ago</div>'
        '<div class="fc-headline">%s</div>%s%s</div></div>'
        % (styles.thumb(row["gid"], GARMENTS), pill, g["brand"], g["name"],
           money(g["price"]), row["size"], row["days"],
           narrate.headline(row, ctx), alt, conf),
        unsafe_allow_html=True)

    with st.expander("Why we say that"):
        detail(row, ctx, key)


def detail(row, ctx, key):
    res = row["result"]
    rows_html = []
    for f in res["findings"]:
        color, note = styles.CODE_TONE[f["code"]]
        if f["code"] == fe.UNPUBLISHED:
            val = "—"
        else:
            val = '%.1f"' % f["value"]
        detail_note = note
        if f["code"] in (fe.SNUG, fe.ROOMY, fe.FAIL_SMALL, fe.FAIL_LARGE) and f["delta"]:
            detail_note = "%s by %s" % (note, narrate.inches(f["delta"]))
        rows_html.append(
            '<div class="fc-dimrow"><div class="lab">%s</div><div class="val">%s</div>'
            '<div>%s</div><div class="note" style="color:%s">%s</div></div>'
            % (f["label"], val, styles.bar(f), color, detail_note))
    st.markdown("".join(rows_html), unsafe_allow_html=True)

    proven = []
    for f in res["findings"]:
        ev = narrate.deciding_evidence(row["gid"], f, ctx)
        if ev and f["code"] not in (fe.UNKNOWN, fe.UNPUBLISHED):
            proven.append(title(ev["garment"]))
    proven = list(dict.fromkeys(proven))
    if proven:
        st.markdown('<div class="fc-src">Judged against %s — garments you already own.</div>'
                    % ", ".join(proven), unsafe_allow_html=True)

    fab = narrate.fabric_line(res)
    if fab:
        st.markdown('<div class="fc-sec">Fabric</div><div class="fc-note">%s</div>' % fab,
                    unsafe_allow_html=True)

    if narrate.ai_available():
        if st.button("Say it in plain English", key="ai_%s" % key):
            with st.spinner("Writing…"):
                para = cached_paragraph(row["gid"], row["size"], _sig(), st.session_state.persona)
            st.markdown('<div class="fc-note">%s</div>'
                        % (para or "The model was unavailable, so the numbers above stand alone."),
                        unsafe_allow_html=True)


def _sig():
    return tuple(sorted((k[0], k[1], v) for k, v in st.session_state.extra.items()))


@st.cache_data(show_spinner=False)
def cached_paragraph(gid, size, sig, pid):
    p = dict(PERSONAS[pid])
    extra = {(g, d): v for g, d, v in sig}
    rv = fe.review_wishlist(p, extra)
    for r in rv["rows"]:
        if r["gid"] == gid and r["size"] == size:
            return narrate.ai_paragraph(r, rv["ctx"])
    return None


# --------------------------------------------------------------------------
# The measurement ask
# --------------------------------------------------------------------------

def unlock_block(rv, where):
    if not rv["unlocks"]:
        return False
    u = rv["unlocks"][0]
    src = u["source"]
    ref = title(src["garment"])
    why = (src["unresolved"] or {}).get("why", "")

    st.markdown(
        '<div class="fc-unlock"><div class="t">One measurement settles %d saved %s</div>'
        '<div class="d">Take a tape to the <b>%s</b> in size %s that you already own, and read off '
        'the %s. %s Measuring a garment flat on a table is easier and far more accurate than '
        'measuring yourself.</div></div>'
        % (u["count"], "item" if u["count"] == 1 else "items", ref, src["size"],
           u["label"].lower(), why),
        unsafe_allow_html=True)

    with st.form("unlock_%s" % where, border=False):
        c1, c2 = st.columns([3, 2])
        val = c1.number_input('%s of your %s, in inches' % (u["label"], ref),
                              min_value=4.0, max_value=60.0, value=30.5, step=0.5,
                              label_visibility="visible")
        c2.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        go = c2.form_submit_button("Use this measurement", type="primary",
                                   use_container_width=True)
    if go:
        st.session_state.extra[(src["garment"], u["dim"])] = float(val)
        st.rerun()
    return True


def gaps_block(rv):
    if not rv["gaps"]:
        return
    lines = []
    for g in rv["gaps"]:
        lines.append("You own no <b>%s</b> we can judge %s by, which is what holds up %d saved %s."
                     % (g["cat_label"].lower(), g["label"].lower(), len(g["items"]),
                        "item" if len(g["items"]) == 1 else "items"))
    st.markdown('<div class="fc-sec">Gaps in your profile</div>'
                '<div class="fc-note">%s Add one under <b>My fit profile</b> and these resolve '
                'themselves.</div>' % " ".join(lines), unsafe_allow_html=True)


# --------------------------------------------------------------------------
# Pages
# --------------------------------------------------------------------------

def page_home(p, rv):
    anchor = fe.anchor_garment(p)
    c = rv["counts"]
    good = c[fe.FITS] + c[fe.LIKELY]
    total = len(rv["rows"])

    st.markdown(
        '<div class="fc-hero"><div class="fc-eyebrow">Fit Check</div>'
        '<h2>Because your <b>%s</b> in size %s fits you, we think <b>%d of the %d items</b> '
        'in your wishlist will fit you too.</h2>'
        '<div class="fc-sub">We never ask your size. We read the measurements of clothes you '
        'have already bought and kept, work out what actually fits your body, and compare every '
        'saved item against that — measurement by measurement.</div>'
        '<div class="fc-chips">'
        '<span class="fc-chip" style="background:%s;color:%s">%d should fit</span>'
        '<span class="fc-chip" style="background:%s;color:%s">%d we can\'t call yet</span>'
        '<span class="fc-chip" style="background:%s;color:%s">%d wrong size saved</span>'
        '</div></div>'
        % (title(anchor["garment"]), anchor["size"], good, total,
           styles.STATUS[fe.FITS]["tint"], styles.STATUS[fe.FITS]["color"], good,
           styles.STATUS[fe.CANT_SAY]["tint"], styles.STATUS[fe.CANT_SAY]["color"], c[fe.CANT_SAY],
           styles.STATUS[fe.WRONG_SIZE]["tint"], styles.STATUS[fe.WRONG_SIZE]["color"], c[fe.WRONG_SIZE]),
        unsafe_allow_html=True)

    st.write("")
    if st.button("Open my wishlist", type="primary"):
        st.session_state.page = "Wishlist"
        st.rerun()

    st.write("")
    if unlock_block(rv, "home"):
        st.write("")

    st.markdown('<div class="fc-sec">Saved most recently</div>', unsafe_allow_html=True)
    recent = sorted(rv["rows"], key=lambda r: r["days"])[:3]
    for i, row in enumerate(recent):
        item_card(row, rv["ctx"], "home%d" % i)
        st.write("")


def page_wishlist(p, rv):
    c = rv["counts"]
    order = [fe.FITS, fe.LIKELY, fe.CANT_SAY, fe.WRONG_SIZE]
    labels = ["All (%d)" % len(rv["rows"])] + [
        "%s (%d)" % (styles.STATUS[s]["label"], c[s]) for s in order if c[s]]
    pick = st.radio("Filter", labels, horizontal=True, label_visibility="collapsed")

    if unlock_block(rv, "wish"):
        st.write("")

    shown = rv["rows"]
    if not pick.startswith("All"):
        want = [s for s in order if pick.startswith(styles.STATUS[s]["label"])][0]
        shown = [r for r in rv["rows"] if r["result"]["status"] == want]

    for i, row in enumerate(shown):
        item_card(row, rv["ctx"], "w%d" % i)
        st.write("")
    gaps_block(rv)


VERDICT_WORDS = {"perfect": ("Fits perfectly", "#03a685"),
                 "tight": ("Too tight", "#d8434e"),
                 "loose": ("Too loose", "#e08a2e"),
                 "short": ("Too short", "#e08a2e"),
                 "long": ("Too long", "#e08a2e")}


def page_profile(p, rv):
    st.markdown('<div class="fc-sec">Where this came from</div>'
                '<div class="fc-note">These are your past Myntra orders. What you kept is a '
                'garment that fits; what you returned for a size reason is a boundary we will '
                'not cross again. Nothing here was typed in by you.</div>',
                unsafe_allow_html=True)
    st.write("")

    for entry in p["wardrobe"]:
        g = GARMENTS[entry["garment"]]
        word, color = VERDICT_WORDS[entry["verdict"]]
        dims = entry.get("dims") or []
        if dims:
            word += " in the " + ", ".join(DIMENSIONS[d]["label"].lower() for d in dims)
        known = g["sizes"][entry["size"]]
        extra_here = {d: v for (gg, d), v in st.session_state.extra.items() if gg == entry["garment"]}
        measured = ", ".join('%s %.1f"' % (DIMENSIONS[d]["label"], v)
                             for d, v in sorted(known.items()) if d in DIMENSIONS)
        if extra_here:
            measured += " · " + ", ".join('%s %.1f" (you measured)' % (DIMENSIONS[d]["label"], v)
                                          for d, v in extra_here.items())
        st.markdown(
            '<div class="fc-ward">%s<div class="meta">'
            '<div class="fc-brand">%s</div><div class="fc-name">%s · size %s</div>'
            '<div style="margin-top:6px"><span class="fc-pill" style="background:#f7f7f8;color:%s">%s</span></div>'
            '<div class="fc-saved" style="margin-top:7px">%s</div>'
            '<div class="fc-src" style="margin-top:4px">%s</div></div></div>'
            % (styles.thumb(entry["garment"], GARMENTS, h=62), g["brand"], g["name"],
               entry["size"], color, word, measured, entry.get("note", "")),
            unsafe_allow_html=True)
        st.write("")

    st.markdown('<div class="fc-sec">Add something you own</div>'
                '<div class="fc-note">Anything you wear, from anywhere. Each one you add makes '
                'every verdict on your wishlist sharper.</div>', unsafe_allow_html=True)

    owned = {e["garment"] for e in p["wardrobe"]}
    options = [gid for gid in GARMENTS if gid not in owned]
    options.sort(key=lambda gid: title(gid))
    with st.form("addgarment", border=False):
        c1, c2, c3 = st.columns([4, 1.4, 2.2])
        gid = c1.selectbox("Garment", options, format_func=title)
        size = c2.selectbox("Size", list(GARMENTS[gid]["sizes"]) if gid else [])
        verdict = c3.selectbox("How does it fit?",
                               ["perfect", "tight", "loose", "short", "long"],
                               format_func=lambda v: VERDICT_WORDS[v][0])
        dim_opts = CATEGORIES[GARMENTS[gid]["category"]]["critical"] if gid else []
        where = st.multiselect("Where, if it is not perfect",
                               dim_opts, format_func=lambda d: DIMENSIONS[d]["label"])
        if st.form_submit_button("Add to my profile", type="primary"):
            if verdict != "perfect" and not where:
                st.warning("Tell us which measurement is wrong, otherwise there is nothing to learn from.")
            else:
                st.session_state.added.setdefault(st.session_state.persona, []).append(
                    {"garment": gid, "size": size, "verdict": verdict,
                     "dims": list(where), "note": "Added by you."})
                st.rerun()

    st.markdown('<div class="fc-sec">What we now know about your body</div>', unsafe_allow_html=True)
    st.markdown('<div class="fc-note">Not your measurements — the garment measurements that have '
                'been proven to work on you. A hard limit is one you told us about the hard way.</div>',
                unsafe_allow_html=True)
    st.write("")
    lines = []
    for key, e in sorted(rv["env"].items(), key=lambda kv: (kv[0][1], kv[0][2])):
        if not e["has_any"]:
            continue
        dim = key[2]
        owner = key[1] if key[0] == "region" else CATEGORIES[key[1]]["label"].lower()
        bits = []
        if e["band_lo"] is not None:
            bits.append('proven %.1f–%.1f"' % (e["band_lo"], e["band_hi"]))
        if e["hard_lo"] is not None:
            bits.append('never below %.1f"' % e["hard_lo"])
        if e["hard_hi"] is not None:
            bits.append('never above %.1f"' % e["hard_hi"])
        lines.append('<div class="fc-dimrow" style="grid-template-columns:150px 110px 1fr">'
                     '<div class="lab">%s</div><div class="val">%s</div>'
                     '<div class="fc-note">%s</div></div>'
                     % (DIMENSIONS[dim]["label"], owner, " · ".join(bits)))
    st.markdown("".join(lines), unsafe_allow_html=True)


# --------------------------------------------------------------------------

def main():
    state()
    page = st.session_state.page
    topbar(page)

    with st.sidebar:
        st.markdown("**Try it as**")
        pid = st.radio("Shopper", list(PERSONAS),
                       format_func=lambda k: "%s · %s" % (PERSONAS[k]["name"], PERSONAS[k]["segment"]),
                       label_visibility="collapsed", index=list(PERSONAS).index(st.session_state.persona))
        if pid != st.session_state.persona:
            st.session_state.persona = pid
            st.rerun()
        st.caption(PERSONAS[pid]["blurb"])
        st.divider()
        nav = st.radio("Go to", PAGES, index=PAGES.index(page), label_visibility="collapsed")
        if nav != page:
            st.session_state.page = nav
            st.rerun()
        st.divider()
        if st.session_state.extra or st.session_state.added:
            if st.button("Reset what I've added"):
                st.session_state.extra = {}
                st.session_state.added = {}
                st.rerun()
        st.caption("Case-study prototype. Not affiliated with Myntra. "
                   "Product and order data are illustrative; the fit engine is real — "
                   "change the profile and every verdict recomputes.")

    p = persona()
    rv = fe.review_wishlist(p, extras())

    if page == "Home":
        page_home(p, rv)
    elif page == "Wishlist":
        page_wishlist(p, rv)
    else:
        page_profile(p, rv)


main()
