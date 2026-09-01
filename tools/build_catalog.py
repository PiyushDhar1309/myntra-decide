"""Generate docs/data.js - the storefront catalog.

Written as a generator rather than by hand so that fifty products stay
internally consistent: prices agree with their MRP and discount, ratings agree
with the reviews beneath them, and every product carries the same attribute
vocabulary. That vocabulary is what the comparison engine diffs against, so a
missing field is a hole in the product, not a cosmetic gap.

Three decision clusters are specified explicitly, because they are the demo:
sets of near-identical items that a shopper would genuinely be choosing
between. Everything else is ordinary stock so the wishlist does not look staged.
"""

import json, os, random, sys

random.seed(20260901)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SIZES_ALPHA = ["XS", "S", "M", "L", "XL"]
SIZES_NUM = ["26", "28", "30", "32", "34"]

# ---------------------------------------------------------------- reviews
PRAISE = [
    ("Exactly as pictured", "Colour is true to the photos and the stitching is neat. Wore it to a family function and got compliments all evening."),
    ("Lovely fabric", "Soft, doesn't cling, and it hasn't lost shape after two washes. Worth the price."),
    ("Great for the price", "Was not expecting this quality at this range. Would buy another colour."),
    ("Comfortable all day", "Breathable and easy to move in. Ended up wearing it three times in a fortnight."),
    ("Good finish", "Hems and seams are clean, no loose threads. Packaging was decent too."),
]
MIXED = [
    ("Nice but runs long", "Lovely piece, though I had to get the length taken up. Factor in alteration time."),
    ("Colour slightly different", "A shade darker than the listing photos. Still happy with it, but be aware."),
    ("Good, delivery was slow", "No complaints about the product itself. Took longer to arrive than the estimate said."),
    ("Fabric is thinner than expected", "Fine for daytime, but you can see through it in strong light. Wear a slip."),
]
GRIPE = [
    ("Not as shown", "The fabric feels much cheaper in person than it looks online. Returned it."),
    ("Creases badly", "Looks great for about an hour, then it's a mess of wrinkles."),
    ("Stitching came loose", "A seam gave way the second time I wore it. Disappointing."),
]

def reviews_for(rating, n):
    """Pick review snippets consistent with the headline rating."""
    out = []
    pool = (PRAISE * 3 + MIXED) if rating >= 4.2 else (PRAISE + MIXED * 2 + GRIPE) if rating >= 3.8 else (MIXED + GRIPE * 2)
    for title, body in random.sample(pool, min(n, len(set(pool)))):
        stars = 5 if (title, body) in PRAISE else 3 if (title, body) in MIXED else 2
        out.append({"stars": stars, "title": title, "body": body,
                    "size": random.choice(SIZES_ALPHA[1:4]),
                    "when": random.choice(["2 weeks ago", "last month", "3 weeks ago", "2 months ago"])})
    return out

def money(price, off):
    mrp = int(round(price / (1 - off / 100.0) / 10) * 10) - 1
    return mrp

def product(pid, brand, name, cat, sub, colour, price, off, rating, count,
            fabric, pattern, sleeve, length, fit, occasion, wash,
            photos, delivery, returns, sizes=None, oos=(), desc=None, seller=None):
    sizes = sizes or SIZES_ALPHA
    return {
        "id": pid, "brand": brand, "name": name, "category": cat, "sub": sub,
        "colour": colour, "price": price, "mrp": money(price, off), "off": off,
        "rating": rating, "ratingCount": count,
        "sizes": [{"label": s, "inStock": s not in oos} for s in sizes],
        "fabric": fabric, "pattern": pattern, "sleeve": sleeve, "length": length,
        "fit": fit, "occasion": occasion, "wash": wash,
        "delivery": delivery, "returns": returns,
        "seller": seller or (brand + " Retail"),
        "photos": photos,
        "desc": desc or f"{colour} {name.lower()} in {fabric.lower()}. {pattern} pattern with {sleeve.lower()} and a {fit.lower()} silhouette. Suited to {occasion.lower()}.",
        "reviews": reviews_for(rating, 3),
    }

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import images as IMGPOOL

_used = set()

def _cycle(name, taken):
    """Hand out photo ids, never repeating one.

    Prefers the pool matching the product's category so a kurta never shows a
    pair of jeans. If that pool runs dry it borrows from whatever is still
    unused elsewhere - a slightly-off photo beats the same photo twice.
    """
    def gen():
        for pid in IMGPOOL.ALL[name]:
            if pid not in taken and pid not in _used:
                _used.add(pid)
                yield pid
        while True:
            spare = [p for v in IMGPOOL.ALL.values() for p in v
                     if p not in taken and p not in _used]
            if not spare:
                raise RuntimeError("image pool exhausted - add more ids to tools/images.py")
            _used.add(spare[0])
            yield spare[0]
    return gen()

