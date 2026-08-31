"""Fit Check - a wishlist that already knows what fits you.

A case-study prototype. The shopper never tells us their size. Everything is
worked out from garments they already own, measurement against measurement.
"""

import streamlit as st

import fit_engine as fe
import narrate
import styles
from catalog import GARMENTS, PERSONAS, title, image
from dims import CATEGORIES, DIMENSIONS

st.set_page_config(page_title="Fit Check · Myntra", page_icon="👗", layout="wide",
                   initial_sidebar_state="collapsed")
st.markdown(styles.CSS, unsafe_allow_html=True)

PAGES = ["Home", "Wishlist", "My fit profile"]
NAV = [("⌂  Home", "Home"), ("♡  Wishlist", "Wishlist"), ("◍  My fit profile", "My fit profile")]
CATEGORY_TABS = ["Men", "Women", "Kids", "Home & Living", "Beauty", "Studio"]


def go(page):
    st.session_state.page = page


def reset_edits():
    st.session_state.extra = {}
    st.session_state.added = {}


def apply_measurement(gid, dim, field):
    st.session_state.extra[(gid, dim)] = float(st.session_state[field])


def add_garment():
    gid = st.session_state.add_gid
    verdict = st.session_state.add_verdict
    where = list(st.session_state.add_dims)
    if verdict != "perfect" and not where:
        st.session_state.add_error = ("Tell us which measurement is wrong, "
                                      "or there is nothing to learn from.")
        return
    st.session_state.add_error = None
    st.session_state.added.setdefault(st.session_state.persona, []).append(
        {"garment": gid, "size": st.session_state.add_size, "verdict": verdict,
         "dims": where, "note": "Added by you."})


def boot():
    st.session_state.setdefault("persona", "ananya")
    st.session_state.setdefault("extra", {})
    st.session_state.setdefault("page", "Home")
    st.session_state.setdefault("added", {})


def persona():
    p = dict(PERSONAS[st.session_state.persona])
    p["wardrobe"] = list(p["wardrobe"]) + st.session_state.added.get(st.session_state.persona, [])
    return p


def money(n):
    return "Rs. %s" % format(n, ",d")


# --------------------------------------------------------------------------
# Chrome
# --------------------------------------------------------------------------

def header():
    """Navigation is plain session state driven by buttons.

    Deliberately not a radio bound by index: Streamlit keeps a widget's stored
    value across reruns and ignores the index, so a radio and a button that both
    write the page will overwrite each other and nothing ever navigates.
    """
    with st.container(key="mxnav"):
        cols = st.columns([1.9, 4.0, 1.15, 1.35, 1.75], vertical_alignment="center")
        cols[0].markdown(
            '<div class="mx-logo">MYNTRA<span>.</span><small>FIT CHECK</small></div>',
            unsafe_allow_html=True)
        cols[1].markdown(
            '<div class="mx-cats">%s</div>'
            % "".join('<a class="%s">%s</a>' % ("on" if c == "Women" else "", c)
                      for c in CATEGORY_TABS),
            unsafe_allow_html=True)
        # Callbacks, never st.rerun() here. st.rerun() would abort the script
        # before the widgets further down this function had rendered, and
        # Streamlit discards the stored value of any widget it did not see on a
        # run - which silently reset the shopper on every navigation.
        for i, (label, page) in enumerate(NAV):
            kind = "primary" if st.session_state.page == page else "secondary"
            cols[2 + i].button(label, key="nav_%s" % page, type=kind,
                               use_container_width=True, on_click=go, args=(page,))

    # The shopper switcher and reset sit on the page, not in the sidebar. A
    # control the demo depends on should never be behind a collapsed panel.
    with st.container(key="mxsearch"):
        c = st.columns([4.5, 1.9, 1.4], vertical_alignment="bottom")
        q = c[0].text_input("Search", placeholder="Search for products, brands and more",
                            label_visibility="collapsed")
        c[1].selectbox("Try it as", list(PERSONAS), key="persona",
                       format_func=lambda k: "%s · %s" % (PERSONAS[k]["name"],
                                                          PERSONAS[k]["segment"]))
        dirty = bool(st.session_state.extra or st.session_state.added)
        c[2].button("Reset my edits", use_container_width=True, disabled=not dirty,
                    on_click=reset_edits)
    st.markdown('<div class="mx-rule"></div>', unsafe_allow_html=True)
    return (q or "").strip().lower()


