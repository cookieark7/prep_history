#!/usr/bin/env python3
"""
gen_plates.py: batch-generate the Chronicle homepage plates through OpenRouter's Image API,
or straight through the Gemini API with --provider gemini.

It reads GLOBAL STYLE, NEGATIVE and the 35 beat prompts straight from
docs/chronicle-homepage-image-sequence-pack.md, so the pack stays the single source of truth.

Setup
    pip install requests
    export OPENROUTER_API_KEY="sk-or-..."        # or put it in a .env file (git-ignored)
    export GEMINI_API_KEY="..."                  # for --provider gemini (billing must be on:
                                                 # image models have no free tier)

Gemini
    python gen_plates.py --provider gemini --list-models
    python gen_plates.py --provider gemini --beats B01
    python gen_plates.py --provider gemini --model gemini-3-pro-image --resolution 2K --beats B01
  Gemini does not report cost, so --max-cost only works when --price-per-image is set
  (take the per-image price from https://ai.google.dev/gemini-api/docs/pricing).

Cloudflare Workers AI (free: 10,000 neurons/day, resets 00:00 UTC)
    export CLOUDFLARE_ACCOUNT_ID="..." CLOUDFLARE_API_TOKEN="..."   # token needs Workers AI permission
    python gen_plates.py --provider cloudflare --list-models
    python gen_plates.py --provider cloudflare --beats B01            # FLUX.2 klein 4B, 1344x768
    python gen_plates.py --provider cloudflare --model black-forest-labs/flux-1-schnell --beats B01
  Model ids may drop the "@cf/" prefix. FLUX.1 schnell only makes square images.
  --no-avoid drops the "Avoid: ..." line, which FLUX models tend to ignore or even draw.

Usage
    python gen_plates.py --list-models                      # what image models/params exist right now
    python gen_plates.py --dry-run --beats B01              # print the exact prompt, spend nothing
    python gen_plates.py --beats B01 --max-cost 1           # first real run: one plate, $1 cap
    python gen_plates.py --bakeoff \
        --models openai/gpt-image-2,google/gemini-3.1-flash-image,black-forest-labs/flux.2-pro
    python gen_plates.py --beats all --variants 3 --concurrency 3 --max-cost 25

Re-running is safe: files that already exist are skipped, so you can resume after a failure.
Outputs go to  out/<model>/<beat>_v<n>.<ext>  and every call is logged in out/manifest.jsonl.
"""
from __future__ import annotations

import argparse
import base64
import csv
import itertools
import json
import os
import random
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import requests

DEFAULT_PACK = str(Path(__file__).resolve().parent.parent / "docs" / "chronicle-homepage-image-sequence-pack.md")
DEFAULT_MODEL = "openai/gpt-image-2"
DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-image"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_CF_MODEL = "@cf/black-forest-labs/flux-2-klein-4b"
CF_LONG_SIDE = 1344  # FLUX.2 on Workers AI accepts 256-1920 per side
BAKEOFF_BEATS = ["B01", "B07", "B18"]  # simple, busy, two-world: each stresses a different weakness
RETRY_STATUS = {429, 500, 502, 503, 504}
EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


# ---------------------------------------------------------------- setup helpers
def base_url() -> str:
    return os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")


def load_dotenv(path: str = ".env") -> None:
    p = Path(path)
    if not p.exists():
        return
    for line in p.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def cf_base() -> str:
    return f'https://api.cloudflare.com/client/v4/accounts/{os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")}/ai'


def cf_model(model: str) -> str:
    return model if model.startswith("@") else f"@cf/{model}"


def cf_size(aspect_ratio: str, long_side: int | None = None) -> tuple[int, int]:
    # Long side (default CF_LONG_SIDE, at most 1920), short side rounded to a multiple of 32.
    side = max(256, min(1920, long_side or CF_LONG_SIDE))
    w, h = (int(x) for x in aspect_ratio.split(":"))
    short = round(side * min(w, h) / max(w, h) / 32) * 32
    return (side, short) if w >= h else (short, side)