P = []  # products

# ------------------------------------------------- CLUSTER A: anarkali kurtas
# Six festive kurtas in one price band. A shopper saving these has made one
# decision - "a kurta for the wedding" - and deferred which. They differ on
# fabric, sleeve, length, delivery and returns, and on nothing else that matters.
A = [
    ("libas_anar",  "Libas",        "Floral Anarkali Kurta",     "Maroon", 2099, 45, 4.3, 3421, "Viscose Rayon", "Floral",   "Three-quarter sleeves", "Calf length",  "Flared",  "Festive",  "Machine wash", "1768478701597-bfcb51cd6cc2", 4, 30),
    ("biba_anar",   "Biba",         "Embroidered Anarkali",      "Red",    2699, 40, 4.5, 6180, "Pure Cotton",   "Embroidered","Full sleeves",        "Ankle length", "Flared",  "Festive",  "Hand wash",    "1759840278276-fe8d58873dc3", 2, 30),
    ("w_anar",      "W for Woman",  "Printed Anarkali Kurta",    "Navy",   1899, 50, 4.1, 2044, "Viscose Rayon", "Printed",  "Three-quarter sleeves", "Calf length",  "Flared",  "Festive",  "Machine wash", "1766994063823-ed214f883548", 3, 14),
    ("aurelia_anar","Aurelia",      "Solid Anarkali Kurta",      "Rust",   1799, 55, 3.9, 1187, "Poly Crepe",    "Solid",    "Sleeveless",           "Knee length",  "Flared",  "Festive",  "Machine wash", "1763559046515-1b98e82bc6d4", 7, 14),
    ("anouk_anar",  "Anouk",        "Zari Work Anarkali",        "Wine",   2499, 45, 4.4, 4903, "Georgette",     "Zari work","Full sleeves",         "Ankle length", "Flared",  "Wedding",  "Dry clean",    "1759840279499-f9de9764b2cf", 2, 30),
    ("sangria_anar","Sangria",      "Chikankari Anarkali",       "Ivory",  2299, 50, 4.0, 1562, "Cotton Blend",  "Chikankari","Three-quarter sleeves","Calf length",  "Flared",  "Festive",  "Hand wash",    "1763817959593-c3ec2b1ec257", 5, 7),
]
for pid, brand, name, col, price, off, rat, cnt, fab, pat, slv, ln, fit, occ, wash, ph, dlv, ret in A:
    P.append(product(pid, brand, name, "Ethnic Wear", "Kurtas", col, price, off, rat, cnt,
                     fab, pat, slv, ln, fit, occ, wash, [ph], dlv, ret,
                     oos=("XS",) if pid in ("aurelia_anar", "sangria_anar") else ()))

# ------------------------------------------------- CLUSTER B: wide leg jeans
B = [
    ("only_wide",   "ONLY",       "High Rise Wide Leg Jeans", "Mid Blue",  2999, 40, 4.2, 2870, "100% Cotton",      "Solid", "Sleeveless", "Full length", "Wide leg", "Casual", "Machine wash", "1475178626620-a4d074967452", 3, 30),
    ("levis_wide",  "Levi's",     "Ribcage Wide Leg Jeans",   "Light Blue",3499, 30, 4.6, 5241, "99% Cotton, 1% Elastane", "Solid", "Sleeveless", "Full length", "Wide leg", "Casual", "Machine wash", "1714143136372-ddaf8b606da7", 2, 30),
    ("hm_wide",     "H&M",        "Wide Leg Denim Trousers",  "Ecru",      1999, 50, 3.8, 934,  "100% Cotton",      "Solid", "Sleeveless", "Ankle length","Wide leg", "Casual", "Machine wash", "1718252540511-e958742e4165", 6, 14),
    ("roadster_wide","Roadster",  "Relaxed Wide Leg Jeans",   "Dark Blue", 2199, 55, 4.0, 1608, "98% Cotton, 2% Elastane", "Washed","Sleeveless","Full length", "Wide leg", "Casual", "Machine wash", "1714143164072-7646ef5cb24d", 4, 14),
]
for pid, brand, name, col, price, off, rat, cnt, fab, pat, slv, ln, fit, occ, wash, ph, dlv, ret in B:
    P.append(product(pid, brand, name, "Western Wear", "Jeans", col, price, off, rat, cnt,
                     fab, pat, slv, ln, fit, occ, wash, [ph], dlv, ret,
                     sizes=SIZES_NUM, oos=("26",) if pid == "hm_wide" else ()))

