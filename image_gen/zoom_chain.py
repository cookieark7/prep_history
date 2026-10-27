#!/usr/bin/env python3
"""
zoom_chain.py: build a nested "infinite zoom" for the opening's deep-time act.

Each level contains the next one, shrunk by ZOOM, at its exact centre, so zooming into a level
by ZOOM lands pixel-for-pixel on the next. The chain is generated from the inside out:

  1. the innermost level is generated from text;
  2. for each outer level, the current outermost image is shrunk into the centre of a small
     canvas and sent to FLUX.2 klein as a reference with a prompt for the wider view;
  3. the exact inner image is pasted back into the centre with a feathered edge, so continuity
     never depends on the model redrawing the centre faithfully.

Usage (from image_gen/, Cloudflare keys in .env):
    .venv/bin/python zoom_chain.py --levels 2          # innermost + one outpaint, to judge seams
    .venv/bin/python zoom_chain.py                     # the whole chain
    .venv/bin/python zoom_chain.py --from L2           # redo L2 and everything outside it
    .venv/bin/python zoom_chain.py --preview           # only render out/zoom/preview.mp4
"""
from __future__ import annotations

import argparse
import base64
import io
import os
import subprocess
import sys
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_plates import cf_base, cf_model, load_dotenv  # noqa: E402

HERE = Path(__file__).resolve().parent
OUT = HERE / "out" / "zoom"
W, H = 1920, 1088
ZOOM = 3.0
FEATHER = 48  # px of blend at the pasted centre's edge
REF_W, REF_H = 504, 284  # Workers AI wants reference images under 512x512
MODEL = "@cf/black-forest-labs/flux-2-klein-4b"

STYLE = (
    "Antique celestial-atlas plate, hand-coloured lithograph with fine engraved crosshatching and "
    "soft gouache washes, museum-archive quality, matte. The illustration fills the entire canvas "
    "to every edge: no paper margin, no border, no frame, no text."
)

# Innermost first. `outpaint` describes the wider view that must contain the previous level.
LEVELS = [
    ("L4", "Swirling white cloud bands and a dark blue young ocean seen from directly above, from "
           "high orbit, top-down view, the cloud pattern filling the whole frame edge to edge."),
    ("L3", "The young Earth seen from space as a large globe filling most of the frame, its face "
           "covered in swirling white cloud bands over dark blue ocean, the brightest clouds at the "
           "exact centre, the grey Moon small near the upper right, black space with a few stars."),
    ("L2", "Zoom out: the picture in the centre shows the Earth and Moon. Extend it outward into "
           "the young solar system: deep blue-black space, the Earth small at the centre, a "
           "glowing golden Sun far to the left edge, faint dust lanes and one or two distant "
           "planets. Keep the centre exactly as it is."),
    ("L1", "Zoom out: the picture in the centre is a patch of dark space with a small sun. Extend "
           "it outward into a great spiral galaxy seen at an angle, its luminous arms of stars and "
           "violet dust sweeping around, the central patch sitting inside one arm. Keep the centre "
           "exactly as it is."),
    ("L0", "Zoom out: the picture in the centre is a spiral galaxy. Extend it outward into the "
           "early universe: the first stars igniting as blue-white points, glowing violet and "
           "ember nebulae, a web of faint filaments, near-black depths. Keep the centre exactly "
           "as it is."),
]


