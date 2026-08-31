"""Dimension vocabulary shared by the catalog and the fit engine.

Two ideas do the real work here.

`kind` decides how a mismatch is judged. A circumference that is smaller than
something the user has already called too tight is a hard failure; the same
circumference running large is a style choice, not a defect, so it is only ever
flagged. Lengths and shoulder width fail in both directions - a sleeve that is
too long is as wrong as one that is too short.

`region` decides what a measurement is allowed to vouch for. Circumference
evidence pools across a body region, because a bust that fits in a kurta tells
you something real about a dress. Design-anchored lengths never pool outside
their own category: a kurta being 44" long says nothing about the right length
for a shirt, and a cap sleeve says nothing about a full one.

Inseam and rise are the exception. They are body-anchored - crotch to floor does
not change because the garment is denim rather than twill - so they pool across
the region like a circumference does. Hem length and sleeve length are choices a
designer makes; an inseam is a fact about the person.

Bust and chest are the same measurement under two naming conventions, so only
`chest` is stored. CATEGORY_DIM_LABELS renames it for display where a brand
would say bust.
"""

CIRC = "circ"      # low side is a hard fail, high side is a soft flag
WIDTH = "width"    # hard on both sides
LENGTH = "length"  # hard on both sides, and never pools across categories

UPPER = "upper"
LOWER = "lower"

DIMENSIONS = {
    "chest":         {"label": "Chest",    "kind": CIRC,   "stretchy": True},
    "waist":         {"label": "Waist",    "kind": CIRC,   "stretchy": True},
    "hip":           {"label": "Hip",      "kind": CIRC,   "stretchy": True},
    "thigh":         {"label": "Thigh",    "kind": CIRC,   "stretchy": True},
    "shoulder":      {"label": "Shoulder", "kind": WIDTH,  "stretchy": False},
    "length":        {"label": "Length",   "kind": LENGTH, "stretchy": False},
    "sleeve_length": {"label": "Sleeve",   "kind": LENGTH, "stretchy": False},
    "inseam":        {"label": "Inseam",   "kind": LENGTH, "stretchy": False},
    "rise":          {"label": "Rise",     "kind": LENGTH, "stretchy": False},
}

# Every garment category, the region its circumferences belong to, and the
# dimensions that actually decide whether it fits.
CATEGORIES = {
    "top":       {"label": "Top",        "region": UPPER, "critical": ["chest", "shoulder", "sleeve_length", "length"]},
    "kurta":     {"label": "Kurta",      "region": UPPER, "critical": ["chest", "waist", "length", "sleeve_length"]},
    "dress":     {"label": "Dress",      "region": UPPER, "critical": ["chest", "waist", "hip", "length"]},
    "outerwear": {"label": "Outerwear",  "region": UPPER, "critical": ["chest", "shoulder", "sleeve_length", "length"]},
    "occasion":  {"label": "Occasion",   "region": UPPER, "critical": ["chest", "waist", "length"]},
    "jeans":     {"label": "Jeans",      "region": LOWER, "critical": ["waist", "hip", "thigh", "inseam"]},
    "trousers":  {"label": "Trousers",   "region": LOWER, "critical": ["waist", "hip", "inseam"]},
    "palazzo":   {"label": "Palazzo",    "region": LOWER, "critical": ["waist", "hip", "length"]},
}

def region_of(category):
    return CATEGORIES[category]["region"]

def kind_of(dim):
    return DIMENSIONS[dim]["kind"]

def is_length(dim):
    return DIMENSIONS[dim]["kind"] == LENGTH

# Body-anchored lengths. These pool across a region like circumferences do.
BODY_ANCHORED = {"inseam", "rise"}

# Where a brand would print "bust" rather than "chest".
CATEGORY_DIM_LABELS = {
    "kurta":    {"chest": "Bust"},
    "dress":    {"chest": "Bust"},
    "occasion": {"chest": "Bust"},
}

def label_of(dim, category=None):
    if category:
        override = CATEGORY_DIM_LABELS.get(category, {}).get(dim)
        if override:
            return override
    return DIMENSIONS[dim]["label"]

def scope_key(category, dim, sleeve=None):
    """Where evidence about (category, dim) is allowed to apply.

    Circumference, shoulder and body-anchored lengths carry across a whole body
    region. Design-anchored lengths stay locked to the category they came from.

    Sleeve length is scoped tighter still, by sleeve style, because a category
    alone does not make two sleeves comparable - a training tee and a formal
    shirt are both tops, and 9" against 25.5" is not evidence of anything.
    """
    if dim == "sleeve_length":
        return ("cat", category, dim, sleeve or "full")
    if is_length(dim) and dim not in BODY_ANCHORED:
        return ("cat", category, dim)
    return ("region", region_of(category), dim)

# Elastane content converts into usable give on circumference dimensions.
# Deliberately conservative: a garment does not hand you its full stretch as
# wearable room, and the last of it is never comfortable.
def usable_stretch(elastane_fraction):
    if not elastane_fraction:
        return 0.0
    return min(0.075, elastane_fraction * 1.6)
