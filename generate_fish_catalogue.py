from __future__ import annotations
import os, time, base64, re, random
from pathlib import Path
from typing import List, Tuple
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError, APIError, APITimeoutError

# ---------- Load environment ----------
load_dotenv()
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("No OPENAI_API_KEY found. Please create a .env file with your key.")
client = OpenAI(api_key=API_KEY)

# ---------- Config ----------
OUTPUT_DIR = Path("fish_out")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "gpt-image-1"                 # OpenAI image model
SIZE = "1536x1024"                    # High-resolution output
INTERVAL_SECS = 600                   # 10 minutes between each image
MAX_RETRIES = 6                       # Retry on rate limits or network issues
SEED = None                           # Optional integer for reproducibility

# ---------- Species list ----------
SPECIES: List[Tuple[str, str]] = [
    
    ("Flathead Grey Mullet", "Mugil cephalus"),
    ("Yellowmouth Barracuda", "Sphyraena viridensis"),
    ("Red Gurnard", "Chelidonichthys cuculus"),
    ("Small-spotted Catshark", "Scyliorhinus canicula"),
    ("Whiting", "Merlangius merlangus"),
    ("Spotted Ray", "Raja montagui"),
    ("Bogue", "Boops boops"),
    ("White Seabream", "Diplodus sargus"),
    ("Undulate Ray", "Raja undulata"),
    ("Brill", "Scophthalmus rhombus"),
    ("Pollack", "Pollachius pollachius"),
    ("Rock Cook", "Centrolabrus exoletus"),
    ("Herring", "Clupea harengus"),
    ("Dentex", "Dentex dentex"),
]

# ---------- Top-down species (flatfish & rays) ----------
TOP_DOWN = {
    "Small-eyed Ray", "Thornback Ray", "Spotted Ray", "Undulate Ray",
    "Brill", "Dab", "Dover Sole", "Megrim"
}

def sanitise(s: str) -> str:
    """Turn fish names into safe filenames."""
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")

def build_prompt(common: str, scientific: str) -> str:
    """Compose a photorealistic prompt."""
    base = (
        f"Photorealistic {common} ({scientific}), "
        f"{'top-down view' if common in TOP_DOWN else 'side view'}, "
        "full-frame, full body completely visible with comfortable margins, "
        "plain white background, no shadow, professional studio lighting, "
        "razor-sharp focus, natural colouring, detailed scales and fins; "
        "clean cut-out edges; museum field-guide quality; British spelling."
    )
    if "Eel" in common:
        base += " Emphasise elongated body and subtle fin details."
    if "Ray" in common or common in TOP_DOWN:
        base += " Ensure both pectoral fins and tail are fully in frame."
    if "John Dory" in common:
        base += " Include the distinctive dark ocellus on its flank."
    if "Octopus" in common:
        base += " Show mantle and arms neatly arranged; clear suckers; no cropping."
    return base

def save_png(b64: str, path: Path):
    """Save a base64 PNG to disk."""
    path.write_bytes(base64.b64decode(b64))

def backoff_sleep(t: int):
    """Jittered exponential backoff."""
    time.sleep(t + random.uniform(0, 0.5*t))

def main():
    index_width = len(str(len(SPECIES)))
    for i, (common, scientific) in enumerate(SPECIES, start=1):
        fname = f"{i:0{index_width}d}_{sanitise(common)}_{sanitise(scientific)}.png"
        out_path = OUTPUT_DIR / fname
        if out_path.exists():
            print(f"[skip] {fname} already exists.")
            if i < len(SPECIES):
                print(f" Waiting {INTERVAL_SECS}s before next…")
                time.sleep(INTERVAL_SECS)
            continue

        prompt = build_prompt(common, scientific)
        print(f"[gen ] {fname}\n       {prompt}")

        retries = 0
        while True:
            try:
                resp = client.images.generate(
                    model=MODEL,
                    prompt=prompt,
                    size=SIZE,
                    n=1,
                    **({"seed": SEED} if SEED is not None else {})
                )
                b64 = resp.data[0].b64_json
                save_png(b64, out_path)
                print(f"[done] saved → {out_path.resolve()}")
                break
            except (RateLimitError, APITimeoutError) as e:
                if retries >= MAX_RETRIES:
                    raise
                wait = int(5 * (2 ** retries))
                print(f"[warn] Rate/timeout: {e}. Retrying in {wait}s…")
                backoff_sleep(wait)
                retries += 1
            except APIError as e:
                if e.status_code in (429, 500, 503) and retries < MAX_RETRIES:
                    wait = int(5 * (2 ** retries))
                    print(f"[warn] API error {e.status_code}. Retrying in {wait}s…")
                    backoff_sleep(wait)
                    retries += 1
                else:
                    raise

        if i < len(SPECIES):
            print(f"[wait] Sleeping {INTERVAL_SECS}s before next species…")
            time.sleep(INTERVAL_SECS)

if __name__ == "__main__":
    main()