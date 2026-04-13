"""
Refine the Mucha x Bioluminescent Cave direction with 4 variations:
  A) Wide establishing shot — the full cave hall
  B) Close-up creature group — stewards in Mucha poster frame
  C) Crystal altar / lectern detail — vote ceremony focal point
  D) Architectural detail — cave ceiling + bioluminescent crystal canopy

Usage:  python scripts/gen_mucha_cave_concepts.py
Output: scripts/mucha_cave_grid.png
"""

import json, time, urllib.request, urllib.parse, io, os
from PIL import Image, ImageDraw, ImageFont

COMFY = "http://localhost:8188"
OUT   = os.path.join(os.path.dirname(__file__), "mucha_cave_grid.png")
CKPT  = "sd3.5_large_fp8_scaled.safetensors"

STYLES = [
    {
        "label": "A — Full Hall\n(establishing shot)",
        "prompt": (
            "Alphonse Mucha Art Nouveau illustration, wide establishing shot, "
            "grand governance hall inside a vast bioluminescent crystal cave, "
            "towering amethyst and aquamarine crystal formations rising from the cave floor like pillars, "
            "soft phosphorescent teal and gold light emanating from within the crystals, "
            "deep cave ceiling lost in soft purple shadow, "
            "small anthropomorphic animal creatures in elegant Mucha-style flowing robes "
            "gathered around a central glowing crystal altar, "
            "ornate Art Nouveau botanical vine and flower borders framing the entire scene, "
            "sinuous curving decorative panel borders in gold, "
            "warm amber gold and cool bioluminescent teal palette, "
            "highly detailed Art Nouveau poster aesthetic, graceful flat line work."
        ),
        "neg": "photorealistic, 3D render, dark and gloomy, harsh, blurry, anime, cartoon, ugly",
        "w": 1152, "h": 640, "seed": 1001,
    },
    {
        "label": "B — Creature Group\n(stewards in Mucha frame)",
        "prompt": (
            "Alphonse Mucha Art Nouveau decorative poster, "
            "a group of five anthropomorphic animal stewards — owl, fox, badger, beaver, moth — "
            "in flowing ornate robes, each holding a small vote banner, "
            "framed within a classic Mucha circular halo and botanical border, "
            "bioluminescent crystal cave background glowing teal and gold behind them, "
            "sinuous Art Nouveau line work, decorative botanical garland border, "
            "warm gold warm cream and cool phosphorescent teal palette, "
            "graceful elegant poses, Art Nouveau poster composition."
        ),
        "neg": "photorealistic, 3D, blurry, dark, harsh, anime, deformed",
        "w": 768, "h": 1024, "seed": 1002,
    },
    {
        "label": "C — Crystal Lectern\n(vote ceremony focal point)",
        "prompt": (
            "Alphonse Mucha Art Nouveau illustration detail, "
            "a crystal altar / lectern grown from bioluminescent cave rock, "
            "amethyst and aquamarine crystal formations radiating soft teal light, "
            "an open proposal scroll resting on the crystal surface, "
            "a single robed anthropomorphic creature raising a small banner at the altar, "
            "ornate Mucha botanical borders with flowers and vines surrounding the scene, "
            "phosphorescent cave crystals in the background, "
            "warm gold and cool teal bioluminescent palette, "
            "highly decorative Art Nouveau style, elegant detail."
        ),
        "neg": "photorealistic, 3D, blurry, dark, harsh, ugly, anime",
        "w": 768, "h": 1024, "seed": 1003,
    },
    {
        "label": "D — Crystal Canopy\n(cave ceiling architecture)",
        "prompt": (
            "Alphonse Mucha Art Nouveau illustration, "
            "looking upward at a bioluminescent cave ceiling, "
            "thousands of crystal stalactites in teal aquamarine violet and gold glowing softly, "
            "Art Nouveau sinuous botanical vine tracery growing between crystal formations, "
            "organic flowing curves in warm gold filigree against the glowing crystal ceiling, "
            "warm amber lantern light from below illuminating the undersides of crystals, "
            "magical cathedral atmosphere, deep jewel-like palette, "
            "ornate Mucha-style decorative border at bottom edge, "
            "upward-looking architectural shot, wide aspect ratio."
        ),
        "neg": "photorealistic, 3D, blurry, harsh, dark, ugly",
        "w": 1152, "h": 640, "seed": 1004,
    },
]

def post_json(url, data):
    body = json.dumps(data).encode()
    req  = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_json(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read())

def build_workflow(prompt_text, neg_text, width, height, seed):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "2": {
            "class_type": "CLIPTextEncodeSD3",
            "inputs": {"clip": ["1", 1], "clip_l": prompt_text, "clip_g": prompt_text,
                       "t5xxl": prompt_text, "empty_padding": "none"},
        },
        "3": {
            "class_type": "CLIPTextEncodeSD3",
            "inputs": {"clip": ["1", 1], "clip_l": neg_text, "clip_g": neg_text,
                       "t5xxl": neg_text, "empty_padding": "none"},
        },
        "4": {"class_type": "EmptySD3LatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
                "latent_image": ["4", 0],
                "seed": seed, "steps": 35, "cfg": 5.0,
                "sampler_name": "euler", "scheduler": "sgm_uniform", "denoise": 1.0,
            },
        },
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"filename_prefix": f"mucha_{seed}", "images": ["6", 0]}},
    }

