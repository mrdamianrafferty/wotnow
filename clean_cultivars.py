#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs

IN_PATH = Path("cultivars.csv")
OUT_PATH = Path("cultivars.cleaned.csv")
REPORT_PATH = Path("cultivars.clean_report.md")

# Toggle: if True, will auto-relabel obvious non-apple rows (e.g. cherry) rather than only flagging.
AUTO_RECLASSIFY = False

JUNK_TOKENS_EXACT = {
    "check_circle",
    "cancel",
    "open_in_new",
    "tree 1",
    "tree 2",
}

JUNK_TOKEN_SUBSTRINGS = [
    "copyright information",
    "close email contact us",
    "brush",
]

MONTH_FIX = {
    "january": "January",
    "february": "February",
    "march": "March",
    "april": "April",
    "may": "May",
    "june": "June",
    "july": "July",
    "august": "August",
    "september": "September",
    "october": "October",
    "november": "November",
    "december": "December",
}

DATE_MMDD_RE = re.compile(r"^\s*(\d{2})-(\d{2})\s*$")  # 05-12
BOOL_TRUE = {"true", "yes", "1", "y", "t"}
BOOL_FALSE = {"false", "no", "0", "n", "f"}

def parse_fruit_from_url(url: str) -> str | None:
    if not url:
        return None
    try:
        q = parse_qs(urlparse(url).query)
        fruit = q.get("fruit", [None])[0]
        return fruit
    except Exception:
        return None

def scrub_value(v: str) -> str:
    if v is None:
        return ""
    v = v.strip()
    if not v:
        return ""
    low = v.lower()

    if low in JUNK_TOKENS_EXACT:
        return ""

    for s in JUNK_TOKEN_SUBSTRINGS:
        if s in low:
            return ""

    # Remove obvious UI tokens embedded in longer text
    v = v.replace("check_circle", "").replace("open_in_new", "").replace("cancel", "")
    # Normalise whitespace
    v = re.sub(r"\s+", " ", v).strip()
    return v

def norm_bool(v: str) -> str:
    if not v:
        return ""
    low = v.strip().lower()
    if low in BOOL_TRUE:
        return "True"
    if low in BOOL_FALSE:
        return "False"
    return v.strip()

def norm_mmdd(v: str) -> str:
    if not v:
        return ""
    m = DATE_MMDD_RE.match(v)
    if not m:
        return v.strip()
    mm, dd = m.group(1), m.group(2)
    # Keep as MM-DD
    return f"{mm}-{dd}"

def norm_picking_text(v: str) -> str:
    if not v:
        return ""
    s = scrub_value(v)
    low = s.lower()
    # Title-case month names while preserving prefixes like Early/Late/Mid
    parts = low.split()
    out = []
    for p in parts:
        out.append(MONTH_FIX.get(p, p.capitalize()))
    return " ".join(out)

def looks_like_scrape_blob(desc: str) -> bool:
    if not desc:
        return False
    low = desc.lower()
    return (
        low.startswith("availability ")
        or "accession no." in low
        or "fingerprint" in low
        or "received by the national fruit trials" in low
    )

def shorten_description(desc: str) -> str:
    """Keep a clean human-friendly paragraph; drop the scrape-y blocks."""
    if not desc:
        return ""
    d = scrub_value(desc)
    if not d:
        return ""

    if looks_like_scrape_blob(d):
        # If it starts with "Availability..." it's usually not a real description
        # Try to salvage a sentence after it; otherwise blank it.
        # Split on common markers and keep the earliest "normal" sentence.
        for cut in [" Accession No.", " Flowering time", " Picking time", " References:", " copyright "]:
            idx = d.lower().find(cut.lower())
            if idx > 0:
                d = d[:idx].strip()
                break

        # If still starts with Availability after cutting, empty it
        if d.lower().startswith("availability"):
            return ""

    # Cap extremely long descriptions (keeps UX sane)
    if len(d) > 500:
        d = d[:500].rsplit(" ", 1)[0].strip() + "…"
    return d

