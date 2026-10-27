#!/usr/bin/env python3
"""
nano_chain.py: check that a set of deep-time images chains as one continuous zoom.

Each image zooms 3x into its centre while the next one grows out of a soft circle there, the way
the opening's Act I plays them. Writes an MP4 to judge by eye.

Usage (from image_gen/):
    .venv/bin/python nano_chain.py out/nano/0.webp out/nano/1.webp out/nano/2.webp -o out/nano/chain.mp4

A centred crop (--crop, default 1.12) drops the Gemini app's corner mark and keeps the subject centred.
"""
from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

W, H, FPS = 1280, 720, 30


def load(path: Path, crop: float) -> Image.Image:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    cw = min(w / crop, h / crop * 16 / 9)
    ch = cw * 9 / 16
    return im.crop((round((w - cw) / 2), round((h - ch) / 2), round((w + cw) / 2), round((h + ch) / 2)))


def view(im: Image.Image, s: float) -> tuple[np.ndarray, np.ndarray | None]:
    """The frame of `im` scaled by s about its centre; below 1 it sits small behind a soft ellipse."""
    w, h = im.size
    if s >= 1:
        cw, ch = w / s, h / s
        box = (round((w - cw) / 2), round((h - ch) / 2), round((w + cw) / 2), round((h + ch) / 2))
        return np.asarray(im.crop(box).resize((W, H), Image.BILINEAR), dtype=np.float32), None
    tw, th = max(2, round(W * s)), max(2, round(H * s))
    canvas = np.zeros((H, W, 3), np.float32)
    alpha = np.zeros((H, W), np.float32)
    x0, y0 = (W - tw) // 2, (H - th) // 2
    canvas[y0:y0 + th, x0:x0 + tw] = np.asarray(im.resize((tw, th), Image.BILINEAR), dtype=np.float32)
    yy, xx = np.mgrid[0:th, 0:tw]
    d = np.sqrt(((xx - tw / 2) / (tw / 2)) ** 2 + ((yy - th / 2) / (th / 2)) ** 2)  # like the CSS mask
    alpha[y0:y0 + th, x0:x0 + tw] = np.clip((0.74 - d) / (0.74 - 0.5), 0, 1)
    return canvas, alpha


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("images", nargs="+", type=Path, help="outermost first")
    ap.add_argument("-o", "--out", type=Path, required=True)
    ap.add_argument("--zoom", type=float, default=3.0, help="zoom per step")
    ap.add_argument("--seconds", type=float, default=3.2, help="per image")
    ap.add_argument("--crop", type=float, default=1.12)
    args = ap.parse_args()

    seq = [load(p, args.crop) for p in args.images]
    with tempfile.TemporaryDirectory() as tmp:
        n = 0
        for k, im in enumerate(seq):
            last = k == len(seq) - 1
            f = 1.6 if last else args.zoom  # the last image only pushes in gently
            frames = int(args.seconds * FPS)
            for t in range(frames):
                u = t / frames
                s = f ** u
                frame, _ = view(im, s)
                if not last and u > 0.55:
                    nxt, a = view(seq[k + 1], s / f)
                    m = (a * min(1, (u - 0.55) / 0.4))[..., None]
                    frame = frame * (1 - m) + nxt * m
                Image.fromarray(frame.clip(0, 255).astype(np.uint8)).save(f"{tmp}/{n:05d}.jpg", quality=90)
                n += 1
        args.out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(FPS), "-i", f"{tmp}/%05d.jpg",
                        "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(args.out)], check=True)
    print(f"{n} frames -> {args.out}")


if __name__ == "__main__":
    main()
