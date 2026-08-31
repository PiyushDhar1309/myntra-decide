"""Seed catalog: garments, their published measurements, and two shoppers.

Every measurement below is a garment measurement in inches, taken round for
circumferences (flat x 2) and edge to edge for lengths. A dimension that is
absent from a size dict is one the brand does not publish - that absence is
data, not an oversight, and the engine reports it rather than guessing.

The two shoppers come from the user interviews. Ananya is petite and stalls on
length; Rohan is tall and broad and stalls on chest, sleeve and fabric give.
"""

# --------------------------------------------------------------------------
# Garments
# --------------------------------------------------------------------------
# elastane is the fraction of the fabric that is elastane, used for give.
# sleeve is the sleeve style ("full" unless stated) and scopes sleeve evidence.
# silhouette "oversized" or "relaxed" means room above the wearer's usual is the
# design intent, so the engine reports it instead of calling it a bad fit.

GARMENTS = {
    # ---------------- Ananya's wardrobe ----------------
    "g_biba_kurta": {
        "brand": "Biba", "name": "Cotton Anarkali Kurta", "category": "kurta",
        "price": 1899, "fabric": "100% cotton", "elastane": 0.0,
        "sizes": {"S": {"chest": 38.0, "waist": 36.0, "length": 44.0, "sleeve_length": 22.5}},
    },
    "g_mh_shirtdress": {
        "brand": "Mast & Harbour", "name": "Cotton Shirt Dress", "category": "dress",
        "price": 1599, "fabric": "97% cotton, 3% elastane", "elastane": 0.03,
        "sizes": {"S": {"chest": 38.5, "waist": 37.0, "hip": 40.0, "length": 36.0}},
    },
    "g_hm_ribbed": {
        "sleeve": "short",
        "brand": "H&M", "name": "Ribbed Fitted Top", "category": "top",
        "price": 799, "fabric": "95% cotton, 5% elastane", "elastane": 0.05,
        "sizes": {"XS": {"chest": 33.0, "shoulder": 13.5, "sleeve_length": 5.0, "length": 22.0}},
    },
    "g_zara_blazer": {
        "brand": "Zara", "name": "Structured Blazer", "category": "outerwear",
        "price": 4990, "fabric": "63% polyester, 34% viscose, 3% elastane", "elastane": 0.03,
        "sizes": {"S": {"chest": 39.0, "shoulder": 15.5, "sleeve_length": 23.0, "length": 25.0}},
    },
    "g_levis_711": {
        "brand": "Levi's", "name": "711 Skinny Jeans", "category": "jeans",
        "price": 3299, "fabric": "92% cotton, 6% polyester, 2% elastane", "elastane": 0.02,
        # Levi's publishes the body block for this fit but not the inseam.
        "sizes": {"26": {"waist": 26.0, "hip": 34.0, "thigh": 20.0}},
    },
    "g_w_palazzo": {
        "brand": "W for Woman", "name": "Solid Palazzo", "category": "palazzo",
        "price": 1299, "fabric": "100% rayon", "elastane": 0.0,
        "sizes": {"26": {"waist": 26.5, "hip": 38.0, "length": 39.0}},
    },

    # ---------------- Ananya's wishlist ----------------
    "w_levis_314": {
        "brand": "Levi's", "name": "314 Shaping Straight Jeans", "category": "jeans",
        "price": 3499, "fabric": "94% cotton, 4% polyester, 2% elastane", "elastane": 0.02,
        "sizes": {
            "26": {"waist": 26.5, "hip": 35.0, "thigh": 21.0, "inseam": 30.0},
            "28": {"waist": 28.5, "hip": 37.0, "thigh": 22.0, "inseam": 30.0},
        },
    },
    "w_only_wideleg": {
        "brand": "ONLY", "name": "High Rise Wide Leg Jeans", "category": "jeans",
        "price": 2999, "fabric": "100% cotton", "elastane": 0.0,
        "silhouette": "relaxed",
        "sizes": {
            "26": {"waist": 26.0, "hip": 36.5, "thigh": 23.0, "inseam": 31.5},
            "28": {"waist": 28.0, "hip": 38.5, "thigh": 24.0, "inseam": 31.5},
        },
    },
    "w_vh_trousers": {
        "brand": "Van Heusen Woman", "name": "Tapered Formal Trousers", "category": "trousers",
        "price": 2199, "fabric": "68% polyester, 30% viscose, 2% elastane", "elastane": 0.02,
        "sizes": {
            "26": {"waist": 26.5, "hip": 36.0, "inseam": 29.5},
            "28": {"waist": 28.5, "hip": 38.0, "inseam": 29.5},
        },
    },
    "w_w_palazzo2": {
        "brand": "W for Woman", "name": "Printed Flared Palazzo", "category": "palazzo",
        "price": 1499, "fabric": "100% viscose rayon", "elastane": 0.0,
        "sizes": {
            "26": {"waist": 26.5, "hip": 38.5, "length": 40.5},
            "28": {"waist": 28.5, "hip": 40.5, "length": 40.5},
        },
    },
    "w_libas_anarkali": {
        "brand": "Libas", "name": "Floral Anarkali Kurta", "category": "kurta",
        "price": 2099, "fabric": "100% viscose rayon", "elastane": 0.0,
        "sizes": {
            "S": {"chest": 38.5, "waist": 37.0, "length": 45.0, "sleeve_length": 22.0},
            "M": {"chest": 40.5, "waist": 39.0, "length": 45.5, "sleeve_length": 22.5},
        },
    },
    "w_hm_oversized": {
        "brand": "H&M", "name": "Oversized Poplin Shirt", "category": "top",
        "price": 1499, "fabric": "100% cotton", "elastane": 0.0,
        "silhouette": "oversized",
        "sizes": {
            "S": {"chest": 44.0, "shoulder": 17.5, "sleeve_length": 23.5, "length": 28.0},
            "M": {"chest": 46.0, "shoulder": 18.0, "sleeve_length": 24.0, "length": 28.5},
        },
    },
    "w_zara_midi": {
        "brand": "Zara", "name": "Ribbed Knit Midi Dress", "category": "dress",
        "price": 3590, "fabric": "70% viscose, 25% polyamide, 5% elastane", "elastane": 0.05,
        "sizes": {
            "S": {"chest": 32.5, "waist": 31.0, "hip": 36.0, "length": 44.0},
            "M": {"chest": 35.0, "waist": 33.5, "hip": 38.5, "length": 44.5},
        },
    },
    "w_anouk_lehenga": {
        "brand": "Anouk", "name": "Embroidered Lehenga Set", "category": "occasion",
        "price": 6499, "fabric": "100% raw silk, unlined", "elastane": 0.0,
        "sizes": {
            "S": {"chest": 38.0, "waist": 36.0, "length": 42.0},
            "M": {"chest": 40.0, "waist": 38.0, "length": 42.5},
        },
    },

    # ---------------- Rohan's wardrobe ----------------
    "g_roadster_puffer": {
        "brand": "Roadster", "name": "Hooded Puffer Jacket", "category": "outerwear",
        "price": 3999, "fabric": "96% nylon, 4% elastane", "elastane": 0.04,
        "sizes": {"L": {"chest": 46.0, "shoulder": 19.0, "sleeve_length": 26.0, "length": 29.0}},
    },
    "g_vh_formal_shirt": {
        "brand": "Van Heusen", "name": "Formal Cotton Shirt", "category": "top",
        "price": 2299, "fabric": "100% cotton", "elastane": 0.0,
        "sizes": {"42": {"chest": 45.0, "shoulder": 18.5, "sleeve_length": 25.5, "length": 31.0}},
    },
    "g_allen_solly_shirt": {
        "brand": "Allen Solly", "name": "Slim Fit Casual Shirt", "category": "top",
        "price": 1999, "fabric": "100% cotton", "elastane": 0.0,
        "sizes": {"40": {"chest": 42.0, "shoulder": 17.5, "sleeve_length": 24.0, "length": 30.0}},
    },
    "g_hrx_tshirt": {
        "sleeve": "short",
        "brand": "HRX", "name": "Rapid Dry Training Tee", "category": "top",
        "price": 899, "fabric": "92% polyester, 8% elastane", "elastane": 0.08,
        "sizes": {"L": {"chest": 44.0, "shoulder": 18.0, "sleeve_length": 9.0, "length": 29.0}},
    },
    "g_levis_505": {
        "brand": "Levi's", "name": "505 Regular Fit Jeans", "category": "jeans",
        "price": 3499, "fabric": "99% cotton, 1% elastane", "elastane": 0.01,
        "sizes": {"34": {"waist": 34.0, "hip": 42.0, "thigh": 24.5}},
    },

    # ---------------- Rohan's wishlist ----------------
    "w_hrx_windcheater": {
        "brand": "HRX", "name": "Packable Windcheater", "category": "outerwear",
        "price": 2799, "fabric": "100% polyester", "elastane": 0.0,
        "sizes": {
            "L": {"chest": 45.0, "shoulder": 18.5, "sleeve_length": 25.0, "length": 28.0},
            "XL": {"chest": 47.0, "shoulder": 19.5, "sleeve_length": 25.5, "length": 29.0},
        },
    },
    "w_zara_slimshirt": {
        "brand": "Zara", "name": "Slim Fit Textured Shirt", "category": "top",
        "price": 2990, "fabric": "100% cotton", "elastane": 0.0,
        "sizes": {
            "M": {"chest": 41.0, "shoulder": 17.0, "sleeve_length": 24.5, "length": 30.0},
            "L": {"chest": 43.5, "shoulder": 18.0, "sleeve_length": 25.0, "length": 30.5},
            "XL": {"chest": 46.0, "shoulder": 19.0, "sleeve_length": 25.5, "length": 31.0},
        },
    },
    "w_mh_casual_shirt": {
        "brand": "Mast & Harbour", "name": "Checked Casual Shirt", "category": "top",
        "price": 1799, "fabric": "100% cotton", "elastane": 0.0,
        # Sleeve length is simply not on this brand's chart.
        "sizes": {
            "L": {"chest": 43.0, "shoulder": 18.0, "length": 30.5},
            "XL": {"chest": 45.5, "shoulder": 18.5, "length": 31.5},
        },
    },
    "w_us_polo_shirt": {
        "brand": "U.S. Polo Assn.", "name": "Oxford Casual Shirt", "category": "top",
        "price": 2499, "fabric": "100% cotton", "elastane": 0.0,
        "sizes": {
            "L": {"chest": 43.0, "shoulder": 18.0, "sleeve_length": 25.0, "length": 30.5},
            "XL": {"chest": 45.0, "shoulder": 18.5, "sleeve_length": 25.5, "length": 31.0},
        },
    },
    "w_levis_512": {
        "brand": "Levi's", "name": "512 Slim Taper Jeans", "category": "jeans",
        "price": 3999, "fabric": "98% cotton, 2% elastane", "elastane": 0.02,
        "sizes": {
            "34": {"waist": 34.0, "hip": 41.0, "thigh": 23.5, "inseam": 32.0},
            "36": {"waist": 36.0, "hip": 43.0, "thigh": 24.5, "inseam": 32.0},
        },
    },
    "w_vh_chinos": {
        "brand": "Van Heusen", "name": "Slim Fit Chinos", "category": "trousers",
        "price": 2699, "fabric": "97% cotton, 3% elastane", "elastane": 0.03,
        "sizes": {
            "34": {"waist": 34.5, "hip": 42.0, "inseam": 32.5},
            "36": {"waist": 36.5, "hip": 44.0, "inseam": 32.5},
        },
    },
    "w_hm_overshirt": {
        "brand": "H&M", "name": "Relaxed Cotton Overshirt", "category": "outerwear",
        "price": 2299, "fabric": "100% cotton", "elastane": 0.0,
        "silhouette": "relaxed",
        "sizes": {
            "L": {"chest": 48.0, "shoulder": 20.0, "sleeve_length": 26.5, "length": 30.0},
            "XL": {"chest": 50.0, "shoulder": 20.5, "sleeve_length": 27.0, "length": 30.5},
        },
    },
}