def main() -> None:
    if not IN_PATH.exists():
        raise SystemExit(f"Could not find {IN_PATH.resolve()}")

    report_lines: list[str] = []
    report_lines.append("# Cultivar CSV cleaning report\n")

    with IN_PATH.open("r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        header = [h.strip() for h in header]
        ncols = len(header)

        rows: list[list[str]] = []
        for line_no, row in enumerate(reader, start=2):
            # Fix row width issues safely
            if len(row) < ncols:
                report_lines.append(f"- Line {line_no}: **SHORT ROW** ({len(row)}<{ncols}) padded with blanks.")
                row = row + [""] * (ncols - len(row))
            elif len(row) > ncols:
                # Don’t silently shift columns: keep overflow in the last column and report it
                overflow = row[ncols:]
                report_lines.append(
                    f"- Line {line_no}: **LONG ROW** ({len(row)}>{ncols}) overflow merged into last column: {overflow[:3]}{'…' if len(overflow)>3 else ''}"
                )
                row = row[: ncols - 1] + [row[ncols - 1] + "," + ",".join(overflow)]
            rows.append(row)

    # Build dict rows
    dict_rows: list[dict[str, str]] = []
    for row in rows:
        d = {header[i]: row[i] for i in range(len(header))}
        dict_rows.append(d)

    # Column names we expect (only used if present)
    def has(col: str) -> bool:
        return col in header

    # Clean rows
    for idx, r in enumerate(dict_rows, start=2):  # approx original line numbers after header
        # Scrub all values
        for k in list(r.keys()):
            r[k] = scrub_value(r[k])

        # Normalise booleans/dates/text
        if has("held_in_nfc"):
            r["held_in_nfc"] = norm_bool(r["held_in_nfc"])
        for col in ["flower_10pct_mmdd", "flower_full_mmdd", "petal_fall_90pct_mmdd"]:
            if has(col):
                r[col] = norm_mmdd(r[col])
        if has("picking_window_text"):
            r["picking_window_text"] = norm_picking_text(r["picking_window_text"])

        # Clean description
        if has("description_text"):
            r["description_text"] = shorten_description(r["description_text"])

        # Flag / reclassify obvious species mismatches using source_url fruit=...
        fruit_from_url = parse_fruit_from_url(r.get("source_url", "")) if has("source_url") else None
        fg = r.get("fruit_group", "")
        sci = r.get("species_scientific", "")
        cultivar_id = r.get("cultivar_id", "")

        if fruit_from_url and fg and fruit_from_url != fg:
            report_lines.append(
                f"- cultivar_id `{cultivar_id}`: fruit_group `{fg}` but source_url says `{fruit_from_url}`."
            )
            if AUTO_RECLASSIFY and has("fruit_group"):
                r["fruit_group"] = fruit_from_url

        if fg == "apple" and sci and not sci.startswith("Malus"):
            report_lines.append(
                f"- cultivar_id `{cultivar_id}`: fruit_group apple but species_scientific is `{sci}`."
            )

        # Specific known misfile: Black Tartarian E is cherry
        if cultivar_id == "apple-black-tartarian-e":
            report_lines.append(
                f"- cultivar_id `{cultivar_id}`: looks like **cherry** (Prunus avium; NFC url fruit=cherry)."
            )
            if AUTO_RECLASSIFY:
                if has("fruit_group"):
                    r["fruit_group"] = "cherry"
                if has("species_slug"):
                    r["species_slug"] = "fruit-cherry"
                if has("cultivar_id"):
                    r["cultivar_id"] = "cherry-black-tartarian-e"

    # Write output
    with OUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(dict_rows)

    with REPORT_PATH.open("w", encoding="utf-8") as f:
        if len(report_lines) == 1:
            report_lines.append("- No issues found.\n")
        f.write("\n".join(report_lines) + "\n")

    print(f"Wrote: {OUT_PATH}")
    print(f"Wrote: {REPORT_PATH}")

if __name__ == "__main__":
    main()