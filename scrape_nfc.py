#!/usr/bin/env python3
"""
Scrape National Fruit Collection cultivar pages into one CSV per fruit.

- Resolves cultivar name -> NFC detail URL via /search.php
- Fetches /full2.php pages and extracts gardener-useful fields
- Polite rate limiting + simple on-disk cache
"""

from __future__ import annotations

import argparse
import csv
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime
import sys
import unicodedata
import shutil

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE = "https://www.nationalfruitcollection.org.uk"
LICENCE_TEXT = "Open Government Licence (Crown Copyright; excluding logos)"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "GoDaisy-NFC-Scraper/1.0 (+contact: you@example.com)"
})


# Keys we support
FRUIT_KEYS = {
    "apple",
    "pear",
    "plum",
    "cherry",
    "apricot",
    "blackcurrant",
    "currant",
    "gooseberry",
}

# Human label as shown in NFC's search dropdown
FRUIT_LABEL = {
    "apple": "Apple",
    "pear": "Pear",
    "plum": "Plum",
    "cherry": "Cherry",
    "apricot": "Apricot",
    "blackcurrant": "Blackcurrant",
    "currant": "Currants",
    "gooseberry": "Gooseberry",
}

SPECIES_SLUG = {
    "apple": "fruit-apple",
    "pear": "fruit-pear",
    "plum": "fruit-plum",
    "apricot": "fruit-apricot",
    "cherry": "fruit-cherry-sweet",   # default; you can change per-row later if needed
    "blackcurrant": "fruit-blackcurrant",
    "currant": "fruit-currant",
    "gooseberry": "fruit-gooseberry",
}


@dataclass
class Cache:
    dir: Path

    def get(self, key: str) -> Optional[str]:
        p = self.dir / (re.sub(r"[^a-zA-Z0-9._-]+", "_", key) + ".html")
        if p.exists():
            return p.read_text(encoding="utf-8", errors="ignore")
        return None

    def set(self, key: str, html: str) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        p = self.dir / (re.sub(r"[^a-zA-Z0-9._-]+", "_", key) + ".html")
        p.write_text(html, encoding="utf-8")


@dataclass
class SearchFormSpec:
    url: str
    method: str
    name_field: str
    fruit_field: str
    fruit_value_map: Dict[str, str]  # label(lower) -> option value


def fetch(url: str, cache: Cache, sleep_s: float) -> str:
    cached = cache.get(url)
    if cached is not None:
        return cached
    resp = SESSION.get(url, timeout=30)
    resp.raise_for_status()
    html = resp.text
    cache.set(url, html)
    time.sleep(sleep_s)
    return html