def footer():
    st.markdown(
        '<div class="mx-foot">Case-study prototype, not affiliated with Myntra. The catalog and '
        'order history are illustrative and the photography is from Unsplash, shown for the '
        'category rather than the exact garment. The fit engine is real — edit your profile and '
        'every verdict recomputes.</div>', unsafe_allow_html=True)


# --------------------------------------------------------------------------
# Product card
# --------------------------------------------------------------------------

def card(row, ctx, key):
    res = row["result"]
    g = GARMENTS[row["gid"]]
    meta = styles.STATUS[res["status"]]

    alt = ""
    if row["alt"]:
        alt = '<div class="mx-alt">Size %s clears it — %d%% there</div>' % (
            row["alt"]["size"], row["alt"]["confidence"])

    # Confidence describes how much we know, so it only shows where we are
    # actually making a claim about the fit.
    conf = ""
    if res["status"] in (fe.FITS, fe.LIKELY, fe.CANT_SAY):
        conf = ('<div class="mx-conf"><div style="width:%d%%;background:%s"></div></div>'
                '<div class="mx-conflabel">%d%% of what decides a %s on you is settled '
                'by clothes you already own</div>'
                % (res["confidence"], meta["color"], res["confidence"],
                   CATEGORIES[res["category"]]["label"].lower()))

    st.markdown(
        '<div class="mx-card"><div class="mx-imgwrap">%s'
        '<div class="mx-saved">Saved %dd ago</div>'
        '<div class="mx-badge" style="color:%s">%s</div></div>'
        '<div class="mx-body"><div class="mx-brand">%s</div>'
        '<div class="mx-name">%s</div>%s'
        '<div class="mx-size">Size %s</div>'
        '<div class="mx-fit">%s</div>%s%s</div></div>'
        % (styles.photo(row["gid"]), row["days"], meta["color"], meta["label"],
           g["brand"], g["name"], styles.price_html(row["gid"]), row["size"],
           narrate.headline(row, ctx), alt, conf),
        unsafe_allow_html=True)

    with st.expander("Why we say that"):
        detail(row, ctx, key)


def detail(row, ctx, key):
    res = row["result"]
    out = []
    for f in res["findings"]:
        color, note = styles.CODE_TONE[f["code"]]
        val = "—" if f["code"] == fe.UNPUBLISHED else '%.1f"' % f["value"]
        if f["code"] in (fe.SNUG, fe.ROOMY, fe.FAIL_SMALL, fe.FAIL_LARGE) and f["delta"]:
            note = "%s by %s" % (note, narrate.inches(f["delta"]))
        out.append(
            '<div class="mx-dimrow"><div class="lab">%s</div><div class="val">%s</div>'
            '<div>%s</div><div class="note" style="color:%s">%s</div></div>'
            % (f["label"], val, styles.bar(f), color, note))
    st.markdown("".join(out), unsafe_allow_html=True)

    proven = []
    for f in res["findings"]:
        ev = narrate.deciding_evidence(row["gid"], f, ctx)
        if ev and f["code"] not in (fe.UNKNOWN, fe.UNPUBLISHED):
            proven.append(title(ev["garment"]))
    proven = list(dict.fromkeys(proven))
    if proven:
        st.markdown('<div class="mx-src">Judged against %s — garments you already own.</div>'
                    % ", ".join(proven), unsafe_allow_html=True)

    fab = narrate.fabric_line(res)
    if fab:
        st.markdown('<div class="mx-sec" style="margin-top:18px">Fabric</div>'
                    '<div class="mx-note">%s</div>' % fab, unsafe_allow_html=True)

    if narrate.ai_available() and st.button("Say it in plain English", key="ai_%s" % key):
        with st.spinner("Writing…"):
            para = cached_paragraph(row["gid"], row["size"], _sig(), st.session_state.persona)
        st.markdown('<div class="mx-note">%s</div>'
                    % (para or "The model was unavailable, so the numbers above stand alone."),
                    unsafe_allow_html=True)