# --------------------------------------------------------------------------
# Shoppers
# --------------------------------------------------------------------------
# A wardrobe entry is one past order. `verdict` is what the shopper said about
# it, either at return time or when asked afterwards:
#   perfect  - the whole garment fit
#   tight    - too small on `dims`
#   loose    - too large on `dims`
#   short    - too short on `dims`
#   long     - too long on `dims`
# `dims` names which measurements the complaint is about. Everything else on a
# flagged garment is treated as no evidence rather than as a pass, because a
# shopper who returns a shirt for a tight chest is not vouching for its hem.

PERSONAS = {
    "ananya": {
        "name": "Ananya",
        "blurb": "5'2\", petite. Buys ethnic and denim. Gets almost everything hemmed.",
        "segment": "Petite",
        "wardrobe": [
            {"garment": "g_biba_kurta",    "size": "S",  "verdict": "perfect", "dims": [],
             "note": "Your benchmark kurta. Bought twice."},
            {"garment": "g_mh_shirtdress", "size": "S",  "verdict": "perfect", "dims": [],
             "note": "Kept, worn often."},
            {"garment": "g_hm_ribbed",     "size": "XS", "verdict": "tight",   "dims": ["chest"],
             "note": "Returned. Reason given: size issue, too small."},
            {"garment": "g_zara_blazer",   "size": "S",  "verdict": "loose",   "dims": ["shoulder"],
             "note": "Kept, but the shoulders droop."},
            {"garment": "g_levis_711",     "size": "26", "verdict": "perfect", "dims": [],
             "note": "Fit through the body, but you had them hemmed.",
             "unresolved": {"dim": "inseam", "direction": "long",
                            "why": "You told us these were too long, but Levi's does not publish an inseam for this fit, so there is nothing to compare against."}},
            {"garment": "g_w_palazzo",     "size": "26", "verdict": "long",    "dims": ["length"],
             "note": "Kept, but pinned up at the hem."},
        ],
        "wishlist": [
            {"garment": "w_levis_314",     "size": "26", "days": 34},
            {"garment": "w_zara_midi",     "size": "S",  "days": 21},
            {"garment": "w_only_wideleg",  "size": "26", "days": 19},
            {"garment": "w_libas_anarkali","size": "S",  "days": 16},
            {"garment": "w_anouk_lehenga", "size": "S",  "days": 12},
            {"garment": "w_vh_trousers",   "size": "26", "days": 9},
            {"garment": "w_w_palazzo2",    "size": "26", "days": 6},
            {"garment": "w_hm_oversized",  "size": "S",  "days": 3},
        ],
    },
    "rohan": {
        "name": "Rohan",
        "blurb": "6'2\", broad through the chest. Sticks to two brands he trusts.",
        "segment": "Tall / broad",
        "wardrobe": [
            {"garment": "g_roadster_puffer",   "size": "L",  "verdict": "perfect", "dims": [],
             "note": "Your benchmark jacket."},
            {"garment": "g_vh_formal_shirt",   "size": "42", "verdict": "perfect", "dims": [],
             "note": "One of the two brands you keep going back to."},
            {"garment": "g_allen_solly_shirt", "size": "40", "verdict": "tight",   "dims": ["chest", "sleeve_length"],
             "note": "Returned. Pulled across the chest and the cuffs sat high."},
            {"garment": "g_hrx_tshirt",        "size": "L",  "verdict": "perfect", "dims": [],
             "note": "Kept."},
            {"garment": "g_levis_505",         "size": "34", "verdict": "perfect", "dims": [],
             "note": "Fit through the body.",
             "unresolved": {"dim": "inseam", "direction": "short",
                            "why": "You told us these sit just above the shoe, but Levi's does not publish an inseam for this fit."}},
        ],
        "wishlist": [
            {"garment": "w_hrx_windcheater",  "size": "L",  "days": 41},
            {"garment": "w_mh_casual_shirt",  "size": "XL", "days": 27},
            {"garment": "w_levis_512",        "size": "34", "days": 22},
            {"garment": "w_zara_slimshirt",   "size": "M",  "days": 15},
            {"garment": "w_vh_chinos",        "size": "34", "days": 11},
            {"garment": "w_us_polo_shirt",    "size": "XL", "days": 7},
            {"garment": "w_hm_overshirt",     "size": "L",  "days": 4},
        ],
    },
}