# Zooming IN (outermost first): each level is a detailed close-up of the previous level's centre.
# Image models are good at adding detail to a reference and poor at extending one, so this
# direction keeps the nesting visually consistent; the player hides small differences with a
# soft circular crossfade while both layers zoom together.
LEVELS_IN = [
    ("Z0", "The early universe: the first stars igniting as blue-white points, glowing violet and "
           "ember nebulae, faint filaments in near-black depths, and at the exact centre a small "
           "bright spiral galaxy."),
    ("Z1", "A close-up of a great spiral galaxy filling the frame, luminous arms of stars and "
           "violet dust sweeping around a glowing core, the exact centre a small bright golden "
           "star with a faint disc of dust."),
    ("Z2", "The young solar system: a glowing golden sun at the far left edge, a swirling disc of "
           "dust and small rocky planets sweeping across the frame, and at the exact centre a small "
           "round deep-blue planet with no continents, wrapped in white cloud."),
    ("Z3", "A close-up of the young Earth 4.5 billion years ago: a round globe, whole and fully "
           "inside the frame, at the exact centre, about half the frame height across, set against "
           "the pale cream and soft violet swirling dust "
           "of the solar disc (not black space). Deep blue ocean with no continents, white cloud "
           "swirls thickest at the centre, two or three tiny glowing volcanic islands, the grey Moon "
           "small at the upper right."),
    ("Z4", "Seen from directly above at the edge of space: swirling white cloud bands over a deep "
           "blue young ocean, the clouds filling the whole frame, the brightest swirl at the exact "
           "centre. Colours: white and deep blue only, no brown, no sepia."),
]


def strip_paper(im: Image.Image) -> Image.Image:
    """Crop the paper margin and drawn border off, back to a full W x H frame."""
    from prep_plates import picture_span

    l, t, r, b = picture_span(im, margin=0.02)
    cw, ch = r - l, b - t
    target = W / H
    if cw / ch > target:
        cw = ch * target
    else:
        ch = cw / target
    cx, cy = (l + r) / 2, (t + b) / 2
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    return im.crop(tuple(round(v) for v in box)).resize((W, H), Image.LANCZOS)


def centre_crop_ref(outer: Image.Image) -> Image.Image:
    l, t, r, b = centre_box()
    return outer.crop((l, t, r, b)).resize((REF_W, REF_H), Image.LANCZOS)


def mismatch(a: Image.Image, b: Image.Image) -> float:
    """How different two frames look at a glance: mean RGB difference at 32 x 18."""
    import numpy as np

    sa = np.asarray(a.resize((32, 18), Image.BOX), dtype=np.float32)
    sb = np.asarray(b.resize((32, 18), Image.BOX), dtype=np.float32)
    return float(np.abs(sa - sb).mean())


# Levels whose subject is a planet: Z2's small Earth and Z3's globe are each centred exactly (by
# cropping, never filling). The zoom between them is then whatever makes the small Earth grow into
# the globe: chain.json records each step's factor for the player.
CIRCLE_LEVELS = {"Z2": (0.03, 0.15), "Z3": (0.15, 0.48)}


def planet(img: Image.Image, name: str):
    from align import find_circle

    lo, hi = CIRCLE_LEVELS[name]
    return find_circle(img, min_frac=lo, max_frac=hi)


def centre_planet(img: Image.Image, name: str, prev: Image.Image | None = None) -> Image.Image:
    from align import align_circle

    c = planet(img, name)
    return align_circle(img, c)[0] if c else img


def write_chain() -> dict:
    """Each level's file and the zoom from it to the next, for the player (chain.json)."""
    import json

    names = [n for n, _ in LEVELS_IN]
    factors = []
    for a, b in zip(names, names[1:]):
        if a in CIRCLE_LEVELS and b in CIRCLE_LEVELS:
            ra = planet(Image.open(OUT / f"{a}.png").convert("RGB"), a)
            rb = planet(Image.open(OUT / f"{b}.png").convert("RGB"), b)
            factors.append(round(float(rb[2] / ra[2]), 3) if ra and rb else ZOOM)
        else:
            factors.append(ZOOM)
    chain = {"levels": names, "zoom": factors}
    (OUT / "chain.json").write_text(json.dumps(chain, indent=2) + "\n")
    return chain


def build_in(names_from: int, variants: int = 1) -> None:
    for k in range(names_from, len(LEVELS_IN)):
        name, prompt = LEVELS_IN[k]
        t0 = time.time()
        prev = None if k == 0 else Image.open(OUT / f"{LEVELS_IN[k - 1][0]}.png").convert("RGB")
        ref = None if prev is None else centre_crop_ref(prev)
        target = None if prev is None else prev.crop(centre_box())
        best, best_score = None, float("inf")
        for v in range(variants if prev is not None else 1):
            raw = call_klein(prompt, ref)
            cand = strip_paper(raw)
            if name in CIRCLE_LEVELS:
                cand = centre_planet(cand, name, prev)
            score = 0.0 if target is None else mismatch(cand, target)
            cand.save(OUT / f"{name}-cand{v}.png")
            print(f"    {name} candidate {v}: mismatch {score:.1f}")
            if score < best_score:
                best, best_score = cand, score
        best.save(OUT / f"{name}.png")
        print(f"  {name} done in {time.time() - t0:.0f}s (kept mismatch {best_score:.1f})")