# ------------------------------------------------- CLUSTER C: occasion dresses
C = [
    ("zara_midi",   "Zara",        "Ribbed Knit Midi Dress",  "Black",   3490, 30, 4.3, 1892, "Viscose Blend", "Solid",  "Full sleeves",         "Midi",  "Bodycon", "Party",   "Hand wash",   "1704775983177-8ae543524081", 3, 14),
    ("mango_midi",  "MANGO",       "Satin Slip Dress",        "Emerald", 3299, 40, 4.1, 1104, "Satin",         "Solid",  "Sleeveless",           "Midi",  "A-line",  "Party",   "Dry clean",   "1619715613791-89d35b51ff81", 5, 14),
    ("vero_midi",   "Vero Moda",   "Floral Wrap Dress",       "Blush",   2599, 50, 4.2, 3310, "Poly Crepe",    "Floral", "Three-quarter sleeves","Midi",  "Wrap",    "Brunch",  "Machine wash","1763637896841-cd5a1bb18208", 2, 30),
    ("hm_midi",     "H&M",         "Pleated Midi Dress",      "Navy",    2199, 45, 3.9, 762,  "Poly Georgette","Pleated","Short sleeves",        "Midi",  "A-line",  "Party",   "Machine wash","1616313253719-c46514cddee1", 6, 14),
    ("aki_midi",    "AND",         "Column Midi Dress",       "Ink Blue",3499, 35, 4.4, 2205, "Poly Blend",    "Solid",  "Sleeveless",           "Midi",  "Column",  "Formal",  "Dry clean",   "1762342017325-85f63bbf38fb", 3, 30),
]
for pid, brand, name, col, price, off, rat, cnt, fab, pat, slv, ln, fit, occ, wash, ph, dlv, ret in C:
    P.append(product(pid, brand, name, "Western Wear", "Dresses", col, price, off, rat, cnt,
                     fab, pat, slv, ln, fit, occ, wash, [ph], dlv, ret,
                     oos=("XS", "XL") if pid == "hm_midi" else ()))

CLUSTER_IDS = {"A": [p[0] for p in A], "B": [p[0] for p in B], "C": [p[0] for p in C]}

