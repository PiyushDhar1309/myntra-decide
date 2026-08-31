"""Presentation: the stylesheet, the product imagery and the range bars."""

import fit_engine as fe
from catalog import image, pricing

BRAND = "#ff3f6c"
INK = "#282c3f"
MUTED = "#7e818c"

STATUS = {
    fe.FITS:       {"label": "Should fit you", "short": "Should fit",  "color": "#03a685", "tint": "#e6f6f1"},
    fe.LIKELY:     {"label": "Probably fits",  "short": "Probably",    "color": "#c77a1a", "tint": "#fdf2e3"},
    fe.CANT_SAY:   {"label": "Can't say yet",  "short": "Can't say",   "color": "#4a5a80", "tint": "#eef1f8"},
    fe.WRONG_SIZE: {"label": "Not this size",  "short": "Wrong size",  "color": "#d8434e", "tint": "#fdeaea"},
}

CODE_TONE = {
    fe.OK:          ("#03a685", "works"),
    fe.CLEARS:      ("#03a685", "clears your limit"),
    fe.INTENDED:    ("#4a5a80", "cut this way on purpose"),
    fe.SNUG:        ("#c77a1a", "tighter than proven"),
    fe.ROOMY:       ("#c77a1a", "roomier than proven"),
    fe.FAIL_SMALL:  ("#d8434e", "past your limit"),
    fe.FAIL_LARGE:  ("#d8434e", "past your limit"),
    fe.UNKNOWN:     ("#9295a1", "nothing to compare against"),
    fe.UNPUBLISHED: ("#9295a1", "brand does not publish this"),
}


def photo(gid, w=600, h=800, cls="mx-img"):
    url, alt = image(gid, w, h)
    return '<img class="%s" src="%s" alt="%s" loading="lazy">' % (cls, url, alt)


def price_html(gid):
    p, mrp, pct = pricing(gid)
    return ('<div class="mx-price">Rs. %s <s>Rs. %s</s> <em>(%d%% OFF)</em></div>'
            % (format(p, ",d"), format(mrp, ",d"), pct))


def bar(finding):
    """A range bar: the proven band, and where this garment sits against it."""
    if finding["code"] in (fe.UNKNOWN, fe.UNPUBLISHED) or finding["value"] is None:
        return '<div class="mx-bar mx-bar-void"></div>'
    band = finding["band"]
    v = finding["value"]
    pts = [v] + [x for x in (band or []) if x is not None]
    lo, hi = min(pts), max(pts)
    pad = max(1.2, (hi - lo) * 0.45)
    lo, hi = lo - pad, hi + pad
    span = hi - lo or 1.0

    def pct(x):
        return max(0.0, min(100.0, (x - lo) / span * 100.0))

    out = ['<div class="mx-bar">']
    if band and band[0] is not None:
        out.append('<div class="mx-band" style="left:%.1f%%;width:%.1f%%"></div>'
                   % (pct(band[0]), pct(band[1]) - pct(band[0])))
    out.append('<div class="mx-dot" style="left:%.1f%%;background:%s"></div>'
               % (pct(v), CODE_TONE[finding["code"]][0]))
    out.append("</div>")
    return "".join(out)


CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap');