def _sig():
    return tuple(sorted((k[0], k[1], v) for k, v in st.session_state.extra.items()))


@st.cache_data(show_spinner=False)
def cached_paragraph(gid, size, sig, pid):
    rv = fe.review_wishlist(PERSONAS[pid], {(g, d): v for g, d, v in sig})
    for r in rv["rows"]:
        if r["gid"] == gid and r["size"] == size:
            return narrate.ai_paragraph(r, rv["ctx"])
    return None


def grid(rows, ctx, prefix, cols=3):
    columns = st.columns(cols, gap="medium")
    for i, row in enumerate(rows):
        with columns[i % cols]:
            card(row, ctx, "%s%d" % (prefix, i))
            st.write("")


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
    url, alt_txt = image(src["garment"], 300, 400)

    left, right = st.columns([1, 5.2], vertical_alignment="center")
    left.markdown('<img src="%s" alt="%s" style="width:100%%;border-radius:8px;'
                  'border:1px solid #eaeaec">' % (url, alt_txt), unsafe_allow_html=True)
    right.markdown(
        '<div class="mx-unlock"><div class="t">One measurement settles %d saved %s</div>'
        '<div class="d">Take a tape to the <b>%s</b> in size %s that you already own and read '
        'off the %s. %s Measuring a garment lying flat is easier and far more accurate than '
        'measuring yourself.</div></div>'
        % (u["count"], "item" if u["count"] == 1 else "items", ref, src["size"],
           u["label"].lower(), why),
        unsafe_allow_html=True)

    field = "measure_%s" % where
    with st.form("unlock_%s" % where, border=False):
        c1, c2 = st.columns([3, 2], vertical_alignment="bottom")
        c1.number_input('%s of your %s, in inches' % (u["label"], ref),
                        min_value=4.0, max_value=60.0, value=30.5, step=0.5, key=field)
        c2.form_submit_button("Use this measurement", type="primary",
                              use_container_width=True, on_click=apply_measurement,
                              args=(src["garment"], u["dim"], field))
    return True


def gaps_block(rv):
    if not rv["gaps"]:
        return
    lines = ["You own no <b>%s</b> we can judge %s by, which is what holds up %d saved %s."
             % (g["cat_label"].lower(), g["label"].lower(), len(g["items"]),
                "item" if len(g["items"]) == 1 else "items") for g in rv["gaps"]]
    st.markdown('<div class="mx-sec">Gaps in your profile</div><div class="mx-note">%s '
                'Add one under <b>My fit profile</b> and these resolve themselves.</div>'
                % " ".join(lines), unsafe_allow_html=True)


# --------------------------------------------------------------------------
# Pages
# --------------------------------------------------------------------------

