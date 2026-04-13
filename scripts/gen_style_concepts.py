"""
Generate 6 style-concept images via ComfyUI (SD3.5 Large fp8, local),
then composite them into a single 3x2 review grid.

Usage:  python scripts/gen_style_concepts.py
Output: scripts/style_concepts_grid.png
"""

import json, time, uuid, urllib.request, urllib.parse, io, os, sys
from PIL import Image, ImageDraw, ImageFont

COMFY = "http://localhost:8188"
OUT   = os.path.join(os.path.dirname(__file__), "style_concepts_grid.png")
CKPT  = "sd3.5_large_fp8_scaled.safetensors"

STYLES = [
    {
        "label": "Wes Anderson Hotel\nx Byzantine Mosaic",
        "prompt": (
            "symmetrical grand hotel lobby interior in Wes Anderson film art direction, "
            "pastel pink and pale yellow walls, rich Byzantine gold mosaic floor and ceiling "
            "with intricate tesserae halos and geometric knotwork, small anthropomorphic fox "
            "and owl hotel staff in matching formal uniforms with brass buttons, centered "
            "perfect symmetry, warm amber lighting, whimsical yet opulent. "
            "Concept art, illustration, detailed, vibrant"
        ),
        "neg": "ugly, blurry, dark, realistic photo, 3D render",
    },
    {
        "label": "Dutch Golden Age Tavern\nx NYSE Trading Floor",
        "prompt": (
            "Dutch Golden Age oil painting style tavern interior, deep Rembrandt chiaroscuro "
            "amber candlelight, dark oak walls and ceiling beams, anthropomorphic badgers and "
            "foxes in 17th century merchant coats frantically waving rolled parchment ticker-tape "
            "and shouting bids across long tables, chaotic stock exchange energy inside a warm "
            "candlelit painted tavern. Concept art illustration, rich oil paint texture"
        ),
        "neg": "modern, digital, neon, blurry",
    },
    {
        "label": "Punk Zine\nx Roman Senate",
        "prompt": (
            "black and white xerox zine punk illustration, high contrast hand-drawn crosshatch, "
            "Roman Senate marble chamber with Ionic columns, anthropomorphic animals in togas "
            "with mohawks safety pins and leather jackets, hand-lettered graffiti speech bubbles "
            "saying FOR and AGAINST, DIY collage cutout aesthetic, anarchic energy. "
            "Graphic novel, ink illustration"
        ),
        "neg": "color, photorealistic, soft, blurry",
    },
    {
        "label": "Retro NASA Mission Control\nx Noh Theatre",
        "prompt": (
            "1960s NASA mission control room with glowing green phosphor CRT monitors, analog "
            "dials clocks and reel-to-reel tape machines, but arranged on a bare minimalist "
            "Japanese Noh theatre pine wood stage with painted pine tree backdrop, "
            "anthropomorphic owls in orange NASA jumpsuits moving with slow ceremonial Noh "
            "gestures raising vote banners. Eerie uncanny atmosphere, muted olive and jade. "
            "Concept art illustration"
        ),
        "neg": "modern, loud, blurry",
    },
    {
        "label": "Art Deco Ocean Liner\nx Ant Farm Cross-Section",
        "prompt": (
            "isometric cross-section side cutaway view of a 1920s Art Deco ocean liner like a "
            "dollhouse, multiple decks visible like an ant farm colony, Chrysler Building "
            "chevrons and gilded arches and brass rails, tiny anthropomorphic creatures "
            "scurrying between decks carrying scrolls and proposal documents, warm golden "
            "porthole light, cream and gold palette with dark geometric accents. "
            "Detailed illustration concept art"
        ),
        "neg": "blurry, dark, modern",
    },
    {
        "label": "Mongolian Ger\nx Bloomberg Terminal",
        "prompt": (
            "cozy interior of a traditional Mongolian ger yurt, warm orange and blue felt walls "
            "covered in traditional geometric embroidery, central iron stove glowing, carved "
            "low wood furniture and cushions, but Bloomberg financial terminal green-on-black "
            "data screens and price chart displays on every surface and textile, "
            "anthropomorphic creatures in traditional deel robes calmly pointing at market data. "
            "Juxtaposition of nomadic warmth and data density. Concept art illustration"
        ),
        "neg": "blurry, harsh, ugly",
    },
]

# ── ComfyUI helpers ────────────────────────────────────────────────────────

def post_json(url, data):
    body = json.dumps(data).encode()
    req  = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_json(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read())

def build_sd35_workflow(prompt_text, neg_text, width, height, seed):
    """SD3.5 Large with KSampler — fully local."""
    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": CKPT},
        },
        "2": {
            "class_type": "CLIPTextEncodeSD3",
            "inputs": {
                "clip": ["1", 1],
                "clip_l": prompt_text,
                "clip_g": prompt_text,
                "t5xxl":  prompt_text,
                "empty_padding": "none",
            },
        },
        "3": {
            "class_type": "CLIPTextEncodeSD3",
            "inputs": {
                "clip": ["1", 1],
                "clip_l": neg_text,
                "clip_g": neg_text,
                "t5xxl":  neg_text,
                "empty_padding": "none",
            },
        },
        "4": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {"width": width, "height": height, "batch_size": 1},
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model":        ["1", 0],
                "positive":     ["2", 0],
                "negative":     ["3", 0],
                "latent_image": ["4", 0],
                "seed":         seed,
                "steps":        28,
                "cfg":          4.5,
                "sampler_name": "euler",
                "scheduler":    "sgm_uniform",
                "denoise":      1.0,
            },
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["5", 0], "vae": ["1", 2]},
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": f"style_{seed}",
                "images": ["6", 0],
            },
        },
    }