# ------------------------------------------------- ordinary stock
REST = [
    # id, brand, name, cat, sub, colour, price, off, rating, count, fabric, pattern, sleeve, length, fit, occasion, wash, photo, delivery, returns, sizes
    ("biba_kurta_set","Biba","Cotton Kurta with Palazzo","Ethnic Wear","Kurta Sets","Indigo",2899,40,4.4,5120,"Pure Cotton","Block Print","Three-quarter sleeves","Calf length","Straight","Daily","Machine wash","1769063382610-6be8acb7552f",3,30,None),
    ("anouk_lehenga","Anouk","Embroidered Lehenga Set","Ethnic Wear","Lehenga","Yellow",6499,50,4.5,1830,"Raw Silk","Embroidered","Sleeveless","Ankle length","Flared","Wedding","Dry clean","1767955694884-d4bf352c23c2",5,30,None),
    ("saree_kalini","Kalini","Woven Banarasi Saree","Ethnic Wear","Sarees","Red",4299,55,4.2,2640,"Art Silk","Woven","Sleeveless","6.3 m","Draped","Wedding","Dry clean","1759906760638-eeffcb471e53",4,30,["Free Size"]),
    ("saree_mitera","Mitera","Georgette Printed Saree","Ethnic Wear","Sarees","Teal",2199,60,3.9,1420,"Georgette","Printed","Sleeveless","5.5 m","Draped","Festive","Dry clean","1729146768775-3662af38016e",3,14,["Free Size"]),
    ("libas_palazzo","Libas","Printed Flared Palazzo","Ethnic Wear","Palazzos","Mustard",1299,55,4.0,2210,"Viscose Rayon","Printed","Sleeveless","Full length","Flared","Daily","Machine wash","1781021110763-4c822884316d",3,14,SIZES_NUM),
    ("w_palazzo","W for Woman","Solid Wide Palazzo","Ethnic Wear","Palazzos","Black",1499,45,4.1,1760,"Rayon","Solid","Sleeveless","Full length","Wide leg","Daily","Machine wash","1762331224129-783a3ea1fc3f",2,30,SIZES_NUM),
    ("global_coord","Global Desi","Floral Co-ord Set","Ethnic Wear","Co-ords","Pink",3199,40,4.3,980,"Rayon","Floral","Short sleeves","Ankle length","Relaxed","Brunch","Machine wash","1762777777722-3242a1f1c575",4,30,None),
    ("aurelia_coord","Aurelia","Printed Co-ord Set","Ethnic Wear","Co-ords","Blue",2499,50,4.0,1340,"Cotton Blend","Printed","Three-quarter sleeves","Calf length","Relaxed","Daily","Machine wash","1765365353683-fc501d83ed24",5,14,None),
    ("hm_shirt","H&M","Oversized Poplin Shirt","Western Wear","Tops","White",1499,40,4.2,3050,"100% Cotton","Solid","Full sleeves","Hip length","Oversized","Casual","Machine wash","1596755094514-f87e34085b2c",2,30,None),
    ("mango_blouse","MANGO","Floral Print Blouse","Western Wear","Tops","Multi",1999,45,4.1,1220,"Viscose","Floral","Full sleeves","Hip length","Regular","Workwear","Machine wash","1764337593519-c51a77b4fc3d",3,14,None),
    ("vero_top","Vero Moda","Ribbed Fitted Top","Western Wear","Tops","Red",899,50,3.8,2470,"Cotton Blend","Solid","Short sleeves","Waist length","Slim","Casual","Machine wash","1761121317492-57feee4fc674",2,14,None),
    ("only_blouse","ONLY","Satin Wrap Blouse","Western Wear","Tops","Champagne",1699,40,4.0,860,"Satin","Solid","Full sleeves","Hip length","Regular","Party","Hand wash","1765365353704-ed0b6e1b11c2",4,14,None),
    ("hm_tee","H&M","Relaxed Cotton Tee","Western Wear","Tops","Sage",699,45,4.3,5610,"100% Cotton","Solid","Short sleeves","Hip length","Relaxed","Casual","Machine wash","1770294758906-c8762abb2c8b",2,30,None),
    ("zara_shirt","Zara","Linen Blend Shirt","Western Wear","Tops","Sky",2590,30,4.4,1410,"Linen Blend","Solid","Full sleeves","Hip length","Regular","Workwear","Machine wash","1704775988639-e9fe3b7d94fd",3,14,None),
    ("levis_skinny","Levi's","711 Skinny Jeans","Western Wear","Jeans","Dark Blue",3299,35,4.5,7120,"92% Cotton, 6% Poly, 2% Elastane","Solid","Sleeveless","Full length","Skinny","Casual","Machine wash","1602293589930-45aad59ba3ab",2,30,SIZES_NUM),
    ("roadster_mom","Roadster","High Rise Mom Jeans","Western Wear","Jeans","Mid Blue",1899,55,4.0,2980,"100% Cotton","Washed","Sleeveless","Ankle length","Mom","Casual","Machine wash","1605518216938-7c31b7b14ad0",4,14,SIZES_NUM),
    ("vh_trousers","Van Heusen Woman","Tapered Formal Trousers","Western Wear","Trousers","Charcoal",2199,40,4.2,1650,"68% Poly, 30% Viscose, 2% Elastane","Solid","Sleeveless","Full length","Tapered","Workwear","Machine wash","1594938252461-e42450664907",3,30,SIZES_NUM),
    ("mango_trousers","MANGO","Pleated Wide Trousers","Western Wear","Trousers","Camel",2790,35,4.1,720,"Poly Blend","Pleated","Sleeveless","Full length","Wide leg","Workwear","Dry clean","1750857739910-81dda820b067",5,14,SIZES_NUM),
    ("zara_blazer","Zara","Structured Blazer","Western Wear","Blazers","White",4990,25,4.3,1130,"63% Poly, 34% Viscose, 3% Elastane","Solid","Full sleeves","Hip length","Structured","Workwear","Dry clean","1590588503756-08a4b2be5eb9",4,14,None),
    ("hm_blazer","H&M","Relaxed Linen Blazer","Western Wear","Blazers","Beige",3499,40,3.9,540,"Linen Blend","Solid","Full sleeves","Hip length","Relaxed","Workwear","Dry clean","1654336204566-eb251212c432",6,14,None),
    ("mango_skirt","MANGO","Pleated Midi Skirt","Western Wear","Skirts","Olive",2290,45,4.0,890,"Poly Blend","Pleated","Sleeveless","Midi","A-line","Workwear","Machine wash","1574847872646-abff244bbd87",3,14,None),
    ("only_skirt","ONLY","Denim Mini Skirt","Western Wear","Skirts","Mid Blue",1599,50,3.9,1180,"100% Cotton","Washed","Sleeveless","Mini","A-line","Casual","Machine wash","1560243563-062bfc001d68",4,14,SIZES_NUM),
    ("and_dress","AND","Printed Shirt Dress","Western Wear","Dresses","Ivory",2899,40,4.2,1520,"Poly Crepe","Printed","Three-quarter sleeves","Knee length","Shirt","Workwear","Machine wash","1760287363750-1c888c75578f",3,30,None),
    ("vero_maxi","Vero Moda","Tiered Maxi Dress","Western Wear","Dresses","Sky",2999,45,4.1,1330,"Viscose","Floral","Short sleeves","Maxi","Tiered","Brunch","Machine wash","1762154057377-cc9d3dd6900c",4,14,None),
    ("hm_sundress","H&M","Floral Sundress","Western Wear","Dresses","Multi",1799,50,3.9,2040,"Viscose","Floral","Sleeveless","Knee length","A-line","Casual","Machine wash","1768982597225-9dadb37f3db7",3,14,None),
    ("sangria_kurta","Sangria","Straight Cotton Kurta","Ethnic Wear","Kurtas","Green",1499,50,4.1,3120,"Pure Cotton","Printed","Three-quarter sleeves","Knee length","Straight","Daily","Machine wash","1768803968298-e31d64afee56",2,30,None),
    ("melange_kurta","Melange","Solid Straight Kurta","Ethnic Wear","Kurtas","Grey",1199,55,3.8,1890,"Cotton Blend","Solid","Full sleeves","Knee length","Straight","Daily","Machine wash","1601432093209-8af1fd74b054",4,14,None),
    ("indya_dupatta","Indya","Embroidered Dupatta Set","Ethnic Wear","Kurta Sets","Peach",3499,45,4.3,760,"Georgette","Embroidered","Full sleeves","Calf length","Flared","Festive","Dry clean","1746372283841-dbb3838f9935",5,30,None),
    ("fabindia_kurta","FabIndia","Handloom Cotton Kurta","Ethnic Wear","Kurtas","Beige",2199,25,4.6,4210,"Handloom Cotton","Solid","Three-quarter sleeves","Calf length","Straight","Daily","Hand wash","1602210901882-071c6b9e239d",3,30,None),
    ("hm_cardigan","H&M","Knit Cardigan","Western Wear","Tops","Cream",1899,40,4.0,980,"Acrylic Blend","Solid","Full sleeves","Hip length","Relaxed","Casual","Hand wash","1675379086716-95bf8a4d22f2",4,14,None),
    ("roadster_jacket","Roadster","Denim Jacket","Western Wear","Blazers","Mid Blue",2499,50,4.2,2310,"100% Cotton","Washed","Full sleeves","Waist length","Regular","Casual","Machine wash","1541099649105-f69ad21f3246",3,30,None),
    ("mitera_gown","Mitera","Sequinned Gown","Ethnic Wear","Lehenga","Wine",5499,55,4.1,640,"Net","Sequinned","Full sleeves","Maxi","Flared","Wedding","Dry clean","1668371679302-a8ec781e876e",6,30,None),
    ("global_kurta","Global Desi","Flared Printed Kurta","Ethnic Wear","Kurtas","Coral",1699,50,4.0,1450,"Rayon","Printed","Three-quarter sleeves","Calf length","Flared","Daily","Machine wash","1767884044802-5971dabdf2ab",3,14,None),
]
for row in REST:
    (pid, brand, name, cat, sub, col, price, off, rat, cnt, fab, pat, slv, ln, fit, occ, wash, ph, dlv, ret, sizes) = row
    P.append(product(pid, brand, name, cat, sub, col, price, off, rat, cnt,
                     fab, pat, slv, ln, fit, occ, wash, [ph], dlv, ret, sizes=sizes))

