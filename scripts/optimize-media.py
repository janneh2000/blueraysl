#!/usr/bin/env python3
"""
Blue-Ray media pipeline.

Reads src/data/media-sources.json, then for every photo emits AVIF + WebP + JPEG
derivatives at responsive widths (never upscaling past the source), and for every
video emits a compressed MP4 + WebM plus a poster frame at the correct orientation.

Everything lands in assets/. Run it again whenever source media changes:

    python3 scripts/optimize-media.py

Requires: Pillow (AVIF + WebP support) and ffmpeg/ffprobe on PATH.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "src/data/media-sources.json"
OUT_IMG = ROOT / "assets/img"
OUT_VID = ROOT / "assets/video"

WIDTHS = [400, 800, 1200]
MAX_WIDTH = 1400          # nothing on this site is displayed wider than this
JPEG_Q = 78
WEBP_Q = 76
AVIF_Q = 55

VIDEO_MAX_W = 720         # phone footage; anything wider is upscaling noise
VIDEO_FPS = 24

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required:  pip install --break-system-packages Pillow")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(str(c) for c in cmd[:4])}...\n{r.stderr[:800]}")
    return r.stdout


def load_image(path, crop=None, box=None):
    """Open, apply EXIF orientation, strip metadata, optionally crop.

    crop = [top, bottom] as fractions of height, for trimming screenshot chrome.
    box  = [left, top, right, bottom] in source pixels, for a deliberate framing
           such as a square portrait crop.
    """
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    im = im.convert("RGB")
    if box:
        im = im.crop(tuple(box))
    elif crop:
        top, bottom = crop
        h = im.height
        im = im.crop((0, int(h * top), im.width, int(h * bottom)))
    clean = Image.new("RGB", im.size)
    clean.putdata(list(im.getdata()))
    return clean


def emit_photo(src, slug, cat, crop=None, box=None):
    """Write responsive derivatives. Returns metadata for the build script."""
    outdir = OUT_IMG / cat
    outdir.mkdir(parents=True, exist_ok=True)
    im = load_image(src, crop, box)
    native_w, native_h = im.size
    ratio = native_h / native_w

    cap = min(native_w, MAX_WIDTH)
    widths = sorted(set([w for w in WIDTHS if w < cap] + [cap]))

    sizes = []
    for w in widths:
        h = max(1, round(w * ratio))
        resized = im.resize((w, h), Image.LANCZOS)
        base = outdir / f"{slug}-{w}"
        resized.save(f"{base}.jpg", "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
        resized.save(f"{base}.webp", "WEBP", quality=WEBP_Q, method=6)
        try:
            resized.save(f"{base}.avif", "AVIF", quality=AVIF_Q)
        except Exception:
            pass  # AVIF is a bonus, not a requirement
        sizes.append(w)

    return {
        "slug": slug, "cat": cat, "width": native_w, "height": native_h,
        "sizes": sizes, "orientation": "portrait" if native_h > native_w else "landscape",
        "path": f"assets/img/{cat}/{slug}",
    }


def video_rotation(path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json",
               "-show_streams", path])
    streams = json.loads(out)["streams"]
    v = next(s for s in streams if s["codec_type"] == "video")
    rot = None
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = sd["rotation"]
    return v["width"], v["height"], rot


def emit_video(src, slug, cat, rotate="auto", orientation=None, trim=None):
    outdir = OUT_VID / cat
    outdir.mkdir(parents=True, exist_ok=True)
    w, h, rot = video_rotation(str(src))

    # "none" means the file's rotation metadata lies and the stored frame is upright.
    pre = [] if rotate == "auto" else ["-noautorotate"]

    # trim = [start_seconds, duration_seconds] for sources too long for the web.
    cut = ["-ss", str(trim[0]), "-t", str(trim[1])] if trim else []

    mp4 = outdir / f"{slug}.mp4"
    poster = outdir / f"{slug}-poster.jpg"

    vf = f"scale='min({VIDEO_MAX_W},iw)':-2,fps={VIDEO_FPS}"

    run(["ffmpeg", "-v", "error", "-y", *pre, *cut, "-i", str(src),
         "-vf", vf, "-c:v", "libx264", "-profile:v", "main", "-crf", "31",
         "-preset", "slow", "-movflags", "+faststart",
         "-c:a", "aac", "-b:a", "72k", "-ac", "1",
         "-metadata:s:v", "rotate=0", str(mp4)])

    # No WebM: on this source material (noisy, low-resolution phone footage) VP9
    # came out larger than H.264 in every single case, and H.264 is universal.

    # Poster taken a little way in, so it is never a black first frame.
    poster_at = str((trim[0] if trim else 0) + 1.5)
    run(["ffmpeg", "-v", "error", "-y", *pre, "-ss", poster_at, "-i", str(src),
         "-frames:v", "1", "-vf", f"scale='min({VIDEO_MAX_W},iw)':-2",
         "-q:v", "4", str(poster)])

    with Image.open(poster) as p:
        pw, ph = p.size

    return {
        "slug": slug, "cat": cat, "width": pw, "height": ph,
        "orientation": "portrait" if ph > pw else "landscape",
        "mp4": f"assets/video/{cat}/{slug}.mp4",
        "poster": f"assets/video/{cat}/{slug}-poster.jpg",
        "bytes_mp4": mp4.stat().st_size,
    }


def main():
    man = json.loads(MANIFEST.read_text())
    upload_root = ROOT / man["uploadRoot"]
    legacy_root = ROOT / man["legacyRoot"]

    index = {"photos": {}, "videos": {}}

    print("photos (new)")
    for item in man["newPhotos"]:
        src = upload_root / item["src"]
        if not src.exists():
            print(f"   MISSING {src}")
            continue
        meta = emit_photo(src, item["slug"], item["cat"],
                          item.get("crop"), item.get("box"))
        index["photos"][item["slug"]] = meta
        print(f"   {item['slug']:28} {meta['width']}x{meta['height']} {meta['orientation']}")

    print("photos (existing)")
    for rel in man["legacyPhotos"]:
        src = legacy_root / rel
        if not src.exists():
            print(f"   MISSING {src}")
            continue
        cat = os.path.dirname(rel) or "site"
        slug = Path(rel).stem
        meta = emit_photo(src, slug, cat)
        index["photos"][slug] = meta
        print(f"   {slug:28} {meta['width']}x{meta['height']} {meta['orientation']}")

    print("videos")
    for item in man["videos"] + man["legacyVideos"]:
        root = upload_root if item in man["videos"] else legacy_root
        src = root / item["src"]
        if not src.exists():
            print(f"   MISSING {src}")
            continue
        meta = emit_video(src, item["slug"], item["cat"],
                          item.get("rotate", "auto"), item.get("orientation"),
                          item.get("trim"))
        index["videos"][item["slug"]] = meta
        print(f"   {item['slug']:28} {meta['width']}x{meta['height']} {meta['orientation']} "
              f"mp4 {meta['bytes_mp4']/1e6:.1f}MB")

    out = ROOT / "src/data/media-index.json"
    out.write_text(json.dumps(index, indent=2))
    print(f"\nwrote {out.relative_to(ROOT)}  "
          f"({len(index['photos'])} photos, {len(index['videos'])} videos)")


if __name__ == "__main__":
    main()
