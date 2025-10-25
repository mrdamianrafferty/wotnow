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
OUTPUT_DIR = Path("fish_out_americas")  # Save inside project
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# BACKUP: Save outside project as well
BACKUP_DIR = Path.home() / "fish_images_backup" / "americas"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "gpt-image-1"                 # OpenAI image model
SIZE = "1536x1024"                    # High-resolution output
INTERVAL_SECS = 120                   # 2 minutes between each image (optimized from 10)
MAX_RETRIES = 6                       # Retry on rate limits or network issues
SEED = None                           # Optional integer for reproducibility

# ---------- American species list (100 missing species) ----------
SPECIES: List[Tuple[str, str]] = [
    ("Golden Tilefish", "Lopholatilus chamaeleonticeps"),
    ("Atlantic Halibut", "Hippoglossus hippoglossus"),
    ("Pacific Herring", "Clupea pallasii"),
    ("Atlantic Menhaden", "Brevoortia tyrannus"),
    ("Striped Marlin", "Kajikia audax"),
    ("Pacific Halibut", "Hippoglossus stenolepis"),
    ("Pink Salmon", "Oncorhynchus gorbuscha"),
    ("Petrale Sole", "Eopsetta jordani"),
    ("Queen Snapper", "Etelis oculatus"),
    ("Roosterfish", "Nematistius pectoralis"),
    ("Skipjack Tuna", "Katsuwonus pelamis"),
    ("Shortfin Mako", "Isurus oxyrinchus"),
    ("Snowy Grouper", "Hyporthodus niveatus"),
    ("Red Snapper", "Lutjanus campechanus"),
    ("Sockeye Salmon", "Oncorhynchus nerka"),
    ("Striped Bass", "Morone saxatilis"),
    ("Swordfish", "Xiphias gladius"),
    ("Wahoo", "Acanthocybium solandri"),
    ("Wenchman", "Pristipomoides aquilonaris"),
    ("Wreckfish", "Polyprion americanus"),
    ("Warsaw Grouper", "Hyporthodus nigritus"),
    ("Yellowedge Grouper", "Hyporthodus flavolimbatus"),
    ("Yellowfin Tuna", "Thunnus albacares"),
]

# ---------- Top-down species (flatfish & rays) ----------
TOP_DOWN = {
    "Small-eyed Ray", "Thornback Ray", "Spotted Ray", "Undulate Ray",
    "Brill", "Dab", "Dover Sole", "Megrim",
    # American flatfish
    "Pacific Halibut", "Atlantic Halibut", "Summer Flounder", "Winter Flounder",
    "Pacific Dover Sole", "Petrale Sole", "Pacific Sanddab"
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
        "clean cut-out edges; museum field-guide quality; American spelling."
    )

    # Special handling for different species types
    if "Shark" in common:
        base += " Emphasise streamlined body shape and distinctive fin structure."
    elif "Tuna" in common or "Marlin" in common or "Swordfish" in common:
        base += " Highlight powerful body and distinctive bill or snout."
    elif "Salmon" in common:
        base += " Show characteristic body shape and fins typical of Pacific salmon."
    elif "Grouper" in common:
        base += " Emphasise robust body and large mouth."
    elif "Snapper" in common:
        base += " Show distinctive reddish colouration and typical snapper body shape."
    elif "Crab" in common or "Lobster" in common:
        base += " Show full body with legs and claws clearly visible."
    elif "Squid" in common:
        base += " Show mantle, arms, and tentacles neatly arranged; no cropping."
    elif "Eel" in common:
        base += " Emphasise elongated body and subtle fin details."
    elif "Ray" in common or common in TOP_DOWN:
        base += " Ensure both pectoral fins and tail are fully in frame."
    elif "John Dory" in common:
        base += " Include the distinctive dark ocellus on its flank."
    elif "Octopus" in common:
        base += " Show mantle and arms neatly arranged; clear suckers; no cropping."

    return base

def save_png(b64: str, path: Path):
    """Save a base64 PNG to disk and backup outside project."""
    data = base64.b64decode(b64)
    # Save in project
    path.write_bytes(data)
    # Also save backup outside project
    backup_path = BACKUP_DIR / path.name
    backup_path.write_bytes(data)
    print(f"       Backed up → {backup_path}")

def backoff_sleep(t: int):
    """Jittered exponential backoff."""
    time.sleep(t + random.uniform(0, 0.5*t))

def main():
    print(f"🐟 Generating {len(SPECIES)} American species images")
    print(f"📁 Output: {OUTPUT_DIR.resolve()}")
    print(f"💾 Backup: {BACKUP_DIR.resolve()}")
    print(f"⏱️  Interval: {INTERVAL_SECS}s per image")
    print(f"⏰ Estimated time: ~{len(SPECIES) * INTERVAL_SECS / 3600:.1f} hours\n")

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