# Photo ids already spoken for by the hand-written products above.
_taken = {ph for prod in P for ph in prod["photos"]}
IMG_ETHNIC  = _cycle("ethnic",  _taken)
IMG_DRESS   = _cycle("dress",   _taken)
IMG_WBOTTOM = _cycle("wbottom", _taken)
IMG_WTOP    = _cycle("wtop",    _taken)
IMG_JEANS   = _cycle("jeans",   _taken)
IMG_TEE     = _cycle("tee",     _taken)
IMG_MSHIRT  = _cycle("mshirt",  _taken)
IMG_OUTER   = _cycle("outer",   _taken)
IMG_MBOTTOM = _cycle("mbottom", _taken)

# ------------------------------------------------- CLUSTER D: black crew tees
# Seven plain tees in one price band. The clearest case the feature has: people
# genuinely save several of these, they are near-identical, and nothing on a
# product page tells you which one to pick.
D = [
    ("hm_tee_black",    "H&M",         "Regular Fit Crew Tee",   "Black",    699,  40, 4.2, 8410, "100% Cotton",              "Solid", "Short sleeves", "Hip length",   "Regular",   "Machine wash", 3, 30),
    ("roadster_tee",    "Roadster",    "Pure Cotton Crew Tee",   "Black",    599,  55, 4.0, 6120, "100% Cotton",              "Solid", "Short sleeves", "Hip length",   "Regular",   "Machine wash", 2, 14),
    ("hrx_tee_black",   "HRX",         "Bio-Wash Crew Tee",      "Jet Black",799,  45, 4.4, 5230, "100% Bio-wash Cotton",     "Solid", "Short sleeves", "Hip length",   "Slim",      "Machine wash", 2, 30),
    ("levis_tee",       "Levi's",      "Slim Fit Crew Tee",      "Black",   1299,  30, 4.5, 3980, "100% Cotton",              "Solid", "Short sleeves", "Hip length",   "Slim",      "Machine wash", 4, 30),
    ("puma_tee",        "Puma",        "Essentials Crew Tee",    "Charcoal", 999,  40, 4.3, 4710, "60% Cotton, 40% Polyester","Solid", "Short sleeves", "Hip length",   "Regular",   "Machine wash", 3, 14),
    ("mh_tee",          "Mast & Harbour","Oversized Crew Tee",   "Black",    899,  50, 3.9, 1890, "100% Cotton",              "Solid", "Short sleeves", "Longline",     "Oversized", "Machine wash", 6, 14),
    ("uspa_tee",        "U.S. Polo Assn.","Pima Cotton Crew Tee","Black",   1199,  35, 4.6, 2640, "100% Pima Cotton",         "Solid", "Short sleeves", "Hip length",   "Regular",   "Hand wash",    5, 30),
]
for pid, brand, name, col, price, off, rat, cnt, fab, pat, slv, ln, fit, wash, dlv, ret in D:
    P.append(product(pid, brand, name, "Western Wear", "T-Shirts", col, price, off, rat, cnt,
                     fab, pat, slv, ln, fit, "Casual", wash, [next(IMG_TEE)], dlv, ret,
                     oos=("XS",) if pid in ("mh_tee", "puma_tee") else ()))

