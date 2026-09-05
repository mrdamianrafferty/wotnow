# scripts/backups

Local recovery data written before any bulk change to translation tables.
**Not committed** — see `.gitignore`. Keep it: `scripts/translation-repair.mjs`
reads the most recent `translation_cache-passthrough-*.json` to know which rows
to refill, and the `ui_text_strings-fr-*.json` files are the undo for the French
register switch.

| File | Written by | Contains |
|---|---|---|
| `translation_cache-passthrough-<date>.json` | the 5 Sep 2026 purge | the 3,491 rows cached as English before `autoTranslate.ts` stopped caching failures |
| `ui_text_strings-fr-<timestamp>.json` | `translation-repair.mjs`, job 1 | `old_fr` / `new_fr` for every French string moved from *vous* to *tu* |

If the passthrough file is lost, the cache still self-heals: those rows are now
simply cache misses, so they translate on next use. The file only lets the repair
run proactively instead of on demand.
