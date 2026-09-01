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

import json, os, random

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