def render_preview_in(names: list[str], seconds_per_level: float = 2.4, fps: int = 30) -> Path:
    """Zoom from the outermost level inward; the next level fades in as a soft circle at the centre."""
    import numpy as np

    frames_dir = OUT / "frames-in"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for f in frames_dir.glob("*.jpg"):
        f.unlink()
    fw, fh = 1280, 720
    yy, xx = np.mgrid[0:fh, 0:fw]
    dist = np.sqrt(((xx - fw / 2) / (fw / 2)) ** 2 + ((yy - fh / 2) / (fh / 2)) ** 2)
    imgs = [Image.open(OUT / f"{n}.png").convert("RGB") for n in names]
    factors = write_chain()["zoom"] + [ZOOM]
    per = int(seconds_per_level * fps)
    n = 0

    def view(im: Image.Image, s: float) -> np.ndarray:
        cw, ch = W / s, H / s
        box = ((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2)
        return np.asarray(im.crop(tuple(round(v) for v in box)).resize((fw, fh), Image.LANCZOS), dtype=np.float32)

    for k, im in enumerate(imgs):
        nxt = imgs[k + 1] if k + 1 < len(imgs) else None
        f = factors[k]
        for j in range(per):
            u = j / per
            s = f ** u
            frame = view(im, s)
            if nxt is not None and u > 0.45:
                # The next level, scaled to match (it shows exactly what this level's centre shows),
                # revealed by a soft circle that widens as we close in.
                inner = view(nxt, s / f) if s / f >= 1 else None
                if inner is None:
                    small = nxt.resize((round(fw * s / f), round(fh * s / f)), Image.LANCZOS)
                    canvas = Image.new("RGB", (fw, fh))
                    canvas.paste(small, ((fw - small.width) // 2, (fh - small.height) // 2))
                    inner = np.asarray(canvas, dtype=np.float32)
                    radius = (s / f) * 0.95
                else:
                    radius = 2.0
                a = (u - 0.45) / 0.55
                edge = np.clip((radius - dist) / max(0.05, radius * 0.35), 0, 1)
                alpha = (edge * a)[..., None]
                frame = frame * (1 - alpha) + inner * alpha
            Image.fromarray(frame.astype(np.uint8)).save(frames_dir / f"{n:05d}.jpg", quality=88)
            n += 1
    dst = OUT / "preview-in.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", str(frames_dir / "%05d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", str(dst)], check=True)
    return dst


def call_klein(prompt: str, ref: Image.Image | None) -> Image.Image:
    files = {"prompt": (None, f"{STYLE} {prompt}"), "width": (None, str(W)), "height": (None, str(H))}
    if ref is not None:
        buf = io.BytesIO()
        ref.save(buf, "PNG")
        files["input_image_0"] = ("ref.png", buf.getvalue(), "image/png")
    url = f"{cf_base()}/run/{cf_model(MODEL)}"
    headers = {"Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}"}
    for attempt in range(4):
        r = requests.post(url, headers=headers, files=files, timeout=300)
        if r.status_code == 200:
            raw = base64.b64decode(r.json()["result"]["image"])
            return Image.open(io.BytesIO(raw)).convert("RGB")
        if "free allocation" in r.text:
            sys.exit("Today's free Workers AI allocation is used up; resume after 00:00 UTC with --from.")
        print(f"  HTTP {r.status_code}: {r.text[:200]} (retrying)")
        time.sleep(3 * (attempt + 1))
    sys.exit("Workers AI kept failing; see the messages above.")


def centre_box() -> tuple[int, int, int, int]:
    iw, ih = round(W / ZOOM), round(H / ZOOM)
    left, top = (W - iw) // 2, (H - ih) // 2
    return left, top, left + iw, top + ih


def reference_for(inner: Image.Image) -> Image.Image:
    """The inner level shrunk into the centre, on a heavily blurred continuation of itself.

    A flat background gives the model a hard rectangle to copy; a blurred continuation gives it
    colours and shapes to extend instead.
    """
    canvas = inner.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(60))
    l, t, r, b = centre_box()
    small = inner.resize((r - l, b - t), Image.LANCZOS)
    mask = Image.new("L", small.size, 0)
    ImageDraw.Draw(mask).rectangle([FEATHER, FEATHER, small.width - FEATHER, small.height - FEATHER], fill=255)
    canvas.paste(small, (l, t), mask.filter(ImageFilter.GaussianBlur(FEATHER / 2)))
    return canvas.resize((REF_W, REF_H), Image.LANCZOS)


def composite(outer: Image.Image, inner: Image.Image) -> Image.Image:
    """Paste the exact inner level back into the centre with a feathered edge."""
    l, t, r, b = centre_box()
    small = inner.resize((r - l, b - t), Image.LANCZOS)
    mask = Image.new("L", small.size, 0)
    ImageDraw.Draw(mask).rectangle([FEATHER // 2, FEATHER // 2, small.width - FEATHER // 2, small.height - FEATHER // 2], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER / 3))
    out = outer.copy()
    out.paste(small, (l, t), mask)
    return out


def render_preview(names: list[str], seconds_per_level: float = 2.4, fps: int = 30) -> Path:
    """A straight zoom from the outermost level to the innermost, to judge the seams."""
    frames_dir = OUT / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for f in frames_dir.glob("*.jpg"):
        f.unlink()
    outer_first = list(reversed(names))
    imgs = [Image.open(OUT / f"{n}.png").convert("RGB") for n in outer_first]
    n = 0
    per = int(seconds_per_level * fps)
    for k, im in enumerate(imgs):
        for j in range(per):
            s = ZOOM ** (j / per)  # exponential zoom: constant apparent speed
            cw, ch = W / s, H / s
            box = ((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2)
            im.crop(tuple(round(v) for v in box)).resize((1280, 720), Image.LANCZOS).save(frames_dir / f"{n:05d}.jpg", quality=88)
            n += 1
    dst = OUT / "preview.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", str(frames_dir / "%05d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", str(dst)], check=True)
    return dst


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--levels", type=int, default=len(LEVELS), help="how many levels to build, innermost first")
    ap.add_argument("--from", dest="start", help="rebuild from this level outward (e.g. L2)")
    ap.add_argument("--preview", action="store_true", help="only render the preview video")
    ap.add_argument("--inward", action="store_true", help="build outermost-first close-ups (Z0..Z4) instead")
    ap.add_argument("--variants", type=int, default=1, help="candidates per level; the closest match to the outer centre is kept")
    args = ap.parse_args()

    os.chdir(HERE)
    load_dotenv()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.inward:
        names_in = [n for n, _ in LEVELS_IN]
        if not args.preview:
            build_in(names_in.index(args.start) if args.start else 0, args.variants)
        print("preview:", render_preview_in(names_in))
        return
    levels = LEVELS[: args.levels]
    names = [n for n, _ in levels]

    if not args.preview:
        start = names.index(args.start) if args.start else 0
        for k in range(start, len(levels)):
            name, prompt = levels[k]
            t0 = time.time()
            if k == 0:
                img = call_klein(prompt, None)
            else:
                inner = Image.open(OUT / f"{names[k - 1]}.png").convert("RGB")
                raw = call_klein(prompt, reference_for(inner))
                raw.save(OUT / f"{name}-raw.png")
                img = composite(raw, inner)
            img.save(OUT / f"{name}.png")
            print(f"  {name} done in {time.time() - t0:.0f}s")

    if all((OUT / f"{n}.png").exists() for n in names) and len(names) > 1:
        print("preview:", render_preview(names))


if __name__ == "__main__":
    main()