def sniff_media_type(raw: bytes) -> str:
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def slug(model: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", model.removeprefix("@cf/"))


# ---------------------------------------------------------------- pack parsing
def parse_pack(text: str):
    g = re.search(r"### GLOBAL STYLE[^\n]*\n\s*```text\n(.*?)\n```", text, re.S)
    n = re.search(r"### NEGATIVE[^\n]*\n\s*```text\n(.*?)\n```", text, re.S)
    if not g or not n:
        sys.exit("Could not find the GLOBAL STYLE / NEGATIVE blocks in the pack file.")
    beats = {}
    for m in re.finditer(r"\*\*(B\d{2}) · ([^\n*]+?)\*\*\s*\n```text\n(.*?)\n```", text, re.S):
        beats[m.group(1)] = {"title": m.group(2).strip(), "prompt": m.group(3).strip()}
    if not beats:
        sys.exit("No beat prompts found in the pack file.")
    return g.group(1).strip(), n.group(1).strip(), beats


def select_beats(spec: str, available) -> list[str]:
    if spec.strip().lower() == "all":
        return sorted(available)
    out: list[str] = []
    for part in spec.split(","):
        part = part.strip().upper()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            out += [f"B{i:02d}" for i in range(int(a[1:]), int(b[1:]) + 1)]
        else:
            out.append(part)
    missing = [b for b in out if b not in available]
    if missing:
        sys.exit(f"Unknown beats: {missing}")
    return out


def build_prompt(style: str, negative: str | None, beat_prompt: str) -> str:
    # The Image API has no negative-prompt field, so exclusions are appended as text.
    if not negative:
        return f"{style}\n\n{beat_prompt}"
    return f"{style}\n\n{beat_prompt}\n\nAvoid: {negative}."


# ---------------------------------------------------------------- API calls
def list_models(headers: dict, needle: str | None, provider: str = "openrouter") -> None:
    if provider == "gemini":
        r = requests.get(f"{GEMINI_BASE}/models", headers=headers, params={"pageSize": 1000}, timeout=60)
        r.raise_for_status()
        for m in r.json().get("models", []):
            mid = m["name"].removeprefix("models/")
            if "image" not in mid or (needle and needle.lower() not in mid.lower()):
                continue
            print(f'{mid:48s} {m.get("displayName", "")}')
        return
    if provider == "cloudflare":
        r = requests.get(f"{cf_base()}/models/search", headers=headers,
                         params={"task": "Text-to-Image", "per_page": 100}, timeout=60)
        r.raise_for_status()
        for m in r.json().get("result", []):
            if needle and needle.lower() not in m["name"].lower():
                continue
            print(f'{m["name"]:48s} {(m.get("description") or "")[:70]}')
        return
    r = requests.get(f"{base_url()}/images/models", headers=headers, timeout=60)
    r.raise_for_status()
    for m in r.json().get("data", []):
        if needle and needle.lower() not in m["id"].lower():
            continue
        params = m.get("supported_parameters", {})
        res = params.get("resolution", {}).get("values")
        print(f'{m["id"]:48s} resolution={res}  params={sorted(params)}')


def run_job(job: dict, args, headers: dict, st: dict) -> dict:
    out_dir: Path = job["dir"]
    stem = f'{job["beat"]}_v{job["variant"]}'
    existing = sorted(out_dir.glob(stem + ".*"))
    if existing:
        return {"status": "skipped", "file": str(existing[0])}

    with st["lock"]:
        if st.get("fatal"):
            return {"status": "fatal_stop"}
        if args.max_cost is not None and st["spent"] >= args.max_cost:
            return {"status": "budget_stop"}

    if args.provider == "gemini":
        image_config = {"aspectRatio": args.aspect_ratio}
        if args.resolution:
            image_config["imageSize"] = args.resolution
        url = f'{GEMINI_BASE}/models/{job["model"]}:generateContent'
        payload = {
            "contents": [{"parts": [{"text": job["prompt"]}]}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": image_config},
        }
        logged_params = {"aspect_ratio": args.aspect_ratio, "resolution": args.resolution}
    elif args.provider == "cloudflare":
        model = cf_model(job["model"])
        url = f"{cf_base()}/run/{model}"
        if "flux-2" in model:
            # FLUX.2 models on Workers AI only take multipart form data, even for a bare prompt.
            width, height = cf_size(args.aspect_ratio, args.long_side)
            payload = {"prompt": job["prompt"], "width": str(width), "height": str(height)}
            logged_params = {"width": width, "height": height}
        else:
            payload = {"prompt": job["prompt"]}
            if "flux-1-schnell" in model:
                payload["steps"] = 8  # max; default 4 is noticeably rougher
            logged_params = {k: v for k, v in payload.items() if k != "prompt"}
    else:
        url = f"{base_url()}/images"
        payload = {
            "model": job["model"],
            "prompt": job["prompt"],
            "n": 1,
            "aspect_ratio": args.aspect_ratio,
        }
        if args.resolution:
            payload["resolution"] = args.resolution
        if args.quality:
            payload["quality"] = args.quality
        if args.output_format:
            payload["output_format"] = args.output_format
        logged_params = {k: v for k, v in payload.items() if k not in ("model", "prompt")}

    if args.provider == "cloudflare" and "flux-2" in cf_model(job["model"]):
        # Let requests set the multipart Content-Type (with its boundary).
        req = {"headers": {k: v for k, v in headers.items() if k != "Content-Type"},
               "files": {k: (None, v) for k, v in payload.items()}}
    else:
        req = {"headers": headers, "json": payload}

    last_err = "unknown error"
    resp = None
    t0 = time.time()
    for attempt in range(args.retries + 1):
        status = None
        try:
            resp = requests.post(url, timeout=args.timeout, **req)
            status = resp.status_code
            if status == 200:
                break
            last_err = f"HTTP {status}: {resp.text[:300]}"
        except requests.RequestException as e:
            last_err = f"network error: {e}"
        # Retrying cannot help when Gemini answers 429 "limit: 0" (billing off)
        # or Workers AI says the day's free neurons are spent.
        quota = None
        if status == 429 and "limit: 0" in resp.text:
            quota = "quota0"
        elif status is not None and status != 200 and "free allocation" in resp.text:
            quota = "cf_daily"
        if quota or (status is not None and status not in RETRY_STATUS) or attempt == args.retries:
            if status in (401, 402, 403) or quota:
                with st["lock"]:
                    st.setdefault("fatal", (quota or status, last_err))
            return {"status": "failed", "error": last_err}
        retry_after = resp.headers.get("Retry-After") if resp is not None else None
        wait = float(retry_after) if retry_after and retry_after.isdigit() else (2 ** attempt) * 3
        time.sleep(wait + random.uniform(0, 1.5))

    try:
        if args.provider == "cloudflare":
            if resp.headers.get("Content-Type", "").startswith("image/"):
                raw = resp.content  # some Workers AI models return the image bytes directly
            else:
                raw = base64.b64decode(resp.json()["result"]["image"])
            media_type = sniff_media_type(raw)
            usage = None
            cost = 0.0  # free allocation; the Workers Free plan cannot be billed
        elif args.provider == "gemini":
            body = resp.json()
            cand = (body.get("candidates") or [{}])[0]
            parts = (cand.get("content") or {}).get("parts") or []
            inline = next((p["inlineData"] for p in parts if "inlineData" in p), None)
            if inline is None:
                reason = cand.get("finishReason") or (body.get("promptFeedback") or {}).get("blockReason")
                return {"status": "failed", "error": f"no image returned (reason: {reason})"}
            raw = base64.b64decode(inline["data"])
            media_type = inline.get("mimeType", "image/png")
            usage = body.get("usageMetadata")
            cost = args.price_per_image or 0.0
        else:
            body = resp.json()
            item = body["data"][0]
            raw = base64.b64decode(item["b64_json"])
            media_type = item.get("media_type", "image/png")
            usage = body.get("usage")
            cost = float((usage or {}).get("cost") or 0)
    except Exception as e:  # noqa: BLE001
        return {"status": "failed", "error": f"unexpected response shape: {e}"}

    ext = EXT.get(media_type, "png")
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{stem}.{ext}"
    path.write_bytes(raw)

    with st["lock"]:
        st["spent"] += cost
        with open(args.out / "manifest.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "time": datetime.now(timezone.utc).isoformat(),
                "provider": args.provider,
                "beat": job["beat"], "variant": job["variant"], "model": job["model"],
                "params": logged_params, "usage": usage,
                "prompt": job["prompt"], "file": str(path), "cost_usd": cost,
                "elapsed_s": round(time.time() - t0, 1),
            }) + "\n")
    return {"status": "ok", "file": str(path), "cost": cost}


