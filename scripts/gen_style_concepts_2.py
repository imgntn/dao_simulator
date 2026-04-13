"""
Generate 10 style-concept images via ComfyUI (SD3.5 Large fp8, local),
then composite into a 2x5 review grid.

Usage:  python scripts/gen_style_concepts_2.py
Output: scripts/style_concepts_2_grid.png
"""

import json, time, urllib.request, urllib.parse, io, os
from PIL import Image, ImageDraw, ImageFont

COMFY = "http://localhost:8188"
OUT   = os.path.join(os.path.dirname(__file__), "style_concepts_2_grid.png")
CKPT  = "sd3.5_large_fp8_scaled.safetensors"

STYLES = [
    {
        "label": "Moebius Ligne Claire\nx Crystal Senate",
        "prompt": (
            "Jean-Claude Giraud Moebius ligne claire illustration style, "
            "vast pale desert canyon with towering amethyst crystal spires serving as parliament "
            "pillars, tiny robed anthropomorphic animal creatures dwarfed by the geology, "
            "a glowing crystal slab with etched text at the center altar, "
            "stark clear-line comic art, minimal flat color, enormous empty pale sky, "
            "Incal graphic novel aesthetic, Arzach desert world, wide panoramic view. "
            "Concept art illustration."
        ),
        "neg": "blurry, photorealistic, 3D render, dark, cluttered, crowded",
    },
    {
        "label": "Ernst Haeckel Radiolarian\nx Parliament",
        "prompt": (
            "Victorian scientific illustration plate in the style of Ernst Haeckel, "
            "cross-section of a giant radiolarian microorganism as a governance hall, "
            "perfect bilateral symmetry, intricate geometric biological lattice on every surface, "
            "tiny anthropomorphic creature specimens in formal frock coats holding miniature banners, "
            "sepia and prussian blue antique engraving palette, "
            "fine crosshatch pen-and-ink lines, specimen plate aesthetic. "
            "Highly detailed scientific illustration."
        ),
        "neg": "color photo, modern, blurry, loose, painterly",
    },
    {
        "label": "Giraud Desert Station\nx Geode Interior",
        "prompt": (
            "Moebius Jean-Claude Giraud comic book art, "
            "interior of a colossal split geode, outer shell raw weathered grey rock, "
            "inner cathedral of amethyst and quartz crystal faces catching warm golden lamplight, "
            "anthropomorphic animal creatures in retro-futurist space helmets and jumpsuits "
            "gathered around a central crystal altar, soft clean ligne claire line work, "
            "science fiction fantasy crossover, wide interior shot. "
            "Concept art illustration."
        ),
        "neg": "blurry, photorealistic, dark, cluttered",
    },
    {
        "label": "Ukiyo-e Woodblock\nx Geological Cross-Section",
        "prompt": (
            "Japanese ukiyo-e woodblock print style, bold black outlines, flat color fields, "
            "the sky entirely replaced by dramatic horizontal geological rock strata "
            "in deep indigo ochre rust and sienna mineral layers, "
            "anthropomorphic animal creatures in traditional kimono robes "
            "gathered in a carved cavern chamber, glowing crystal veins running through the stone floor, "
            "bold flat composition, no perspective depth, mineral rivers, "
            "dramatic Hiroshige-style framing. Woodblock print."
        ),
        "neg": "Western, 3D, shading, gradients, photorealistic, blurry",
    },
    {
        "label": "Heavy Metal Magazine\nx Alien Crystal Cathedral",
        "prompt": (
            "Philippe Druillet Richard Corben Heavy Metal magazine illustration, "
            "alien cathedral built entirely from massive interlocking crystal spire formations, "
            "neon violet and deep cobalt bioluminescent glow, "
            "surfaces slightly organic and biological, "
            "robed anthropomorphic animal creatures in a psychedelic baroque gothic setting, "
            "high contrast dramatic lighting, dark fantasy science fiction, "
            "intricate detailed full-page spread illustration."
        ),
        "neg": "blurry, simple, minimal, pastel, cute",
    },
    {
        "label": "Haida Formline\nx Living Circuit",
        "prompt": (
            "Pacific Northwest Haida First Nations formline art style, "
            "bold ovoid shapes U-forms and split-representation animal figures, "
            "raven salmon orca bear creature stewards deliberating, "
            "the meeting hall simultaneously a traditional Haida longhouse "
            "and a bioluminescent circuit board with glowing copper trace patterns, "
            "black red teal gold palette, symmetrical traditional design, "
            "flat graphic bold illustration."
        ),
        "neg": "European, photorealistic, 3D, blurry, gradients",
    },
    {
        "label": "Soviet Constructivist\nx Crystal Observatory",
        "prompt": (
            "Soviet constructivist propaganda poster art style, "
            "bold flat graphic design, sharp angular diagonal composition, "
            "anthropomorphic animal creatures rendered as heroic silhouettes "
            "beneath a massive geodesic crystal dome observatory on a dramatic horizon, "
            "deep crimson vermilion gold and white palette, "
            "bold geometric shapes, dynamic diagonal energy, "
            "retro space age futurism, flat color poster aesthetic."
        ),
        "neg": "soft, blurry, photorealistic, pastel, cute, 3D",
    },
    {
        "label": "Terry Gilliam Cut-Out\nx Illuminated Manuscript",
        "prompt": (
            "Terry Gilliam Monty Python animation collage cut-out style, "
            "flat paper silhouette aesthetic, "
            "framed by ornate illuminated medieval manuscript gold leaf borders "
            "with intricate marginalia of creatures and vines, "
            "slightly absurd anthropomorphic animal creatures in mismatched medieval costumes, "
            "a proposal scroll on crumbling parchment at center, "
            "flat colors, bold outlines, whimsical medieval chaos energy. "
            "Illustration."
        ),
        "neg": "photorealistic, 3D render, modern, dark, blurry",
    },
    {
        "label": "Moebius Arzach\nx Floating Crystal Archipelago",
        "prompt": (
            "Moebius Arzach style comic illustration, "
            "vast open sky panorama, impossible floating rock islands connected by crystal bridges, "
            "a DAO governance hall spread across multiple levitating crystal formations, "
            "tiny anthropomorphic animal figures on crystal platforms, "
            "hazy pale atmospheric far horizon, "
            "Moebius signature vast emptiness contrasted with intricate detailed foreground, "
            "science fantasy, muted warm palette, wide cinematic view. "
            "Concept art illustration."
        ),
        "neg": "photorealistic, dark, cluttered, 3D, blurry",
    },
    {
        "label": "Mucha Art Nouveau\nx Bioluminescent Crystal Cave",
        "prompt": (
            "Alphonse Mucha Art Nouveau poster illustration style, "
            "flowing organic botanical borders and ornate decorative panel frames, "
            "interior of a glowing crystal cave, "
            "anthropomorphic animal creatures backlit by phosphorescent bioluminescent crystal formations, "
            "intertwined vine mineral growth ornate borders, "
            "warm gold and cool teal bioluminescent palette, "
            "highly detailed Art Nouveau decorative poster aesthetic, flat graceful lines."
        ),
        "neg": "blurry, photorealistic, 3D, dark, modern, harsh",
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
                "seed": seed, "steps": 30, "cfg": 4.5,
                "sampler_name": "euler", "scheduler": "sgm_uniform", "denoise": 1.0,
            },
        },
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"filename_prefix": f"concept2_{seed}", "images": ["6", 0]}},
    }