def normalise_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[’']", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

def strip_accents(s: str) -> str:
    """Return a version of s with diacritics removed (e.g. ñ -> n, ó -> o)."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))


MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

QUAL_DAY = {
    # UK-style phenology shorthand used by NFC (best-effort)
    "early": 5,
    "mid": 15,
    "late": 25,
}


def uk_date_to_mmdd(text: str) -> str:
    """Convert NFC-ish UK date strings to MM-DD.

    Handles:
      - '12th May', '12 May'
      - 'Early May', 'Mid April', 'Late June'
      - month-only (e.g. 'May') -> assumes mid-month

    Returns '' if it can't parse.
    """
    if not text:
        return ""

    s = normalise_ws(text).lower()

    # day + month: 12th may / 12 may
    m = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\b", s)
    if m:
        day = int(m.group(1))
        mon = MONTHS.get(m.group(2)[:3], MONTHS.get(m.group(2)))
        if mon:
            return f"{mon:02d}-{day:02d}"

    # early/mid/late + month
    m = re.search(r"\b(early|mid|late)\s+([a-z]+)\b", s)
    if m:
        day = QUAL_DAY[m.group(1)]
        mon = MONTHS.get(m.group(2)[:3], MONTHS.get(m.group(2)))
        if mon:
            return f"{mon:02d}-{day:02d}"

    # month only
    m = re.search(r"\b([a-z]{3,9})\b", s)
    if m:
        mon = MONTHS.get(m.group(1)[:3], MONTHS.get(m.group(1)))
        if mon:
            return f"{mon:02d}-15"

    return ""


def mmdd_to_week(mmdd: str, year: int = 2021) -> str:
    """Return ISO-ish week-of-year (1-53) as a string, from MM-DD. Empty string if unknown."""
    if not mmdd:
        return ""
    try:
        m, d = map(int, mmdd.split("-"))
        doy = date(year, m, d).timetuple().tm_yday
        week = (doy - 1) // 7 + 1
        return str(week)
    except Exception:
        return ""




def _abs_url(maybe_relative: str) -> str:
    if not maybe_relative:
        return BASE + "/search.php"
    if maybe_relative.startswith("http"):
        return maybe_relative
    if maybe_relative.startswith("/"):
        return BASE + maybe_relative
    return BASE + "/" + maybe_relative


def discover_search_form(cache: Cache, sleep_s: float) -> SearchFormSpec:
    """Fetch /search.php and discover form method/action + field names.

    NFC has changed these in the past; introspection keeps us resilient.
    """
    html = fetch(f"{BASE}/search.php", cache, sleep_s)
    soup = BeautifulSoup(html, "html.parser")

    # Pick the first form that contains a select with options including 'Apple'
    form = None
    for f in soup.find_all("form"):
        sel = f.find("select")
        if not sel:
            continue
        opts = [o.get_text(strip=True).lower() for o in sel.find_all("option")]
        if any(x == "apple" for x in opts):
            form = f
            break
    if form is None:
        # fall back to first form
        form = soup.find("form")

    if form is None:
        # last resort: assume GET back to search.php
        return SearchFormSpec(
            url=f"{BASE}/search.php",
            method="get",
            name_field="name",
            fruit_field="fruit",
            fruit_value_map={},
        )

    method = (form.get("method") or "get").lower()
    action = _abs_url(form.get("action") or "search.php")

    # Name field: first text/search input
    name_field = "name"
    for inp in form.find_all("input"):
        t = (inp.get("type") or "").lower()
        if t in {"text", "search"} and inp.get("name"):
            name_field = inp.get("name")
            break

    # Fruit field: select that contains 'Apple' option
    fruit_field = "fruit"
    fruit_value_map: Dict[str, str] = {}
    fruit_select = None
    for sel in form.find_all("select"):
        opts = sel.find_all("option")
        labels = [o.get_text(strip=True).lower() for o in opts]
        if any(x == "apple" for x in labels):
            fruit_select = sel
            break
    if fruit_select is not None:
        if fruit_select.get("name"):
            fruit_field = fruit_select.get("name")
        for o in fruit_select.find_all("option"):
            lab = o.get_text(strip=True).lower()
            val = o.get("value")
            # if value missing, browsers submit the visible text
            fruit_value_map[lab] = val if val is not None else o.get_text(strip=True)

    return SearchFormSpec(
        url=action,
        method=method,
        name_field=name_field,
        fruit_field=fruit_field,
        fruit_value_map=fruit_value_map,
    )


def _submit_search(spec: SearchFormSpec, name: str, fruit_key: str, cache: Cache, sleep_s: float) -> str:
    """Submit search form (GET or POST) and return response html."""
    fruit_label = FRUIT_LABEL[fruit_key].lower()
    fruit_val = spec.fruit_value_map.get(fruit_label, fruit_label)

    payload = {
        spec.name_field: name,
        spec.fruit_field: fruit_val,
    }

    cache_key = f"SEARCH::{spec.method.upper()}::{spec.url}::{payload}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    if spec.method == "post":
        resp = SESSION.post(spec.url, data=payload, timeout=30)
    else:
        resp = SESSION.get(spec.url, params=payload, timeout=30)

    resp.raise_for_status()
    html = resp.text
    cache.set(cache_key, html)
    time.sleep(sleep_s)
    return html


def _first_full2_link(html: str) -> Optional[str]:
    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "full2.php" not in href:
            continue
        # NFC sometimes uses id= and sometimes varid=
        if ("id=" in href) or ("varid=" in href):
            return _abs_url(href)
    return None


def _name_variants(name: str) -> List[str]:
    """Try a few safer variants for NFC search.

    NFC often stores a cultivar under a breeder/registered name rather than a trade name.
    We generate several best-effort variants:
      - original
      - stripped trademarks (®, ™)
      - without parenthetical parts
      - just the parenthetical part (e.g. 'Pink Lady')
      - punctuation-stripped
      - all above, plus accent-stripped variants
    """
    base = normalise_ws(name)

    # normalise common trademark symbols / curly apostrophes
    base = (
        base.replace("®", "")
        .replace("™", "")
        .replace("’", "'")
        .strip()
    )

    variants: List[str] = []

    def add(v: str) -> None:
        v = normalise_ws(v).strip()
        if not v:
            return
        if v not in variants:
            variants.append(v)
        va = strip_accents(v)
        if va and va not in variants:
            variants.append(va)

    add(base)

    # Parenthetical: keep both "outside" and "inside" as candidates
    m = re.search(r"\(([^)]+)\)", base)
    if m:
        inside = m.group(1).strip()
        outside = re.sub(r"\s*\([^)]*\)\s*", " ", base).strip()
        add(outside)
        add(inside)
        # also try inside without punctuation
        add(re.sub(r"[!,:;]", "", inside).strip())

    # Remove punctuation that can trip search
    add(re.sub(r"[!,:;]", "", base).strip())

    # If we had an outside variant, also try it punctuation-stripped
    if m:
        outside2 = re.sub(r"[!,:;]", "", re.sub(r"\s*\([^)]*\)\s*", " ", base)).strip()
        add(outside2)

    return variants


# Best-effort aliasing for a few modern trade names that NFC may store under breeder/registered names.
# Keep this intentionally small to avoid incorrect matches.
APPLE_ALIASES: Dict[str, List[str]] = {
    "jazz": ["Scifresh"],
    "kanzi": ["Nicoter"],
    "envy": ["Scilate"],
    "sweetango": ["Minneiska"],
    "cosmic crisp": ["WA 38", "WA38"],
    "zestar": ["Minnewashta"],
    "honeycrisp": ["MN 1711", "MN1711"],
}

# Common US↔EU pear naming differences (keep small to reduce mis-matches)
PEAR_ALIASES: Dict[str, List[str]] = {
    # Williams’ Bon Chrétien is the same cultivar widely sold as Bartlett
    "bartlett": ["Williams", "Williams' Bon Chretien", "Williams Bon Chretien", "Bon Chretien"],
    "williams": ["Bartlett", "Williams' Bon Chretien", "Williams Bon Chretien", "Bon Chretien"],
    "williams bon chretien": ["Bartlett", "Williams"],
    "williams' bon chretien": ["Bartlett", "Williams"],

    # Beurré Bosc is commonly listed/sold as Bosc
    "bosc": ["Beurre Bosc", "Beurré Bosc"],
    "beurre bosc": ["Bosc", "Beurré Bosc"],
    "beurré bosc": ["Bosc", "Beurre Bosc"],

    # Beurré d’Anjou is commonly listed/sold as Anjou
    "anjou": ["Beurre d'Anjou", "Beurré d'Anjou"],
    "beurre d'anjou": ["Anjou", "Beurré d'Anjou"],
    "beurré d'anjou": ["Anjou", "Beurre d'Anjou"],

    # Doyenné du Comice is commonly listed/sold as Comice
    "comice": ["Doyenne du Comice", "Doyenné du Comice"],
    "doyenne du comice": ["Comice", "Doyenné du Comice"],
    "doyenné du comice": ["Comice", "Doyenne du Comice"],

    # Sold under both names in trade
    "fertilia": ["Invincible"],
    "invincible": ["Fertilia"],
}


def get_with_cache(url: str, params: Dict[str, str], cache: Cache, sleep_s: float) -> str:
    """GET a URL with query params, with simple on-disk caching."""
    items = "&".join(f"{k}={v}" for k, v in sorted(params.items(), key=lambda kv: kv[0]))
    cache_key = f"GET::{url}::{items}"

    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    resp = SESSION.get(url, params=params, timeout=30)
    resp.raise_for_status()
    html = resp.text
    cache.set(cache_key, html)
    time.sleep(sleep_s)
    return html


def resolve_name_to_detail_url(name: str, fruit_key: str, cache: Cache, sleep_s: float) -> Optional[str]:
    """Resolve cultivar name to an NFC /full2.php detail URL.

    In practice, NFC's name-search results are served via `names.php` and include links like:
      full2.php?id=2166&&fruit=apple

    We query names.php first (with a few safe name variants) and pick the first full2.php link.
    If that fails, we fall back to the search-form submission logic.
    """

    # 1) Primary: names.php (try a couple of fruit param variants)
    fruit_params_to_try = [
        fruit_key,                # e.g. 'apple'
        FRUIT_LABEL[fruit_key],   # e.g. 'Apple'
        FRUIT_LABEL[fruit_key].lower(),
    ]

    # Add a few known alias variants (keep intentionally small to avoid incorrect matches)
    extra_variants: List[str] = []

    # Normalised keys for alias lookups
    k = normalise_ws(name).lower().replace("®", "").replace("™", "").replace("’", "'").strip()
    k2 = re.sub(r"[!,:;]", "", k).strip()
    k3 = k.replace("'", "").strip()

    if fruit_key == "apple":
        for key in {k, k2, k3}:
            extra_variants.extend(APPLE_ALIASES.get(key, []))

    if fruit_key == "pear":
        # Also try accent-stripped keys for pears where NFC may be unaccented
        for key in {k, k2, k3, strip_accents(k), strip_accents(k2), strip_accents(k3)}:
            extra_variants.extend(PEAR_ALIASES.get(key, []))

    search_variants = _name_variants(name) + [v for v in extra_variants if v]

    for variant in search_variants:
        for fruit_param in fruit_params_to_try:
            html = get_with_cache(
                f"{BASE}/names.php",
                {"name": variant, "fruit": fruit_param},
                cache,
                sleep_s,
            )
            link = _first_full2_link(html)
            if link:
                return link

        # Fallback: search without fruit filter (helps when NFC expects a different fruit label/value)
        html_nf = get_with_cache(
            f"{BASE}/names.php",
            {"name": variant},
            cache,
            sleep_s,
        )
        link_nf = _first_full2_link(html_nf)
        if link_nf:
            return link_nf

    # 2) Fallback: discovered search form (GET/POST)
    try:
        spec = discover_search_form(cache, sleep_s)
        for variant in search_variants:
            html = _submit_search(spec, variant, fruit_key, cache, sleep_s)
            link = _first_full2_link(html)
            if link:
                return link
    except Exception:
        # Keep resolver best-effort; caller will handle None.
        return None

    return None


def extract_kv_blocks(soup: BeautifulSoup) -> Dict[str, str]:
    """
    NFC pages render as repeated label/value blocks. In text extraction they appear as:
    'Type' then value, 'Shape' then value, etc.

    We'll take the page text and detect a sequence of Label\nValue patterns.
    """
    text = soup.get_text("\n")
    lines = [normalise_ws(x) for x in text.split("\n")]
    lines = [x for x in lines if x]

    kv: Dict[str, str] = {}
    # Labels we care about most. (You can expand later.)
    labels = {
        "Type", "Size", "Shape", "Height", "Width", "Ribbing", "Crown",
        "Ground Colour", "Over Colour", "Over Colour (Amount)", "Over Colour (Pattern)",
        "Russet", "Firmness", "Crunch", "Flesh Colour", "Picking time", "Flowering time",
        "Weight", "Fruit weight", "Skin Colour", "Stone", "Stalk length", "Juice Colour",
        "Strig length", "Skin thickness", "Berry colour", "Flavour", "Fruits per strig",
        "Veining", "Hairiness", "Bristles", "Seed visibility",
    }

    i = 0
    while i < len(lines) - 1:
        lab = lines[i]
        if lab in labels:
            val = lines[i + 1]
            # Ignore obvious navigation clutter
            if val.lower() not in {"submit", "search", "close"}:
                kv[lab] = val
            i += 2
        else:
            i += 1

    return kv


def extract_flowering_and_picking(text: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    Extracts:
    - 10% flowering date (e.g., '12th May')
    - Full (80%) flowering date
    - 90% petal fall date
    - Picking time text (e.g., 'Early October')
    """
    # Using loose regex because NFC mixes formats.
    def find(pattern: str) -> Optional[str]:
        m = re.search(pattern, text, re.IGNORECASE)
        return normalise_ws(m.group(1)) if m else None

    f10 = find(r"10%\s+flowering\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+\w+)")
    f80 = find(r"Full\s*\(80%\)\s+flowering\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+\w+)")
    pf90 = find(r"90%\s+petal\s+fall\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+\w+)")
    pick = find(r"Picking\s+time\s+([A-Za-z].+?)(?:\n|$)")
    return f10, f80, pf90, pick


def extract_description_synonyms_availability(soup: BeautifulSoup) -> Tuple[str, str, str, bool]:
    """
    Best-effort extraction:
    - Description: first paragraph-ish text after the scientific name header
    - Synonyms: text after 'Synonyms:' if present
    - Availability: text after 'Availability'
    """
    text = soup.get_text("\n")
    text = re.sub(r"\n{2,}", "\n", text)

    # Synonyms block
    syn = ""
    m_syn = re.search(r"Synonyms:\s*(.+?)(?:\nAvailability|\nSize|\nType|\nShape|\nFlowering|\nPicking|$)", text, re.DOTALL | re.IGNORECASE)
    if m_syn:
        syn = normalise_ws(m_syn.group(1)).replace(", ", "|")
        syn = syn.replace(" ,", "|").replace(",", "|")

    # Availability block
    avail = ""
    m_av = re.search(r"Availability\s+(.+?)(?:\nParentage|\nSize|\nType|\nShape|\nFlowering|\nPicking|$)", text, re.DOTALL | re.IGNORECASE)
    if m_av:
        avail = normalise_ws(m_av.group(1))
    held = "not currently held" not in avail.lower()

    # Description: take the first “story” chunk between scientific name header and Synonyms/Availability
    desc = ""
    # scientific name line looks like 'Malus domestica Borkh.' etc
    m_sc = re.search(r"\n([A-Z][a-z]+(?:\s+[a-z]+){1,2}\s+[A-Z][^.\n]*\.)\n", text)
    if m_sc:
        start = m_sc.end()
        tail = text[start:]
        m_stop = re.search(r"\nSynonyms:|\nAvailability", tail, re.IGNORECASE)
        chunk = tail[:m_stop.start()] if m_stop else tail[:600]
        desc = normalise_ws(chunk)
        # Trim out obvious headings
        desc = re.sub(r"^(Apple|Pear|Plum|Cherry|Apricot|Blackcurrant|Currants|Gooseberry)\s+", "", desc, flags=re.IGNORECASE)

    return desc, syn, avail, held


def extract_images(soup: BeautifulSoup) -> str:
    urls: List[str] = []
    for img in soup.find_all("img", src=True):
        src = img["src"]
        if "/images/" in src and src.lower().endswith((".jpg", ".jpeg", ".png")):
            if src.startswith("http"):
                urls.append(src)
            elif src.startswith("/"):
                urls.append(BASE + src)
            else:
                urls.append(BASE + "/" + src)
    # de-dup while preserving order
    seen = set()
    out = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return "|".join(out)


def parse_nfc_page(detail_url: str, fruit_key: str, cache: Cache, sleep_s: float) -> Dict[str, str]:
    html = fetch(detail_url, cache, sleep_s)
    soup = BeautifulSoup(html, "html.parser")

    # Title/cultivar name: page h1
    h1 = soup.find(["h1", "h2"])
    cultivar_name = normalise_ws(h1.get_text(" ")) if h1 else ""

    # species scientific: first <h4> often
    sci = ""
    h4 = soup.find("h4")
    if h4:
        sci = normalise_ws(h4.get_text(" "))

    desc, synonyms, availability, held = extract_description_synonyms_availability(soup)

    # KV traits + flowering/picking
    kv = extract_kv_blocks(soup)
    page_text = soup.get_text("\n")
    f10, f80, pf90, pick = extract_flowering_and_picking(page_text)

    # Images
    images = extract_images(soup)

    # IDs from URL
    nfc_id = ""
    m_id = re.search(r"[?&]id=([0-9]+)", detail_url)
    if m_id:
        nfc_id = m_id.group(1)
    else:
        m_varid = re.search(r"[?&]varid=([0-9]+)", detail_url)
        if m_varid:
            nfc_id = m_varid.group(1)

    acc4 = ""
    m_acc4 = re.search(r"[?&]acc4=([0-9]+)", detail_url)
    if m_acc4:
        acc4 = m_acc4.group(1)

    row: Dict[str, str] = {
        "cultivar_id": f"{fruit_key}-{slugify(cultivar_name)}" if cultivar_name else "",
        "fruit_group": fruit_key,
        "species_slug": SPECIES_SLUG.get(fruit_key, ""),
        "cultivar_name": cultivar_name,
        "species_scientific": sci,
        "type_label": kv.get("Type", ""),
        "description_text": desc,
        "synonyms": synonyms,
        "availability_text": availability,
        "held_in_nfc": bool(held),
        "images": images,
        "source_url": detail_url,
        "source_licence": LICENCE_TEXT,
        "nfc_id": nfc_id,
        "acc4": acc4,
        # Phenology (normalised)
        "flower_10pct_mmdd": uk_date_to_mmdd(f10 or ""),
        "flower_full_mmdd": uk_date_to_mmdd(f80 or ""),
        "petal_fall_90pct_mmdd": uk_date_to_mmdd(pf90 or ""),
        "picking_window_text": pick or kv.get("Picking time", ""),
        "bloom_week": mmdd_to_week(uk_date_to_mmdd(f80 or "")),
        "bloom_band": "",
        "harvest_band": "",
        # Enrichment placeholders
        "self_fertile": "",
        "triploid": "true" if re.search(r"\btriploid\b", desc, re.IGNORECASE) else "",
        "pollination_notes": "",
        "disease_scab": "",
        "disease_mildew": "",
        "disease_fire_blight": "",
        "wet_climate_suitability": "",
        "drought_suitability": "",
        "enrichment_sources": "",
    }

    # Add remaining kv traits as columns (wide)
    # (You can keep this, or switch to a single JSON column later)
    for k, v in kv.items():
        if k in {"Type", "Picking time", "Flowering time"}:
            continue
        col = "trait_" + slugify(k).replace("-", "_")
        row[col] = v

    return row


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fruit", required=True, choices=sorted(FRUIT_KEYS))
    ap.add_argument("--input", required=True, help="CSV with column cultivar_name")
    ap.add_argument(
        "--out",
        default="/Users/damianrafferty/Projects/WotNow/cultivars.csv",
        help="Output CSV path (default: /Users/damianrafferty/Projects/WotNow/cultivars.csv)",
    )
    ap.add_argument("--cache-dir", default=".cache_nfc")
    ap.add_argument("--sleep", type=float, default=0.6, help="Seconds to sleep between uncached requests")
    ap.add_argument(
        "--append",
        action="store_true",
        help="If set and --out exists, append/merge new rows into the existing CSV (dedupe by cultivar_id).",
    )
    ap.add_argument(
        "--overwrite",
        action="store_true",
        help="Allow overwriting --out when it already exists (a timestamped .bak is still created).",
    )
    args = ap.parse_args()

    cache = Cache(Path(args.cache_dir))

    inp = pd.read_csv(args.input)
    names = [str(x).strip() for x in inp["cultivar_name"].tolist() if str(x).strip()]

    rows: List[Dict[str, str]] = []
    for name in names:
        detail_url = resolve_name_to_detail_url(name, args.fruit, cache, args.sleep)
        if not detail_url:
            print(f"WARN: Not found in NFC search: {args.fruit} :: {name}", file=sys.stderr)
            rows.append({
                "cultivar_id": f"{args.fruit}-{slugify(name)}",
                "fruit_group": args.fruit,
                "species_slug": SPECIES_SLUG.get(args.fruit, ""),
                "cultivar_name": name,
                "species_scientific": "",
                "type_label": "",
                "description_text": "",
                "synonyms": "",
                "availability_text": "",
                "held_in_nfc": "",
                "images": "",
                "source_url": "",
                "source_licence": LICENCE_TEXT,
                "nfc_id": "",
                "acc4": "",
                "flower_10pct_mmdd": "",
                "flower_full_mmdd": "",
                "petal_fall_90pct_mmdd": "",
                "picking_window_text": "",
                "bloom_week": "",
                "bloom_band": "",
                "harvest_band": "",
                "self_fertile": "",
                "triploid": "",
                "pollination_notes": "",
                "disease_scab": "",
                "disease_mildew": "",
                "disease_fire_blight": "",
                "wet_climate_suitability": "",
                "drought_suitability": "",
                "enrichment_sources": "",
            })
            continue

        row = parse_nfc_page(detail_url, args.fruit, cache, args.sleep)
        rows.append(row)

    df_new = pd.DataFrame(rows)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Safety: refuse to clobber an existing output unless explicitly requested.
    if out_path.exists() and (not args.append) and (not args.overwrite):
        raise SystemExit(
            f"Refusing to overwrite existing file: {out_path}. "
            f"Re-run with --append (recommended) or --overwrite."
        )

    # Always create a timestamped backup if the output already exists.
    if out_path.exists():
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        bak_path = out_path.with_suffix(out_path.suffix + f".{ts}.bak")
        shutil.copy2(out_path, bak_path)
        print(f"Backup created: {bak_path}")

    if args.append and out_path.exists():
        try:
            df_existing = pd.read_csv(out_path)
        except Exception:
            # If the existing file is unreadable, fall back to overwriting.
            df_existing = pd.DataFrame()

        # Union columns so traits discovered in later runs aren't dropped.
        all_cols = list(dict.fromkeys(list(df_existing.columns) + list(df_new.columns)))
        df_existing = df_existing.reindex(columns=all_cols)
        df_new = df_new.reindex(columns=all_cols)

        df_out = pd.concat([df_existing, df_new], ignore_index=True)

        # Dedupe: prefer later rows (new scrape) over old ones.
        if "cultivar_id" in df_out.columns:
            df_out = df_out.drop_duplicates(subset=["cultivar_id"], keep="last")

        df_out.to_csv(out_path, index=False)
        print(f"Merged {len(df_new)} rows into {out_path} (total {len(df_out)})")
    else:
        df_new.to_csv(out_path, index=False)
        print(f"Wrote {len(df_new)} rows to {out_path}")


if __name__ == "__main__":
    main()