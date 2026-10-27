#!/usr/bin/env python3
"""
prep_plates.py: turn chosen generated plates into web images for the scroll opening.

For each beat it takes the picked file, crops the paper margin and drawn border off (a centred
crop), applies the era grade from the approved storyboard, and writes three files per plate:

    {beat}.avif        1440x810, the 16:9 frame (AVIF q50: the paper grain survives, ~55% of WebP)
    {beat}.webp        1280x720, the fallback for browsers without AVIF
    tall/{beat}.avif   720x1080, the 2:3 centre of the frame, for portrait screens (a phone only
                       ever shows the middle of a 16:9 plate, so this is smaller and sharper)

The era grades:

    colour   B01-B04   deep time, as generated
    mono     B05-B15   life before writing: greyscale, a touch more contrast
    sepia    B16-B29   recorded history (and B35 when it exists)
    modern   B30-B33   colour returning: 35%, 55%, 75%, 100% saturation

Usage (from image_gen/):
    .venv/bin/python prep_plates.py                     # writes ../public/opening/
    .venv/bin/python prep_plates.py --crop 1.3 --quality 55

It also writes ../content/landing/opening-plates.json listing the beats that have an image,
so the page never asks for a plate that doesn't exist.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
K4 = OUT / "black-forest-labs_flux-2-klein-4b"
K9 = OUT / "black-forest-labs_flux-2-klein-9b"

R2 = OUT / "round2" / "black-forest-labs_flux-2-klein-4b"
ZOOM = OUT / "zoom"

# The picks: round 2 (full-bleed, subject centred, 1920 wide) where it exists, else round 1
# (klein 4B v1 unless noted).
OVERRIDES = {"B20": K9 / "B20_v1.jpg", "B24": K9 / "B24_v1.jpg", "B31": K9 / "B31_v2.jpg", "B27": K4 / "B27_v2.jpg"}
MODERN_SATURATION = {"B30": 0.35, "B31": 0.55, "B32": 0.75, "B33": 1.0}

# The "round thread" (storyboard frame 6): these round subjects are cropped to the exact centre at
# one size, so each appearance lands where the last one was. A hand-measured circle (cx, cy, r in
# source pixels) replaces automatic detection where it picks the wrong circle.
THREAD = {"B09": None, "B15": (948, 640, 300), "B17": (940, 580, 460), "B20": None, "B26": None, "B30": None, "B33": None}
THREAD_RADIUS = 0.28  # of the frame height


def pick(beat: str) -> Path | None:
    r2 = R2 / f"{beat}_v1.jpg"
    if r2.exists():
        return r2
    p = OVERRIDES.get(beat, K4 / f"{beat}_v1.jpg")
    return p if p.exists() else None


def thread_crop(im: Image.Image, hint, aspect: float = 16 / 9) -> Image.Image:
    """A 16:9 crop centred on the round subject, sized so its radius is THREAD_RADIUS of the
    height, staying inside the drawing (zooming in further rather than showing paper)."""
    from align import find_circle

    c = hint or find_circle(im)
    if not c:
        return smart_crop(im, 1.0)
    cx, cy, r = c
    # Bound by the image inset 3% (thin border lines fall outside), not by picture_span: a round
    # object on blank paper would otherwise count as the whole picture and be cropped into.
    w, h = im.size
    l, t, rr, b = w * 0.03, h * 0.03, w * 0.97, h * 0.97
    hh = min(r / THREAD_RADIUS / 2, cy - t, b - cy, (cx - l) / aspect, (rr - cx) / aspect)
    hw = hh * aspect
    return im.crop((round(cx - hw), round(cy - hh), round(cx + hw), round(cy + hh)))


def grade_of(beat: str) -> str:
    n = int(beat[1:])
    if n <= 4:
        return "colour"
    if n <= 15:
        return "mono"
    if n <= 29 or n == 35:
        return "sepia"
    return "modern"


def apply_grade(im: Image.Image, beat: str) -> Image.Image:
    g = grade_of(beat)
    if g == "colour":
        return im
    if g == "mono":
        return ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(1.08).convert("RGB")
    if g == "sepia":
        grey = ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(1.05)
        return ImageOps.colorize(grey, black="#24170c", mid="#8a6440", white="#f4e6c8")
    return ImageEnhance.Color(im).enhance(MODERN_SATURATION.get(beat, 1.0))


def picture_span(im: Image.Image, margin: float = 0.03) -> tuple[int, int, int, int]:
    """The box that holds the drawing, ignoring blank paper and thin border lines.

    Round-1 plates often sit on cream paper with an empty panel beside them. A column or row
    counts as picture when enough of its pixels differ clearly from the paper colour.
    """
    import numpy as np

    a = np.asarray(ImageOps.grayscale(im), dtype=np.float32)
    h, w = a.shape
    # Paper is the most common light tone (the edges can be picture on one side).
    hist, _ = np.histogram(a, bins=256, range=(0, 256))
    paper = float(140 + np.argmax(hist[140:]))
    ink = np.abs(a - paper) > 24
    # Picture = enough pixels away from paper, or real texture (light drawings such as maps).
    cols = (ink.mean(axis=0) > 0.10) | (a.std(axis=0) > 20)
    rows = (ink.mean(axis=1) > 0.10) | (a.std(axis=1) > 20)
    # A drawn border is a full-length line, so it marks single columns/rows as "picture".
    # Only runs at least 3% of the side count.
    def runs(mask: "np.ndarray", min_len: int) -> "np.ndarray":
        keep = np.zeros_like(mask)
        start = None
        for i, v in enumerate(np.append(mask, False)):
            if v and start is None:
                start = i
            elif not v and start is not None:
                if i - start >= min_len:
                    keep[start:i] = True
                start = None
        return keep

    cols, rows = runs(cols, int(w * 0.03)), runs(rows, int(h * 0.03))
    xs, ys = np.flatnonzero(cols), np.flatnonzero(rows)
    if len(xs) < w * 0.2 or len(ys) < h * 0.2:
        return 0, 0, w, h  # full-bleed already (e.g. a dark plate): keep everything
    pad_x, pad_y = int(w * margin), int(h * margin)
    return int(xs[0]) + pad_x, int(ys[0]) + pad_y, int(xs[-1]) - pad_x, int(ys[-1]) - pad_y


def smart_crop(im: Image.Image, zoom: float, aspect: float = 16 / 9) -> Image.Image:
    """A 16:9 crop centred on the drawing, at least `zoom` tight, never outside the image."""
    w, h = im.size
    l, t, r, b = picture_span(im)
    cw = min(r - l, w / zoom)
    ch = cw / aspect
    if ch > min(b - t, h / zoom):
        ch = min(b - t, h / zoom)
        cw = ch * aspect
    cx, cy = (l + r) / 2, (t + b) / 2
    left = min(max(cx - cw / 2, 0), w - cw)
    top = min(max(cy - ch / 2, 0), h - ch)
    return im.crop((round(left), round(top), round(left + cw), round(top + ch)))


WIDE = (1440, 810)
FALLBACK = (1280, 720)
TALL = (720, 1080)


def write_set(frame: Image.Image, out: Path, name: str, quality: int) -> int:
    """The three files for one 16:9 frame; returns the bytes written."""
    w, h = frame.size
    tw = round(h * TALL[0] / TALL[1])
    tall = frame.crop(((w - tw) // 2, 0, (w - tw) // 2 + tw, h))
    files = [
        (frame.resize(WIDE, Image.LANCZOS), out / f"{name}.avif", "AVIF"),
        (frame.resize(FALLBACK, Image.LANCZOS), out / f"{name}.webp", "WEBP"),
        (tall.resize(TALL, Image.LANCZOS), out / "tall" / f"{name}.avif", "AVIF"),
    ]
    total = 0
    for im, dst, fmt in files:
        dst.parent.mkdir(parents=True, exist_ok=True)
        if fmt == "AVIF":
            im.save(dst, "AVIF", quality=quality, speed=4)
        else:
            im.save(dst, "WEBP", quality=62, method=6)
        total += dst.stat().st_size
    return total


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--crop", type=float, default=1.12, help="minimum zoom, so drawn borders fall outside the crop")
    ap.add_argument("--quality", type=int, default=50, help="AVIF quality")
    ap.add_argument("--out", type=Path, default=HERE.parent / "public" / "opening")
    ap.add_argument("--manifest", type=Path, default=HERE.parent / "content" / "landing" / "opening-plates.json")
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    have: list[str] = []
    total = 0
    for n in list(range(1, 35)) + [35]:
        beat = f"B{n:02d}"
        src = pick(beat)
        if not src:
            print(f"  missing {beat} (no generated plate yet)")
            continue
        im = Image.open(src).convert("RGB")
        im = thread_crop(im, THREAD[beat]) if beat in THREAD else smart_crop(im, 1.0 if src.parent == R2 else args.crop)
        total += write_set(apply_grade(im, beat), args.out, beat, args.quality)
        have.append(beat)
    zoom = {}
    chain = ZOOM / "chain.json"
    if chain.exists():
        zoom = json.loads(chain.read_text())
        for name in zoom["levels"]:
            z = Image.open(ZOOM / f"{name}.png").convert("RGB")
            # Trim to exactly 16:9 about the centre; every level loses the same, so the chain still lines up.
            zw, zh = z.size
            ch = round(zw * 9 / 16)
            z = z.crop((0, (zh - ch) // 2, zw, (zh - ch) // 2 + ch))
            total += write_set(z, args.out / "zoom", name, args.quality)
    args.manifest.write_text(json.dumps({"plates": have, "grades": {b: grade_of(b) for b in have}, "zoom": zoom}, indent=2) + "\n")
    print(f"{len(have)} plates -> {args.out} ({total // 1024} KB); manifest -> {args.manifest}")


if __name__ == "__main__":
    main()