# ------------------------------------------------- CLUSTER E: slim/straight jeans
E = [
    ("levis_511",   "Levi's",       "511 Slim Fit Jeans",       "Dark Blue", 3499, 30, 4.5, 6240, "98% Cotton, 2% Elastane", "Slim",     3, 30),
    ("jack_jeans",  "Jack & Jones", "Slim Tapered Jeans",       "Mid Blue",  2799, 45, 4.2, 3110, "99% Cotton, 1% Elastane", "Slim",     4, 14),
    ("hm_slim",     "H&M",          "Slim Fit Denim",           "Black",     1999, 50, 3.9, 1740, "100% Cotton",             "Slim",     6, 14),
    ("roadster_slim","Roadster",    "Straight Fit Jeans",       "Ice Blue",  1699, 60, 4.0, 4520, "98% Cotton, 2% Elastane", "Straight", 3, 14),
    ("wrangler_jeans","Wrangler",   "Greensboro Straight Jeans","Dark Blue", 2999, 40, 4.3, 2280, "100% Cotton",             "Straight", 5, 30),
    ("uspa_jeans",  "U.S. Polo Assn.","Regular Fit Jeans",      "Mid Blue",  2499, 45, 4.1, 1960, "99% Cotton, 1% Elastane", "Regular",  4, 30),
]
for pid, brand, name, col, price, off, rat, cnt, fab, fit, dlv, ret in E:
    P.append(product(pid, brand, name, "Western Wear", "Jeans", col, price, off, rat, cnt,
                     fab, "Solid", "Sleeveless", "Full length", fit, "Casual", "Machine wash",
                     [next(IMG_JEANS)], dlv, ret, sizes=SIZES_NUM,
                     oos=("26",) if pid == "hm_slim" else ()))

# ------------------------------------------------- CLUSTER F: white formal shirts
F = [
    ("vh_white",    "Van Heusen",     "Slim Fit Formal Shirt",  "White",  2299, 40, 4.4, 3820, "100% Cotton",          "Slim",    2, 30),
    ("as_white",    "Allen Solly",    "Regular Fit Shirt",      "White",  1999, 50, 4.1, 2410, "Cotton Blend",         "Regular", 4, 14),
    ("arrow_white", "Arrow",          "Wrinkle-Free Shirt",     "Ivory",  2699, 35, 4.3, 1770, "100% Cotton",          "Slim",    3, 30),
    ("peter_white", "Peter England",  "Cotton Formal Shirt",    "White",  1499, 55, 3.9, 5140, "65% Poly, 35% Cotton", "Regular", 5, 14),
    ("zara_white",  "Zara",           "Poplin Shirt",           "White",  2590, 25, 4.2, 1130, "100% Cotton",          "Slim",    4, 14),
]
for pid, brand, name, col, price, off, rat, cnt, fab, fit, dlv, ret in F:
    P.append(product(pid, brand, name, "Western Wear", "Shirts", col, price, off, rat, cnt,
                     fab, "Solid", "Full sleeves", "Hip length", fit, "Formal", "Machine wash",
                     [next(IMG_MSHIRT)], dlv, ret, oos=("XS",) if pid == "peter_white" else ()))

