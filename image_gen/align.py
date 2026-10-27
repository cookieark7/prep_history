#!/usr/bin/env python3
"""
align.py: put a plate's round subject (globe, coin, compass, watch face, tree rings) at the exact
centre, at a set size. Used for the nested zoom (each level's subject must sit where the previous
level's centre was) and for the opening's "round thread" match cuts.

    .venv/bin/python align.py --check out/zoom/Z2.png out/zoom/Z3.png   # draws what it finds
    find_circle(img) / align_circle(img, circle, radius_frac)            # from other scripts

Detection is OpenCV's Hough circle transform on a reduced greyscale image. It can pick the wrong
circle, so --check writes an overlay sheet to look at, and callers can pass a manual circle.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

Circle = tuple[float, float, float]  # cx, cy, r in source pixels


def find_circle(img: Image.Image, min_frac: float = 0.06, max_frac: float = 0.3, hint: Circle | None = None) -> Circle | None:
    """The circle with the strongest edge support (OpenCV lists them strongest first).

    With a `hint` (rough cx, cy, r in source pixels) it searches only near that size and picks the
    candidate closest to that centre: a quick way to correct a wrong detection precisely.
    """
    w, h = img.size
    scale = 800 / w
    small = cv2.cvtColor(np.asarray(img.resize((800, round(h * scale)))), cv2.COLOR_RGB2GRAY)
    small = cv2.medianBlur(small, 5)
    sh = small.shape[0]
    if hint:
        lo, hi = hint[2] * scale * 0.8, hint[2] * scale * 1.2
    else:
        lo, hi = sh * min_frac, sh * max_frac
    found = cv2.HoughCircles(
        small, cv2.HOUGH_GRADIENT, dp=1.0, minDist=sh / 8, param1=110, param2=32,
        minRadius=int(lo), maxRadius=int(hi),
    )
    if found is None:
        return hint
    cands = [(x / scale, y / scale, r / scale) for x, y, r in found[0]]
    if hint:
        return min(cands, key=lambda c: np.hypot(c[0] - hint[0], c[1] - hint[1]))
    return cands[0]


def align_circle(img: Image.Image, circle: Circle, radius_frac: float | None = None) -> tuple[Image.Image, float]:
    """Crop and enlarge so the circle lands at the exact centre, ideally with radius_frac * height.

    It never shrinks or fills: when the subject sits near an edge, it zooms in further so no edge
    is uncovered (a mirrored fill clones the subject). Returns the image and the circle's new radius.
    """
    w, h = img.size
    cx, cy, r = circle
    want = (radius_frac * h / r) if radius_frac else 1.0
    room_x, room_y = min(cx, w - cx), min(cy, h - cy)
    must = max(w / (2 * max(room_x, 1)), h / (2 * max(room_y, 1)))
    s = max(want, must, 1.0)
    box = (cx - w / (2 * s), cy - h / (2 * s), cx + w / (2 * s), cy + h / (2 * s))
    out = img.convert("RGB").crop(tuple(round(v) for v in box)).resize((w, h), Image.LANCZOS)
    return out, r * s


def check_sheet(paths: list[Path], dst: Path) -> None:
    tiles = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        c = find_circle(im)
        t = im.resize((480, round(480 * im.height / im.width)))
        d = ImageDraw.Draw(t)
        k = 480 / im.width
        if c:
            x, y, r = (v * k for v in c)
            d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 40, 40), width=3)
            d.line([x - 6, y, x + 6, y], fill=(255, 40, 40), width=2)
            d.line([x, y - 6, x, y + 6], fill=(255, 40, 40), width=2)
        d.text((6, 6), f"{p.stem}: {'none' if not c else 'r=%.0f' % c[2]}", fill=(255, 255, 0))
        tiles.append(t)
    cols = min(4, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    th = max(t.height for t in tiles)
    sheet = Image.new("RGB", (cols * 484 + 4, rows * (th + 4) + 4), (20, 20, 20))
    for i, t in enumerate(tiles):
        sheet.paste(t, (4 + (i % cols) * 484, 4 + (i // cols) * (th + 4)))
    sheet.save(dst, quality=85)
    print("check sheet:", dst)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", nargs="+", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path("out/align-check.jpg"))
    a = ap.parse_args()
    check_sheet(a.check, a.out)
