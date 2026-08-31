"""Presentation: the stylesheet, the product thumbnails and the range bars."""

import fit_engine as fe
from dims import CIRC

BRAND_PINK = "#ff3f6c"
INK = "#282c3f"
MUTED = "#7e818c"

STATUS = {
    fe.FITS:       {"label": "Should fit you",   "color": "#03a685", "tint": "#e8f6f2"},
    fe.LIKELY:     {"label": "Probably fits",    "color": "#e08a2e", "tint": "#fdf3e6"},
    fe.CANT_SAY:   {"label": "Can't say yet",    "color": "#5b6a8c", "tint": "#eef1f7"},
    fe.WRONG_SIZE: {"label": "Not this size",    "color": "#d8434e", "tint": "#fdecec"},
}

CODE_TONE = {
    fe.OK:          ("#03a685", "works"),
    fe.CLEARS:      ("#03a685", "clears your limit"),
    fe.INTENDED:    ("#5b6a8c", "cut this way on purpose"),
    fe.SNUG:        ("#e08a2e", "tighter than proven"),
    fe.ROOMY:       ("#e08a2e", "roomier than proven"),
    fe.FAIL_SMALL:  ("#d8434e", "past your limit"),
    fe.FAIL_LARGE:  ("#d8434e", "past your limit"),
    fe.UNKNOWN:     ("#8a8d99", "nothing to compare against"),
    fe.UNPUBLISHED: ("#8a8d99", "brand does not publish this"),
}

CATEGORY_ART = {
    "top":       ("#eef3fb", "#4f6ea8", "top"),
    "kurta":     ("#fbeef4", "#b25585", "dress"),
    "dress":     ("#f5eefb", "#7a58a8", "dress"),
    "occasion":  ("#fdf1e8", "#c07a3a", "dress"),
    "outerwear": ("#eef7f4", "#3d7f6e", "top"),
    "jeans":     ("#eaeff7", "#3a5680", "trouser"),
    "trousers":  ("#f2f1ee", "#6b6558", "trouser"),
    "palazzo":   ("#fbf0ee", "#a85d4f", "trouser"),
}

SHAPES = {
    "top": "M30,10 L18,18 L8,33 L19,42 L26,34 L26,112 L74,112 L74,34 L81,42 L92,33 L82,18 L70,10 L60,19 L50,23 L40,19 Z",
    "dress": "M31,10 L19,20 L11,34 L22,41 L29,31 L22,112 L78,112 L71,31 L78,41 L89,34 L81,20 L69,10 L60,19 L50,23 L40,19 Z",
    "trouser": "M27,10 L73,10 L78,112 L57,112 L50,56 L43,112 L22,112 Z",
}


def thumb(gid, garments, h=104):
    g = garments[gid]
    bg, fg, shape = CATEGORY_ART.get(g["category"], ("#f1f1f3", "#8a8d99", "top"))
    return (
        '<svg viewBox="0 0 100 124" height="%d" width="%d" role="img" aria-label="%s">'
        '<rect width="100" height="124" rx="6" fill="%s"/>'
        '<path d="%s" fill="%s" opacity="0.9"/>'
        '</svg>' % (h, int(h * 100 / 124), g["name"], bg, SHAPES[shape], fg))


def bar(finding):
    """A range bar: the proven band, any hard limit, and where this garment sits."""
    if finding["code"] in (fe.UNKNOWN, fe.UNPUBLISHED) or finding["value"] is None:
        return ""
    band = finding["band"]
    v = finding["value"]
    pts = [v] + [x for x in (band or []) if x is not None]
    lo, hi = min(pts), max(pts)
    pad = max(1.2, (hi - lo) * 0.45)
    lo, hi = lo - pad, hi + pad
    span = hi - lo or 1.0

    def pct(x):
        return max(0.0, min(100.0, (x - lo) / span * 100.0))

    parts = ['<div class="fc-bar">']
    if band and band[0] is not None:
        parts.append('<div class="fc-band" style="left:%.1f%%;width:%.1f%%"></div>'
                     % (pct(band[0]), pct(band[1]) - pct(band[0])))
    color = CODE_TONE[finding["code"]][0]
    parts.append('<div class="fc-dot" style="left:%.1f%%;background:%s"></div>' % (pct(v), color))
    parts.append("</div>")
    return "".join(parts)