def wait_for_prompt(prompt_id, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        hist = get_json(f"{COMFY}/history/{prompt_id}")
        if prompt_id in hist:
            entry = hist[prompt_id]
            if entry.get("status", {}).get("completed", False):
                return entry
            for msg in entry.get("status", {}).get("messages", []):
                if isinstance(msg, (list, tuple)) and msg and msg[0] == "execution_error":
                    err = msg[1].get("exception_message", "error") if len(msg) > 1 else "error"
                    raise RuntimeError(f"ComfyUI: {err}")
        time.sleep(3)
    raise TimeoutError(f"Timed out after {timeout}s")

def fetch_image(filename, subfolder="", img_type="output"):
    enc = urllib.parse.quote(filename)
    url = f"{COMFY}/view?filename={enc}&subfolder={subfolder}&type={img_type}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")

def main():
    PAD     = 16
    BORDER  = 20
    TITLE_H = 40
    LABEL_H = 44
    MAX_W   = 1152  # widest image width

    # Queue all 4
    print(f"Queueing 4 Mucha x Cave refinement shots (35 steps each)...")
    jobs = []
    for i, s in enumerate(STYLES):
        wf  = build_workflow(s["prompt"], s["neg"], s["w"], s["h"], s["seed"])
        pid = post_json(f"{COMFY}/prompt", {"prompt": wf})["prompt_id"]
        jobs.append((pid, s["label"], s["w"], s["h"]))
        print(f"  [{i+1}] queued {pid[:8]}  {s['label'].splitlines()[0]!r}  ({s['w']}x{s['h']})")

    print(f"\nGenerating...")
    images = []
    for idx, (pid, label, w, h) in enumerate(jobs):
        print(f"  [{idx+1}/4] {label.splitlines()[0]!r} ...", end="", flush=True)
        t0 = time.time()
        try:
            hist = wait_for_prompt(pid)
        except (RuntimeError, TimeoutError) as e:
            print(f" ERROR: {e}")
            images.append((Image.new("RGB", (w, h), (40, 30, 50)), label, w, h))
            continue
        img = None
        for node_out in hist.get("outputs", {}).values():
            if "images" in node_out and node_out["images"]:
                info = node_out["images"][0]
                img  = fetch_image(info["filename"], info.get("subfolder", ""), info.get("type", "output"))
                break
        if img is None:
            img = Image.new("RGB", (w, h), (40, 30, 50))
            print(" no output")
        else:
            print(f" done ({time.time()-t0:.0f}s)")
        images.append((img, label, w, h))

    # Composite — stack vertically, each centered at MAX_W
    total_w = MAX_W + 2 * (BORDER + PAD)
    total_h = TITLE_H + BORDER * 2 + sum(h + LABEL_H + PAD for (_, _, _, h) in images)

    print(f"\nCompositing {total_w}x{total_h}...")
    BG       = (238, 228, 210)
    BORDER_C = (120, 92, 52)
    TITLE_C  = (42, 30, 14)
    LABEL_C  = (62, 46, 24)

    grid = Image.new("RGB", (total_w, total_h), BG)
    draw = ImageDraw.Draw(grid)

    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/Georgiab.ttf", 16)
        font_label = ImageFont.truetype("C:/Windows/Fonts/Georgia.ttf",  12)
    except Exception:
        font_title = ImageFont.load_default()
        font_label = font_title

    draw.text(
        (total_w // 2, BORDER + TITLE_H // 2),
        "Mucha x Bioluminescent Cave — Refinement Shots",
        font=font_title, fill=TITLE_C, anchor="mm",
    )
    draw.line([(BORDER, BORDER + TITLE_H), (total_w - BORDER, BORDER + TITLE_H)], fill=BORDER_C, width=1)

    cy = BORDER + TITLE_H + PAD
    for img, label, w, h in images:
        cx = (total_w - w) // 2
        draw.rectangle([cx - 1, cy - 1, cx + w, cy + h], outline=BORDER_C, width=1)
        grid.paste(img.resize((w, h), Image.LANCZOS), (cx, cy))
        label_y = cy + h + 7
        for li, line in enumerate(label.strip().splitlines()):
            draw.text((total_w // 2, label_y + li * 16), line, font=font_label, fill=LABEL_C, anchor="mt")
        cy += h + LABEL_H + PAD

    grid.save(OUT, quality=95)
    size_kb = os.path.getsize(OUT) // 1024
    print(f"Saved: {OUT}  ({total_w}x{total_h}, {size_kb}KB)")

if __name__ == "__main__":
    main()