html, body, [class*="css"], .stApp, button, input { font-family: 'Assistant', -apple-system, 'Segoe UI', sans-serif; }
.stApp { background: #fff; }
.block-container { max-width: 1000px; padding-top: .6rem; padding-bottom: 4rem; }
#MainMenu, footer { visibility: hidden; height: 0; }
header[data-testid="stHeader"] { background: transparent; height: 0; }
section[data-testid="stSidebar"] { border-right: 1px solid #eaeaec; }

/* ---------- storefront header ---------- */
.mx-logo { font-weight: 800; font-size: 25px; letter-spacing: .01em; color: #282c3f; line-height: 1; }
.mx-logo span { color: #ff3f6c; }
.mx-logo small { display:block; font-size:9.5px; font-weight:700; letter-spacing:.22em;
                 color:#94969f; margin-top:3px; }
.mx-cats { display:flex; gap:22px; padding-top:10px; }
.mx-cats a { font-size:12.5px; font-weight:700; letter-spacing:.03em; text-transform:uppercase;
             color:#282c3f; text-decoration:none; padding-bottom:16px; border-bottom:3px solid transparent; }
.mx-cats a.on { border-bottom-color:#ff3f6c; }
.mx-rule { border-bottom:1px solid #eaeaec; margin: 2px 0 16px; }

/* real nav buttons, dressed as Myntra's icon rail */
.st-key-mxnav div[data-testid="stColumn"] { display:flex; align-items:center; }
.st-key-mxnav button { background:transparent !important; border:none !important;
    box-shadow:none !important; color:#282c3f !important; font-size:12px !important;
    font-weight:700 !important; letter-spacing:.03em; padding:6px 2px !important;
    border-bottom:3px solid transparent !important; border-radius:0 !important; }
.st-key-mxnav button:hover { color:#ff3f6c !important; }
.st-key-mxnav button[kind="primary"], .st-key-mxnav button[data-testid="stBaseButton-primary"] {
    color:#ff3f6c !important; border-bottom:3px solid #ff3f6c !important; }

.st-key-mxsearch input { background:#f5f5f6 !important; border:1px solid #f5f5f6 !important;
    border-radius:4px !important; font-size:14px !important; padding:11px 14px !important; }
.st-key-mxsearch input::placeholder { color:#94969f; }

/* ---------- hero ---------- */
.mx-hero { border:1px solid #eaeaec; border-radius:10px; padding:24px 26px; margin-bottom:6px;
           background:linear-gradient(135deg,#fff 0%,#fff6f8 62%,#fff1f4 100%); }
.mx-eyebrow { display:inline-block; font-size:10.5px; font-weight:800; letter-spacing:.16em;
              text-transform:uppercase; color:#fff; background:#ff3f6c; padding:4px 9px;
              border-radius:3px; margin-bottom:14px; }
.mx-hero h2 { font-size:23px; line-height:1.45; color:#282c3f; font-weight:600; margin:0; }
.mx-hero h2 b { font-weight:800; }
.mx-heroflex { display:flex; gap:18px; align-items:flex-start; }
.mx-heroimg { width:74px; height:99px; border-radius:6px; object-fit:cover; flex:none;
              border:1px solid #eaeaec; }
.mx-sub { color:#696b79; font-size:13.5px; line-height:1.7; margin-top:11px; }
.mx-chips { display:flex; gap:8px; flex-wrap:wrap; margin-top:17px; }
.mx-chip { border-radius:20px; padding:6px 14px; font-size:12px; font-weight:700; }

/* ---------- product card ---------- */
.mx-card { border:1px solid #f0f0f2; border-radius:8px; overflow:hidden; background:#fff;
           transition:box-shadow .18s ease; }
.mx-card:hover { box-shadow:0 4px 16px rgba(40,44,63,.13); }
.mx-imgwrap { position:relative; width:100%; aspect-ratio:3/4; background:#f5f5f6; overflow:hidden; }
.mx-img { width:100%; height:100%; object-fit:cover; display:block; }
.mx-badge { position:absolute; left:0; bottom:0; right:0; padding:7px 11px; font-size:11px;
            font-weight:800; letter-spacing:.04em; text-transform:uppercase;
            background:rgba(255,255,255,.94); backdrop-filter:blur(2px); }
.mx-saved { position:absolute; top:9px; right:9px; background:rgba(255,255,255,.93);
            border-radius:3px; padding:3px 7px; font-size:10.5px; font-weight:700; color:#696b79; }
.mx-body { padding:11px 13px 14px; }
.mx-brand { font-weight:800; font-size:15px; color:#282c3f; line-height:1.25; }
.mx-name { font-size:13px; color:#696b79; margin-top:1px; overflow:hidden;
           text-overflow:ellipsis; white-space:nowrap; }
.mx-price { font-size:13.5px; font-weight:700; color:#282c3f; margin-top:7px; }
.mx-price s { color:#94969f; font-weight:400; margin-left:5px; }
.mx-price em { color:#ff905a; font-style:normal; font-weight:700; margin-left:4px; }
.mx-size { display:inline-block; font-size:11px; font-weight:700; color:#696b79;
           border:1px solid #eaeaec; border-radius:3px; padding:2px 7px; margin-top:9px; }
.mx-fit { color:#282c3f; font-size:13px; line-height:1.62; margin-top:11px;
          border-top:1px solid #f4f4f6; padding-top:11px; }
.mx-alt { margin-top:9px; font-size:12.5px; color:#03a685; font-weight:700; }
.mx-conf { height:4px; background:#f0f0f2; border-radius:2px; margin-top:11px; overflow:hidden; }
.mx-conf > div { height:100%; border-radius:2px; }
.mx-conflabel { font-size:11px; color:#9295a1; margin-top:6px; line-height:1.5; }

/* ---------- measurement detail ---------- */
.mx-dimrow { display:grid; grid-template-columns:92px 58px 1fr 150px; gap:12px;
             align-items:center; padding:9px 0; border-bottom:1px solid #f4f4f6; }
.mx-dimrow .lab { font-size:12.5px; font-weight:700; color:#282c3f; }
.mx-dimrow .val { font-size:12.5px; color:#282c3f; font-variant-numeric:tabular-nums; }
.mx-dimrow .note { font-size:11.5px; text-align:right; line-height:1.4; }
.mx-bar { position:relative; height:6px; background:#f0f0f2; border-radius:3px; }
.mx-bar-void { background:repeating-linear-gradient(90deg,#f0f0f2 0 5px,#fff 5px 10px); }
.mx-band { position:absolute; top:0; height:6px; background:#c9e8de; border-radius:3px; }
.mx-dot { position:absolute; top:-3px; width:12px; height:12px; border-radius:50%;
          margin-left:-6px; border:2px solid #fff; box-shadow:0 0 0 1px rgba(40,44,63,.14); }

/* ---------- blocks ---------- */
.mx-unlock { border:1px solid #ffd2de; background:linear-gradient(135deg,#fff9fa,#fff2f5);
             border-radius:10px; padding:20px 22px; }
.mx-unlock .t { font-weight:800; color:#282c3f; font-size:16px; }
.mx-unlock .d { color:#535766; font-size:13.5px; line-height:1.7; margin-top:8px; }
.mx-note { color:#696b79; font-size:12.5px; line-height:1.7; }
.mx-src { color:#9295a1; font-size:11.5px; margin-top:11px; font-style:italic; }
.mx-sec { font-size:11.5px; font-weight:800; letter-spacing:.11em; text-transform:uppercase;
          color:#94969f; margin:28px 0 12px; }
.mx-ward { border:1px solid #f0f0f2; border-radius:8px; padding:11px; background:#fff;
           display:flex; gap:13px; align-items:flex-start; }
.mx-wardimg { width:62px; height:83px; border-radius:5px; object-fit:cover; flex:none; }
.mx-pill { display:inline-block; border-radius:3px; padding:3px 9px; font-size:11px; font-weight:800; }
.mx-foot { color:#9295a1; font-size:11.5px; line-height:1.7; border-top:1px solid #eaeaec;
           margin-top:36px; padding-top:16px; }
div[data-testid="stExpander"] details { border:1px solid #eaeaec; border-radius:8px; }
div[data-testid="stExpander"] summary { font-size:13px; font-weight:700; }
</style>
"""
