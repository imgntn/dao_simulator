"""
Single tight concept image: Wes Anderson Art Deco ocean liner cutaway.
Validates the exact layout before we build the SVG scene.
"""
import json, time, uuid, urllib.request, urllib.parse, io, os
from PIL import Image

COMFY = "http://localhost:8188"
OUT   = os.path.join(os.path.dirname(__file__), "wa_liner_concept.png")
CKPT  = "sd3.5_large_fp8_scaled.safetensors"

PROMPT = (
    "Wes Anderson style cross-section cutaway illustration of a vintage Art Deco ocean liner, "
    "side view showing 4 stacked decks like a dollhouse, each deck a different pastel room: "
    "top deck blush pink academic library, second deck split left honey-yellow merchant counting room "
    "and right sage-green long conference table, center deck grand cream ballroom saloon with central "
    "podium and chandelier, bottom deck split left warm peach workshop and right soft lavender archive stacks. "
    "Anthropomorphic animal characters in each room: scholarly owls in robes, merchant foxes in coats, "
    "badgers at a long table, beavers with books, moth creatures reading. "
    "Perfect bilateral symmetry, flat orthographic projection, Art Deco brass trim and geometric patterns, "
    "navy hull exterior with brass portholes, ornate serif typography labeling each room. "
    "Life Aquatic Wes Anderson visual style. Detailed concept art illustration, wide aspect ratio."
)
NEG = "blurry, 3D render, realistic photo, asymmetric, cluttered, dark, grim"

def post_json(url, data):
    body = json.dumps(data).encode()
    req  = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def get_json(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read())

def fetch_image(filename, subfolder="", img_type="output"):
    enc = urllib.parse.quote(filename)
    url = f"{COMFY}/view?filename={enc}&subfolder={subfolder}&type={img_type}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")

workflow = {
    "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
    "2": {
        "class_type": "CLIPTextEncodeSD3",
        "inputs": {"clip": ["1",1], "clip_l": PROMPT, "clip_g": PROMPT, "t5xxl": PROMPT, "empty_padding": "none"},
    },
    "3": {
        "class_type": "CLIPTextEncodeSD3",
        "inputs": {"clip": ["1",1], "clip_l": NEG, "clip_g": NEG, "t5xxl": NEG, "empty_padding": "none"},
    },
    "4": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1152, "height": 704, "batch_size": 1}},
    "5": {
        "class_type": "KSampler",
        "inputs": {
            "model": ["1",0], "positive": ["2",0], "negative": ["3",0], "latent_image": ["4",0],
            "seed": 888, "steps": 32, "cfg": 5.0, "sampler_name": "euler", "scheduler": "sgm_uniform", "denoise": 1.0,
        },
    },
    "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5",0], "vae": ["1",2]}},
    "7": {"class_type": "SaveImage", "inputs": {"filename_prefix": "wa_liner", "images": ["6",0]}},
}

print("Queuing WA liner concept (1152x704, 32 steps)...")
result = post_json(f"{COMFY}/prompt", {"prompt": workflow})
pid = result["prompt_id"]
print(f"  id={pid[:8]}... waiting")

start = time.time()
while True:
    hist = get_json(f"{COMFY}/history/{pid}")
    if pid in hist:
        entry = hist[pid]
        if entry.get("status", {}).get("completed", False):
            break
        msgs = entry.get("status", {}).get("messages", [])
        for m in msgs:
            if isinstance(m, (list,tuple)) and m and m[0] == "execution_error":
                raise RuntimeError(m[1].get("exception_message","error"))
    elapsed = time.time() - start
    print(f"  {elapsed:.0f}s...", end="\r", flush=True)
    time.sleep(3)

elapsed = time.time() - start
print(f"  done in {elapsed:.0f}s")

hist = get_json(f"{COMFY}/history/{pid}")
for node_out in hist[pid].get("outputs", {}).values():
    if "images" in node_out and node_out["images"]:
        info = node_out["images"][0]
        img = fetch_image(info["filename"], info.get("subfolder",""), info.get("type","output"))
        img.save(OUT, quality=95)
        print(f"Saved: {OUT}  ({img.width}x{img.height})")
        break