def garment(gid):
    return GARMENTS[gid]

def title(gid):
    g = GARMENTS[gid]
    return "%s %s" % (g["brand"], g["name"])


# --------------------------------------------------------------------------
# Presentation
# --------------------------------------------------------------------------
# Photography is kept out of the garment records above, which hold measurements
# only. Images are from Unsplash and are illustrative of the category; they are
# not photographs of the specific garments described here.

IMAGES = {
    "g_biba_kurta":        ("photo-1766994063823-ed214f883548", "woman in a floral print navy kurta"),
    "g_mh_shirtdress":     ("photo-1760287363750-1c888c75578f", "blue button-up shirt dress"),
    "g_hm_ribbed":         ("photo-1761121317492-57feee4fc674", "fitted red ribbed top"),
    "g_zara_blazer":       ("photo-1590588503756-08a4b2be5eb9", "white structured blazer"),
    "g_levis_711":         ("photo-1714143136372-ddaf8b606da7", "blue skinny jeans on a white background"),
    "g_w_palazzo":         ("photo-1762331224129-783a3ea1fc3f", "woman in solid black wide trousers"),
    "w_levis_314":         ("photo-1602293589930-45aad59ba3ab", "blue straight jeans on a hanger"),
    "w_only_wideleg":      ("photo-1475178626620-a4d074967452", "woman wearing wide leg jeans"),
    "w_vh_trousers":       ("photo-1594938252461-e42450664907", "tapered formal trousers with a belt"),
    "w_w_palazzo2":        ("photo-1781021110763-4c822884316d", "woman in printed flared trousers"),
    "w_libas_anarkali":    ("photo-1768478701597-bfcb51cd6cc2", "woman in a patterned anarkali kurta"),
    "w_hm_oversized":      ("photo-1596755094514-f87e34085b2c", "oversized poplin shirt on a hanger"),
    "w_zara_midi":         ("photo-1704775983177-8ae543524081", "woman in a dark ribbed midi dress"),
    "w_anouk_lehenga":     ("photo-1767955694884-d4bf352c23c2", "ornate yellow and maroon lehenga"),
    "g_roadster_puffer":   ("photo-1578964046312-69d266a3e739", "black hooded puffer jacket"),
    "g_vh_formal_shirt":   ("photo-1770058428099-f2d64ab34006", "light blue collared formal shirt"),
    "g_allen_solly_shirt": ("photo-1776838103951-993ff1ffc916", "tan collared slim shirt on a hanger"),
    "g_hrx_tshirt":        ("photo-1571455786673-9d9d6c194f90", "black crew neck training tee"),
    "g_levis_505":         ("photo-1605518215584-5ba74df5dfd8", "folded blue denim jeans"),
    "w_hrx_windcheater":   ("photo-1571867424485-369464ed33cc", "lightweight colour block windcheater"),
    "w_zara_slimshirt":    ("photo-1758600588319-fa4097ee5208", "man in a slim blue textured shirt"),
    "w_mh_casual_shirt":   ("photo-1782227282777-31e421d02eaf", "checked flannel shirts on a rail"),
    "w_us_polo_shirt":     ("photo-1781145822880-ab30339ac274", "man in a white oxford shirt"),
    "w_levis_512":         ("photo-1629244032690-1c243449f90a", "man in slim blue denim jeans"),
    "w_vh_chinos":         ("photo-1591078771377-d06325f68465", "man in slim grey chinos"),
    "w_hm_overshirt":      ("photo-1545273072-c541efad6ba6", "relaxed grey long sleeve overshirt"),
}

FALLBACK_IMAGE = ("photo-1523381294911-8d3cead13475", "clothing on a rail")


def image(gid, w=600, h=800):
    pid, alt = IMAGES.get(gid, FALLBACK_IMAGE)
    url = ("https://images.unsplash.com/%s?w=%d&h=%d&fit=crop&crop=entropy&q=80"
           % (pid, w, h))
    return url, alt


def pricing(gid):
    """A stable list price and discount, so the storefront reads like a storefront."""
    price = GARMENTS[gid]["price"]
    pct = 30 + (sum(ord(c) for c in gid) % 4) * 10
    mrp = int(round(price / (1.0 - pct / 100.0) / 10.0) * 10) - 1
    return price, mrp, pct