CLUSTER_IDS["D"] = [x[0] for x in D]
CLUSTER_IDS["E"] = [x[0] for x in E]
CLUSTER_IDS["F"] = [x[0] for x in F]

# ------------------------------------------------- filler stock
# Ordinary items so the wishlist does not read as six tidy experiments. Attributes
# vary but nothing here forms a decision set.
FILLER = [
    ("Biba", "Printed Straight Kurta", "Ethnic Wear", "Kurtas", "ethnic"),
    ("W for Woman", "Embroidered Kurta", "Ethnic Wear", "Kurtas", "ethnic"),
    ("Aurelia", "Cotton A-Line Kurta", "Ethnic Wear", "Kurtas", "ethnic"),
    ("Libas", "Bandhani Kurta Set", "Ethnic Wear", "Kurta Sets", "ethnic"),
    ("Anouk", "Silk Blend Kurta Set", "Ethnic Wear", "Kurta Sets", "ethnic"),
    ("Kalini", "Chiffon Printed Saree", "Ethnic Wear", "Sarees", "ethnic"),
    ("Mitera", "Cotton Handloom Saree", "Ethnic Wear", "Sarees", "ethnic"),
    ("Indya", "Sequin Lehenga Set", "Ethnic Wear", "Lehenga", "ethnic"),
    ("Global Desi", "Tiered Ethnic Dress", "Ethnic Wear", "Co-ords", "ethnic"),
    ("FabIndia", "Block Print Kurta", "Ethnic Wear", "Kurtas", "ethnic"),
    ("Melange", "Rayon Straight Kurta", "Ethnic Wear", "Kurtas", "ethnic"),
    ("W for Woman", "Printed Culottes", "Ethnic Wear", "Palazzos", "wbottom"),
    ("Aurelia", "Solid Cotton Palazzo", "Ethnic Wear", "Palazzos", "wbottom"),
    ("Vero Moda", "Satin Cami Top", "Western Wear", "Tops", "wtop"),
    ("ONLY", "Puff Sleeve Blouse", "Western Wear", "Tops", "wtop"),
    ("MANGO", "Knit Polo Top", "Western Wear", "Tops", "wtop"),
    ("H&M", "Rib Knit Bodysuit", "Western Wear", "Tops", "wtop"),
    ("Zara", "Cropped Cardigan", "Western Wear", "Tops", "wtop"),
    ("Forever 21", "Graphic Print Tee", "Western Wear", "Tops", "wtop"),
    ("AND", "Georgette Top", "Western Wear", "Tops", "wtop"),
    ("Vero Moda", "Wrap Midi Dress", "Western Wear", "Dresses", "dress"),
    ("MANGO", "Linen Shirt Dress", "Western Wear", "Dresses", "dress"),
    ("H&M", "Smocked Maxi Dress", "Western Wear", "Dresses", "dress"),
    ("ONLY", "Denim Pinafore Dress", "Western Wear", "Dresses", "dress"),
    ("AND", "Belted Sheath Dress", "Western Wear", "Dresses", "dress"),
    ("Zara", "Ruched Mini Dress", "Western Wear", "Dresses", "dress"),
    ("MANGO", "Straight Leg Trousers", "Western Wear", "Trousers", "wbottom"),
    ("Vero Moda", "Paperbag Waist Trousers", "Western Wear", "Trousers", "wbottom"),
    ("H&M", "Linen Blend Trousers", "Western Wear", "Trousers", "wbottom"),
    ("Zara", "Cargo Trousers", "Western Wear", "Trousers", "wbottom"),
    ("ONLY", "Cropped Flare Jeans", "Western Wear", "Jeans", "jeans"),
    ("Levi's", "Bootcut Jeans", "Western Wear", "Jeans", "jeans"),
    ("Roadster", "Boyfriend Jeans", "Western Wear", "Jeans", "jeans"),
    ("H&M", "Barrel Leg Jeans", "Western Wear", "Jeans", "jeans"),
    ("Zara", "Oversized Blazer", "Western Wear", "Blazers", "outer"),
    ("MANGO", "Cropped Trench Coat", "Western Wear", "Blazers", "outer"),
    ("H&M", "Quilted Jacket", "Western Wear", "Blazers", "outer"),
    ("Roadster", "Corduroy Overshirt", "Western Wear", "Blazers", "outer"),
    ("HRX", "Hooded Sweatshirt", "Western Wear", "Tops", "outer"),
    ("Puma", "Track Jacket", "Western Wear", "Blazers", "outer"),
    ("ONLY", "Pleated Mini Skirt", "Western Wear", "Skirts", "wbottom"),
    ("MANGO", "Satin Slip Skirt", "Western Wear", "Skirts", "wbottom"),
    ("Van Heusen", "Checked Formal Shirt", "Western Wear", "Shirts", "mshirt"),
    ("Arrow", "Linen Casual Shirt", "Western Wear", "Shirts", "mshirt"),
    ("Allen Solly", "Printed Casual Shirt", "Western Wear", "Shirts", "mshirt"),
    ("Peter England", "Oxford Casual Shirt", "Western Wear", "Shirts", "mshirt"),
    ("Jack & Jones", "Denim Shirt", "Western Wear", "Shirts", "mshirt"),
    ("Van Heusen", "Formal Trousers", "Western Wear", "Trousers", "mbottom"),
    ("Arrow", "Slim Fit Chinos", "Western Wear", "Trousers", "mbottom"),
    ("Jack & Jones", "Cargo Joggers", "Western Wear", "Trousers", "mbottom"),
    ("Puma", "Training Shorts", "Western Wear", "Trousers", "mbottom"),
    ("HRX", "Everyday Crew Tee", "Western Wear", "T-Shirts", "tee"),
    ("Puma", "Graphic Crew Tee", "Western Wear", "T-Shirts", "tee"),
    ("Levi's", "Logo Crew Tee", "Western Wear", "T-Shirts", "tee"),
]
COLOURS = ["Navy", "Olive", "Maroon", "Beige", "Teal", "Rust", "Grey", "Cream", "Pink", "Mustard"]
FABRICS = ["100% Cotton", "Viscose Rayon", "Poly Crepe", "Cotton Blend", "Linen Blend", "Georgette"]
PATTERNS = ["Solid", "Printed", "Embroidered", "Striped", "Floral"]
FITS = ["Regular", "Relaxed", "Slim", "A-line", "Straight"]