CSS = """
<style>
  .block-container { max-width: 880px; padding-top: 1rem; padding-bottom: 4rem; }
  #MainMenu, footer { visibility: hidden; height: 0; }
  /* The header carries the sidebar toggle, and the sidebar carries the whole
     navigation, so it is faded rather than removed. */
  header[data-testid="stHeader"] { background: transparent; }
  header[data-testid="stHeader"] [data-testid="stToolbar"] { display: none; }

  .fc-topbar { display:flex; align-items:center; gap:22px; border-bottom:1px solid #eaeaec;
               padding:6px 0 14px; margin-bottom:18px; }
  .fc-logo { font-weight:800; font-size:20px; letter-spacing:.14em; color:#282c3f; }
  .fc-logo span { color:#ff3f6c; }
  .fc-navlinks { display:flex; gap:20px; font-size:12px; font-weight:700; letter-spacing:.06em;
                 text-transform:uppercase; color:#282c3f; }
  .fc-navlinks .on { color:#ff3f6c; border-bottom:2px solid #ff3f6c; padding-bottom:2px; }
  .fc-demo { margin-left:auto; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
             color:#94969f; border:1px solid #eaeaec; border-radius:3px; padding:3px 8px; }

  .fc-hero { border:1px solid #eaeaec; border-radius:10px; padding:22px 24px; background:#fff;
             box-shadow:0 1px 3px rgba(40,44,63,.06); }
  .fc-eyebrow { font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
                color:#ff3f6c; margin-bottom:10px; }
  .fc-hero h2 { font-size:22px; line-height:1.42; color:#282c3f; font-weight:600; margin:0 0 6px; }
  .fc-hero h2 b { font-weight:800; }
  .fc-sub { color:#7e818c; font-size:13.5px; line-height:1.6; margin-top:8px; }

  .fc-chips { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }
  .fc-chip { border-radius:20px; padding:5px 13px; font-size:12px; font-weight:700; }

  .fc-card { border:1px solid #eaeaec; border-radius:8px; background:#fff; padding:14px 16px;
             display:flex; gap:16px; align-items:flex-start; }
  .fc-card .meta { flex:1; min-width:0; }
  .fc-brand { font-weight:800; color:#282c3f; font-size:14.5px; }
  .fc-name { color:#535766; font-size:13px; margin-top:1px; }
  .fc-price { color:#282c3f; font-weight:700; font-size:13px; margin-top:6px; }
  .fc-price s { color:#94969f; font-weight:400; margin-left:6px; }
  .fc-saved { color:#94969f; font-size:11.5px; margin-top:2px; }

  .fc-pill { display:inline-block; border-radius:4px; padding:4px 10px; font-size:11.5px;
             font-weight:800; letter-spacing:.03em; }
  .fc-headline { color:#282c3f; font-size:13.5px; line-height:1.65; margin-top:10px; }
  .fc-alt { margin-top:8px; font-size:12.5px; color:#03a685; font-weight:700; }

  .fc-conf { height:4px; background:#f0f0f2; border-radius:2px; margin-top:9px; overflow:hidden; }
  .fc-conf > div { height:100%; border-radius:2px; }
  .fc-conflabel { font-size:11px; color:#94969f; margin-top:5px; }

  .fc-dimrow { display:grid; grid-template-columns:96px 62px 1fr 168px; gap:12px;
               align-items:center; padding:9px 0; border-bottom:1px solid #f4f4f6; }
  .fc-dimrow .lab { font-size:12.5px; font-weight:700; color:#282c3f; }
  .fc-dimrow .val { font-size:12.5px; color:#282c3f; font-variant-numeric:tabular-nums; }
  .fc-dimrow .note { font-size:11.5px; text-align:right; }

  .fc-bar { position:relative; height:6px; background:#f0f0f2; border-radius:3px; }
  .fc-band { position:absolute; top:0; height:6px; background:#cfe9e1; border-radius:3px; }
  .fc-dot { position:absolute; top:-3px; width:12px; height:12px; border-radius:50%;
            margin-left:-6px; border:2px solid #fff; box-shadow:0 0 0 1px rgba(40,44,63,.12); }

  .fc-unlock { border:1px solid #ffd7e1; background:#fff7f9; border-radius:8px; padding:16px 18px; }
  .fc-unlock .t { font-weight:800; color:#282c3f; font-size:14.5px; }
  .fc-unlock .d { color:#535766; font-size:13px; line-height:1.65; margin-top:6px; }

  .fc-note { color:#7e818c; font-size:12.5px; line-height:1.6; }
  .fc-src { color:#94969f; font-size:11.5px; margin-top:10px; font-style:italic; }
  .fc-sec { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
            color:#94969f; margin:26px 0 10px; }
  .fc-ward { border:1px solid #eaeaec; border-radius:8px; padding:12px 14px; background:#fff;
             display:flex; gap:13px; align-items:center; }
  div[data-testid="stExpander"] details { border:1px solid #eaeaec; border-radius:8px; }
</style>
"""
