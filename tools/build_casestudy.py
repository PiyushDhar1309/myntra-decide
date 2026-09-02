"""Wrap the case-study write-ups as standalone pages on the public site.

They were authored as fragments - title, styles, body - so each needs a real
document shell and a way back to the index. Publishing them here rather than
behind a share link means a reviewer can read them without an account, which the
submission guidelines require.
"""

import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(ROOT, "docs", "case-study")

PAGES = [
    ("decomposition.html", "part-2-metric.html",   "Part 2", "Where wishlists stall"),
    ("interviews.html",    "part-3-method.html",   "Part 3", "The wishlist walkthrough"),
    ("problem.html",       "part-4-problem.html",  "Part 4", "The shortlist that never ends"),
    ("success.html",       "part-6-metrics.html",  "Part 6", "How we'd know it worked"),
    ("risks.html",         "part-7-risks.html",    "Part 7", "Why this might fail"),
]

NAV = '''<nav style="max-width:790px;margin:0 auto;padding:18px 26px 0;
  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;letter-spacing:.06em">
  <a href="./" style="color:#6b7189;text-decoration:none">&larr; ALL SUPPORTING DOCUMENTS</a>
</nav>'''

def wrap(fragment, title):
    head = re.search(r"<title>(.*?)</title>", fragment, re.S)
    name = head.group(1).strip() if head else title
    return ('<!doctype html>\n<html lang="en">\n<head>\n'
            '<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'<title>{name}</title>\n'
            + fragment.replace(head.group(0), "", 1) if head else fragment) \
        .replace("</style>", "</style>\n</head>\n<body>\n" + NAV, 1) + "\n</body>\n</html>\n"

def main():
    made = []
    for src, dst, part, title in PAGES:
        path = os.path.join(SRC, src)
        if not os.path.exists(path):
            print("  skip (missing):", src); continue
        with open(path) as fh:
            frag = fh.read()
        with open(os.path.join(OUT, dst), "w") as fh:
            fh.write(wrap(frag, title))
        made.append((dst, part, title))
        print("  wrote", dst)
    return made

if __name__ == "__main__":
    main()