def queue_workflow(workflow):
    result = post_json(f"{COMFY}/prompt", {"prompt": workflow})
    return result["prompt_id"]

def wait_for_prompt(prompt_id, timeout=360):
    start = time.time()
    while time.time() - start < timeout:
        hist = get_json(f"{COMFY}/history/{prompt_id}")
        if prompt_id in hist:
            entry = hist[prompt_id]
            if entry.get("status", {}).get("completed", False):
                return entry
            # Check for error
            msgs = entry.get("status", {}).get("messages", [])
            for msg in msgs:
                if isinstance(msg, (list, tuple)) and len(msg) > 0 and msg[0] == "execution_error":
                    err = msg[1].get("exception_message", "unknown error") if len(msg) > 1 else "error"
                    raise RuntimeError(f"ComfyUI error: {err}")
        time.sleep(3)
    raise TimeoutError(f"Timed out after {timeout}s for {prompt_id}")

def fetch_image(filename, subfolder="", img_type="output"):
    enc = urllib.parse.quote(filename)
    url = f"{COMFY}/view?filename={enc}&subfolder={subfolder}&type={img_type}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")

# ── Main ───────────────────────────────────────────────────────────────────

def main():
    W, H  = 768, 512
    COLS, ROWS = 3, 2
    PAD      = 16
    LABEL_H  = 48
    BORDER   = 22
    TITLE_H  = 42

    total_w = COLS * W + (COLS - 1) * PAD + 2 * BORDER
    total_h = ROWS * (H + LABEL_H) + (ROWS - 1) * PAD + 2 * BORDER + TITLE_H

    # ── Queue all 6 prompts ──────────────────────────────────────────────
    print(f"Queueing {len(STYLES)} prompts ({W}x{H}, SD3.5 Large fp8, 28 steps)...")
    jobs = []
    for i, style in enumerate(STYLES):
        wf  = build_sd35_workflow(style["prompt"], style["neg"], W, H, seed=100 + i * 41)
        pid = queue_workflow(wf)
        jobs.append((pid, style["label"]))
        short_label = style["label"].replace("\n", " ")
        print(f"  [{i+1}] queued {pid[:8]}  {short_label!r}")

    # ── Wait for each (they run sequentially in ComfyUI's queue) ────────
    print(f"\nGenerating... (each ~25-40s on RTX 5090)")
    images = []
    for idx, (pid, label) in enumerate(jobs):
        short = label.replace("\n", " ")
        print(f"  [{idx+1}/{len(jobs)}] {short!r} ... ", end="", flush=True)
        t0 = time.time()
        try:
            hist = wait_for_prompt(pid)
        except RuntimeError as e:
            print(f"ERROR: {e}")
            images.append((Image.new("RGB", (W, H), (80, 60, 50)), label))
            continue

        img = None
        for node_out in hist.get("outputs", {}).values():
            if "images" in node_out and node_out["images"]:
                info = node_out["images"][0]
                img  = fetch_image(info["filename"], info.get("subfolder", ""), info.get("type", "output"))
                break
        if img is None:
            print("no output image (using placeholder)")
            img = Image.new("RGB", (W, H), (80, 60, 50))
        else:
            elapsed = time.time() - t0
            print(f"done ({elapsed:.0f}s)")
        images.append((img, label))

    # ── Composite ────────────────────────────────────────────────────────
    print(f"\nCompositing {total_w}x{total_h} grid...")
    BG     = (245, 238, 220)
    BORDER_C = (140, 110, 60)
    TITLE_C  = (50, 35, 18)
    LABEL_C  = (70, 52, 28)

    grid = Image.new("RGB", (total_w, total_h), BG)
    draw = ImageDraw.Draw(grid)

    # Fonts
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/Georgiab.ttf", 17)
        font_label = ImageFont.truetype("C:/Windows/Fonts/Georgia.ttf",  13)
    except Exception:
        font_title = ImageFont.load_default()
        font_label = font_title

    # Title bar
    draw.text(
        (total_w // 2, BORDER + TITLE_H // 2),
        "Living Archive -- Style Concept Review",
        font=font_title, fill=TITLE_C, anchor="mm",
    )
    draw.line(
        [(BORDER, BORDER + TITLE_H), (total_w - BORDER, BORDER + TITLE_H)],
        fill=BORDER_C, width=1,
    )

    for idx, (img, label) in enumerate(images):
        col = idx % COLS
        row = idx // COLS

        cx = BORDER + col * (W + PAD)
        cy = BORDER + TITLE_H + PAD // 2 + row * (H + LABEL_H + PAD)

        # Thin border around image
        draw.rectangle([cx - 1, cy - 1, cx + W, cy + H], outline=BORDER_C, width=1)

        # Image
        grid.paste(img.resize((W, H), Image.LANCZOS), (cx, cy))

        # Label (multiline, centered below image)
        label_y = cy + H + 7
        for li, line in enumerate(label.strip().splitlines()):
            draw.text(
                (cx + W // 2, label_y + li * 17),
                line, font=font_label, fill=LABEL_C, anchor="mt",
            )

    grid.save(OUT, quality=95)
    size_kb = os.path.getsize(OUT) // 1024
    print(f"\nSaved: {OUT}  ({total_w}x{total_h}, {size_kb}KB)")


if __name__ == "__main__":
    main()