def wait_for_prompt(prompt_id, timeout=480):
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

# ── Main ───────────────────────────────────────────────────────────────────

def main():
    W, H     = 640, 384   # per image
    COLS     = 2
    ROWS     = 5
    PAD      = 14
    LABEL_H  = 46
    BORDER   = 20
    TITLE_H  = 40

    total_w = COLS * W + (COLS + 1) * PAD + 2 * BORDER
    total_h = ROWS * (H + LABEL_H) + (ROWS + 1) * PAD + 2 * BORDER + TITLE_H

    # Queue all 10
    print(f"Queueing {len(STYLES)} prompts ({W}x{H}, 30 steps)...")
    jobs = []
    for i, style in enumerate(STYLES):
        wf  = build_workflow(style["prompt"], style["neg"], W, H, seed=200 + i * 37)
        pid = post_json(f"{COMFY}/prompt", {"prompt": wf})["prompt_id"]
        jobs.append((pid, style["label"]))
        print(f"  [{i+1:02d}] queued {pid[:8]}  {style['label'].splitlines()[0]!r}")

    # Wait + fetch
    print(f"\nGenerating (~4-7 min total on RTX 5090)...")
    images = []
    for idx, (pid, label) in enumerate(jobs):
        short = label.replace("\n", " ")
        print(f"  [{idx+1}/{len(jobs)}] {short!r} ...", end="", flush=True)
        t0 = time.time()
        try:
            hist = wait_for_prompt(pid)
        except (RuntimeError, TimeoutError) as e:
            print(f" ERROR: {e}")
            images.append((Image.new("RGB", (W, H), (60, 50, 70)), label))
            continue
        img = None
        for node_out in hist.get("outputs", {}).values():
            if "images" in node_out and node_out["images"]:
                info = node_out["images"][0]
                img  = fetch_image(info["filename"], info.get("subfolder", ""), info.get("type", "output"))
                break
        if img is None:
            print(" no output (placeholder)")
            img = Image.new("RGB", (W, H), (60, 50, 70))
        else:
            print(f" done ({time.time()-t0:.0f}s)")
        images.append((img, label))

    # Composite
    print(f"\nCompositing {total_w}x{total_h}...")
    BG      = (238, 228, 210)
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

    # Title
    draw.text(
        (total_w // 2, BORDER + TITLE_H // 2),
        "Living Archive — Art Direction Concepts",
        font=font_title, fill=TITLE_C, anchor="mm",
    )
    draw.line(
        [(BORDER, BORDER + TITLE_H), (total_w - BORDER, BORDER + TITLE_H)],
        fill=BORDER_C, width=1,
    )

    for idx, (img, label) in enumerate(images):
        col = idx % COLS
        row = idx // COLS

        cx = BORDER + PAD + col * (W + PAD)
        cy = BORDER + TITLE_H + PAD + row * (H + LABEL_H + PAD)

        draw.rectangle([cx - 1, cy - 1, cx + W, cy + H], outline=BORDER_C, width=1)
        grid.paste(img.resize((W, H), Image.LANCZOS), (cx, cy))

        label_y = cy + H + 7
        for li, line in enumerate(label.strip().splitlines()):
            draw.text(
                (cx + W // 2, label_y + li * 16),
                line, font=font_label, fill=LABEL_C, anchor="mt",
            )

    grid.save(OUT, quality=95)
    size_kb = os.path.getsize(OUT) // 1024
    print(f"Saved: {OUT}  ({total_w}x{total_h}, {size_kb}KB)")

if __name__ == "__main__":
    main()