def write_scorecard(args, results: list[dict]) -> None:
    cols = ["beat", "model", "file", "anchor_center", "left_third_calm", "no_text",
            "palette_match", "antique_plate_look", "no_anachronism", "total"]
    path = args.out / "scorecard.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in results:
            if r.get("file"):
                w.writerow([r["beat"], r["model"], r["file"], "", "", "", "", "", "", ""])
    print(f"Scorecard template written: {path}  (score each cell 0 or 1, then sum)")


# ---------------------------------------------------------------- main
def main() -> None:
    load_dotenv()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pack", default=DEFAULT_PACK, help="path to the image sequence pack .md")
    ap.add_argument("--beats", default="B01", help='e.g. "B01", "B01,B05-B09", or "all"')
    ap.add_argument("--provider", choices=["openrouter", "gemini", "cloudflare"], default="openrouter",
                    help="openrouter (OPENROUTER_API_KEY), gemini (GEMINI_API_KEY) or "
                         "cloudflare (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN, Workers AI)")
    ap.add_argument("--model", help=f"default: {DEFAULT_MODEL} (openrouter) / {DEFAULT_GEMINI_MODEL} (gemini) / "
                                    f"{DEFAULT_CF_MODEL} (cloudflare)")
    ap.add_argument("--no-avoid", action="store_true", help='leave the "Avoid: <NEGATIVE>" line out of the prompt')
    ap.add_argument("--extra", help="text appended to every beat prompt in this run")
    ap.add_argument("--long-side", type=int, help=f"Cloudflare FLUX.2 output long side in px (default {CF_LONG_SIDE}, max 1920)")
    ap.add_argument("--models", help="comma-separated models (used with --bakeoff or to run several)")
    ap.add_argument("--variants", type=int, default=1, help="variants per beat per model")
    ap.add_argument("--aspect-ratio", default="16:9")
    ap.add_argument("--resolution", help="e.g. 2K or 4K, only if the model supports it (see --list-models)")
    ap.add_argument("--quality", help="auto | low | medium | high (provider-dependent)")
    ap.add_argument("--output-format", help="png | jpeg | webp")
    ap.add_argument("--concurrency", type=int, default=3)
    ap.add_argument("--max-cost", type=float, help="stop starting new jobs once reported spend reaches this (USD)")
    ap.add_argument("--price-per-image", type=float,
                    help="USD per image to count toward --max-cost when the provider reports no cost (gemini)")
    ap.add_argument("--retries", type=int, default=4)
    ap.add_argument("--timeout", type=int, default=300, help="seconds per request (high-quality images can take ~90s+)")
    ap.add_argument("--out", type=Path, default=Path("out"))
    ap.add_argument("--bakeoff", action="store_true", help=f"run {BAKEOFF_BEATS} on every model in --models")
    ap.add_argument("--dry-run", action="store_true", help="print prompts and job count, spend nothing")
    ap.add_argument("--list-models", nargs="?", const="", metavar="FILTER", help="list image models (optional name filter)")
    args = ap.parse_args()

    gemini = args.provider == "gemini"
    key_var, default_model = {
        "openrouter": ("OPENROUTER_API_KEY", DEFAULT_MODEL),
        "gemini": ("GEMINI_API_KEY", DEFAULT_GEMINI_MODEL),
        "cloudflare": ("CLOUDFLARE_API_TOKEN", DEFAULT_CF_MODEL),
    }[args.provider]
    key = os.environ.get(key_var)
    if not args.model:
        args.model = default_model
    headers = {"Content-Type": "application/json"}
    if key:
        headers.update({"x-goog-api-key": key} if gemini else {"Authorization": f"Bearer {key}"})
    if args.provider == "cloudflare" and not args.dry_run and not os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        sys.exit("Set CLOUDFLARE_ACCOUNT_ID (Cloudflare dashboard > Workers AI, or the right side of any "
                 "zone's Overview page).")

    if args.list_models is not None:
        if args.provider != "openrouter" and not key:
            sys.exit(f"Set {key_var} (environment variable or .env file).")
        list_models(headers, args.list_models or None, args.provider)
        return

    pack = Path(args.pack)
    if not pack.exists():
        sys.exit(f"Pack file not found: {pack}")
    style, negative, beats = parse_pack(pack.read_text(encoding="utf-8"))

    beat_ids = BAKEOFF_BEATS if args.bakeoff else select_beats(args.beats, beats)
    models = [m.strip() for m in args.models.split(",")] if args.models else [args.model]
    if args.bakeoff and len(models) < 2:
        sys.exit("--bakeoff needs --models with at least two models.")

    jobs = []
    for model, beat, v in itertools.product(models, beat_ids, range(1, args.variants + 1)):
        jobs.append({
            "model": model, "beat": beat, "variant": v,
            "prompt": build_prompt(style, None if args.no_avoid else negative,
                                   beats[beat]["prompt"] + (f" {args.extra}" if args.extra else "")),
            "dir": args.out / slug(model),
        })

    print(f"{len(beats)} beats parsed from pack. Jobs: {len(jobs)} "
          f"({len(models)} model(s) x {len(beat_ids)} beat(s) x {args.variants} variant(s)).")

    if args.dry_run:
        print("\n--- prompt for", jobs[0]["beat"], "---\n" + jobs[0]["prompt"])
        print("\nDry run only: nothing was sent.")
        return

    if not key:
        sys.exit(f"Set {key_var} (environment variable or .env file).")
    if gemini and args.max_cost is not None and not args.price_per_image:
        sys.exit("Gemini reports no cost, so --max-cost needs --price-per-image to mean anything.")

    args.out.mkdir(parents=True, exist_ok=True)
    st = {"lock": threading.Lock(), "spent": 0.0}
    results: list[dict] = []
    ok = skipped = failed = stopped = 0

    with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as pool:
        futures = {pool.submit(run_job, j, args, headers, st): j for j in jobs}
        for fut in as_completed(futures):
            j = futures[fut]
            r = fut.result()
            r.update(beat=j["beat"], model=j["model"], variant=j["variant"])
            results.append(r)
            tag = f'{j["beat"]} v{j["variant"]} [{j["model"]}]'
            if r["status"] == "ok":
                ok += 1
                print(f'  OK      {tag}  ${r["cost"]:.3f}  -> {r["file"]}')
            elif r["status"] == "skipped":
                skipped += 1
                print(f"  skipped {tag} (already exists)")
            elif r["status"] in ("budget_stop", "fatal_stop"):
                stopped += 1
            else:
                failed += 1
                print(f'  FAILED  {tag}: {r["error"]}')

    print(f"\nDone. generated={ok} skipped={skipped} failed={failed} not_started_due_to_budget={stopped} "
          f'reported_spend=${st["spent"]:.2f}')
    if st.get("fatal"):
        code, _ = st["fatal"]
        hints = {
            401: f"The key was rejected. Check {key_var} (typo, deleted, or wrong account).",
            402: "Not enough credits. Add credits at https://openrouter.ai/settings/credits, then re-run.",
            403: "Access denied for this key or request. Check key permissions and account status.",
            "quota0": "This Gemini model has a quota of 0 for your project, which means billing is off. "
                      "Turn on billing at https://aistudio.google.com/ (Get API key, then Set up billing), "
                      "then re-run.",
            "cf_daily": "Today's free Workers AI allocation (10,000 neurons) is used up. It resets at "
                        "00:00 UTC; re-run then and finished plates are skipped.",
        }
        print(f"\nStopped early: {hints[code]}")
        sys.exit(1)
    if failed:
        print("Re-run the same command to retry only the failed ones.")
    if args.bakeoff and ok:
        write_scorecard(args, results)


if __name__ == "__main__":
    main()