def page_home(p, rv):
    anchor = fe.anchor_garment(p)
    c = rv["counts"]
    good = c[fe.FITS] + c[fe.LIKELY]
    url, alt_txt = image(anchor["garment"], 220, 300)

    def chip(status, n, word):
        s = styles.STATUS[status]
        return ('<span class="mx-chip" style="background:%s;color:%s">%d %s</span>'
                % (s["tint"], s["color"], n, word))

    st.markdown(
        '<div class="mx-hero"><div class="mx-heroflex">'
        '<img class="mx-heroimg" src="%s" alt="%s">'
        '<div><div class="mx-eyebrow">Fit Check</div>'
        '<h2>Because your <b>%s</b> in size %s fits you, we think <b>%d of the %d items</b> '
        'in your wishlist will fit you too.</h2>'
        '<div class="mx-sub">We never ask your size. We read the measurements of clothes you '
        'have already bought and kept, work out what genuinely fits your body, and check every '
        'saved item against that — measurement by measurement.</div>'
        '<div class="mx-chips">%s%s%s</div></div></div></div>'
        % (url, alt_txt, title(anchor["garment"]), anchor["size"], good, len(rv["rows"]),
           chip(fe.FITS, good, "should fit"),
           chip(fe.CANT_SAY, c[fe.CANT_SAY], "we can't call yet"),
           chip(fe.WRONG_SIZE, c[fe.WRONG_SIZE], "wrong size saved")),
        unsafe_allow_html=True)

    st.write("")
    if unlock_block(rv, "home"):
        st.write("")

    st.markdown('<div class="mx-sec">Saved most recently</div>', unsafe_allow_html=True)
    grid(sorted(rv["rows"], key=lambda r: r["days"])[:3], rv["ctx"], "home")


def page_wishlist(p, rv, query):
    c = rv["counts"]
    order = [fe.FITS, fe.LIKELY, fe.CANT_SAY, fe.WRONG_SIZE]

    # Options are the status constants, never the labels, and every status is
    # always offered. Folding the counts into the option text would invalidate
    # the stored selection the moment a measurement changes those counts, and
    # dropping empty statuses would make an option vanish under the user.
    def flabel(s):
        if s == "all":
            return "Everything (%d)" % len(rv["rows"])
        return "%s (%d)" % (styles.STATUS[s]["label"], c[s])

    pick = st.radio("Filter", ["all"] + order, horizontal=True, format_func=flabel,
                    label_visibility="collapsed", key="wishfilter")

    if unlock_block(rv, "wish"):
        st.write("")

    shown = rv["rows"]
    if pick != "all":
        shown = [r for r in shown if r["result"]["status"] == pick]
    if query:
        shown = [r for r in shown if query in title(r["gid"]).lower()]
        st.markdown('<div class="mx-note">%d saved %s “%s”.</div>'
                    % (len(shown), "item matches" if len(shown) == 1 else "items match", query),
                    unsafe_allow_html=True)
        st.write("")

    if not shown:
        st.markdown('<div class="mx-note">Nothing here yet.</div>', unsafe_allow_html=True)
    grid(shown, rv["ctx"], "w")
    gaps_block(rv)


VERDICT_WORDS = {"perfect": ("Fits perfectly", "#03a685"), "tight": ("Too tight", "#d8434e"),
                 "loose": ("Too loose", "#c77a1a"), "short": ("Too short", "#c77a1a"),
                 "long": ("Too long", "#c77a1a")}