POOLS = {"ethnic": IMG_ETHNIC, "dress": IMG_DRESS, "wbottom": IMG_WBOTTOM, "wtop": IMG_WTOP,
         "jeans": IMG_JEANS, "tee": IMG_TEE, "mshirt": IMG_MSHIRT, "outer": IMG_OUTER,
         "mbottom": IMG_MBOTTOM}

for i, (brand, name, cat, sub, pool) in enumerate(FILLER):
    price = random.choice([699, 899, 1199, 1499, 1799, 2199, 2599, 2999, 3499, 3999])
    P.append(product("f%02d" % i, brand, name, cat, sub, random.choice(COLOURS), price,
                     random.choice([25, 30, 35, 40, 45, 50, 55, 60]),
                     round(random.uniform(3.7, 4.6), 1), random.randint(280, 6400),
                     random.choice(FABRICS), random.choice(PATTERNS),
                     random.choice(["Short sleeves", "Full sleeves", "Three-quarter sleeves", "Sleeveless"]),
                     random.choice(["Hip length", "Knee length", "Calf length", "Full length"]),
                     random.choice(FITS), random.choice(["Casual", "Daily", "Workwear", "Festive"]),
                     random.choice(["Machine wash", "Hand wash", "Dry clean"]),
                     [next(POOLS[pool])], random.randint(2, 7), random.choice([14, 30]),
                     sizes=SIZES_NUM if sub in ("Jeans", "Trousers", "Skirts", "Palazzos") else None))

# ---------------------------------------------------------------- emit
CATS = {}
for p in P:
    CATS.setdefault(p["category"], set()).add(p["sub"])
CATS = {k: sorted(v) for k, v in sorted(CATS.items())}

body = "// Generated by tools/build_catalog.py - do not edit by hand.\n\n"
body += "export const PRODUCTS = %s;\n\n" % json.dumps({p["id"]: p for p in P}, indent=1)
body += "export const CATEGORIES = %s;\n\n" % json.dumps(CATS, indent=1)
body += "export const CLUSTER_SEEDS = %s;\n\n" % json.dumps(CLUSTER_IDS, indent=1)
body += '''export const IMG = (pid, w, h) =>
  `https://images.unsplash.com/photo-${pid}?w=${w}&h=${h}&fit=crop&crop=entropy&q=80`;

export const photo = (p, w = 400, h = 533, i = 0) =>
  IMG(PRODUCTS[p].photos[i % PRODUCTS[p].photos.length], w, h);

export const rupees = n => "\\u20b9" + n.toLocaleString("en-IN");
export const title = p => `${PRODUCTS[p].brand} ${PRODUCTS[p].name}`;
'''
open(os.path.join(ROOT, "docs", "data.js"), "w").write(body)
print("products: %d" % len(P))
print("categories: %s" % json.dumps(CATS))
print("clusters: %s" % {k: len(v) for k, v in CLUSTER_IDS.items()})