def page_profile(p, rv):
    st.markdown('<div class="mx-sec">Where this came from</div>'
                '<div class="mx-note">These are your past Myntra orders. What you kept is a '
                'garment that fits. What you returned for a size reason is a boundary we will '
                'not cross again. You typed none of it in.</div>', unsafe_allow_html=True)
    st.write("")

    cols = st.columns(2, gap="medium")
    for i, entry in enumerate(p["wardrobe"]):
        g = GARMENTS[entry["garment"]]
        word, color = VERDICT_WORDS[entry["verdict"]]
        if entry.get("dims"):
            word += " · " + ", ".join(DIMENSIONS[d]["label"].lower() for d in entry["dims"])
        known = g["sizes"][entry["size"]]
        mine = {d: v for (gg, d), v in st.session_state.extra.items() if gg == entry["garment"]}
        measured = ", ".join('%s %.1f"' % (DIMENSIONS[d]["label"], v)
                             for d, v in sorted(known.items()) if d in DIMENSIONS)
        if mine:
            measured += " · " + ", ".join('%s %.1f" (you measured)' % (DIMENSIONS[d]["label"], v)
                                          for d, v in mine.items())
        url, alt_txt = image(entry["garment"], 200, 267)
        cols[i % 2].markdown(
            '<div class="mx-ward"><img class="mx-wardimg" src="%s" alt="%s"><div>'
            '<div class="mx-brand">%s</div><div class="mx-name">%s · size %s</div>'
            '<div style="margin-top:7px"><span class="mx-pill" style="background:#f7f7f8;'
            'color:%s">%s</span></div>'
            '<div class="mx-conflabel" style="margin-top:8px">%s</div>'
            '<div class="mx-src" style="margin-top:5px">%s</div></div></div>'
            % (url, alt_txt, g["brand"], g["name"], entry["size"], color, word,
               measured, entry.get("note", "")), unsafe_allow_html=True)
        cols[i % 2].write("")

    st.markdown('<div class="mx-sec">Add something you own</div>'
                '<div class="mx-note">Anything you wear, from anywhere. Every garment you add '
                'sharpens every verdict on your wishlist.</div>', unsafe_allow_html=True)
    st.write("")

    owned = {e["garment"] for e in p["wardrobe"]}
    options = sorted((gid for gid in GARMENTS if gid not in owned), key=title)
    with st.form("addgarment", border=False):
        c1, c2, c3 = st.columns([4, 1.4, 2.2])
        gid = c1.selectbox("Garment", options, format_func=title, key="add_gid")
        c2.selectbox("Size", list(GARMENTS[gid]["sizes"]), key="add_size")
        c3.selectbox("How does it fit?", list(VERDICT_WORDS), key="add_verdict",
                     format_func=lambda v: VERDICT_WORDS[v][0])
        st.multiselect("Where, if it is not perfect",
                       CATEGORIES[GARMENTS[gid]["category"]]["critical"], key="add_dims",
                       format_func=lambda d: DIMENSIONS[d]["label"])
        st.form_submit_button("Add to my profile", type="primary", on_click=add_garment)
    if st.session_state.get("add_error"):
        st.warning(st.session_state.add_error)

    st.markdown('<div class="mx-sec">What we now know about your body</div>'
                '<div class="mx-note">Not your measurements — the <i>garment</i> measurements '
                'proven to work on you. A hard limit is one you found out the hard way.</div>',
                unsafe_allow_html=True)
    st.write("")
    lines = []
    for key, e in sorted(rv["env"].items(), key=lambda kv: (kv[0][1], kv[0][2])):
        if not e["has_any"]:
            continue
        owner = key[1] if key[0] == "region" else CATEGORIES[key[1]]["label"].lower()
        bits = []
        if e["band_lo"] is not None:
            bits.append('proven %.1f–%.1f"' % (e["band_lo"], e["band_hi"]))
        if e["hard_lo"] is not None:
            bits.append('never below %.1f"' % e["hard_lo"])
        if e["hard_hi"] is not None:
            bits.append('never above %.1f"' % e["hard_hi"])
        lines.append('<div class="mx-dimrow" style="grid-template-columns:130px 100px 1fr">'
                     '<div class="lab">%s</div><div class="val">%s</div>'
                     '<div class="mx-note">%s</div></div>'
                     % (DIMENSIONS[key[2]]["label"], owner, " · ".join(bits)))
    st.markdown("".join(lines), unsafe_allow_html=True)


# --------------------------------------------------------------------------

def main():
    boot()
    query = header()
    p = persona()
    rv = fe.review_wishlist(p, dict(st.session_state.extra))

    if st.session_state.page == "Home":
        page_home(p, rv)
    elif st.session_state.page == "Wishlist":
        page_wishlist(p, rv, query)
    else:
        page_profile(p, rv)
    footer()


main()
