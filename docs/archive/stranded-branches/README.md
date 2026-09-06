# Documents rescued from stranded branches

These were written on branches that were never merged and never had a pull
request. The branches have been deleted; the documents are here because a
design brief nobody can find is the same as one that was never written.

Rescued 6 September 2026, when the repository went from 52 remote branches to
11. Everything else deleted that day was already in `main` — squash-merged, so
`git branch --no-merged` still listed it. These six were the genuine exceptions,
and two of them held nothing but words.

## Where they came from

| Branch | Written | What it held |
|---|---|---|
| `claude/design-grow-daisy-navigation-011CV1zrgaRkuM6pTaZ6zsH3` | Nov 2025 | Grow Daisy navigation and homepage design, plus a Findr fish-ID guide that drifted in |
| `claude/daisy-spinoff-app-proposals-011CUxYXatYy9aThiJLwWLde` | Nov 2025 | Spinoff app proposals, a Grow implementation guide, UX navigation notes |

Branch tips are recorded in `~/wotnow-deleted-branch-tips-20260906.txt`, so the
code that came with them can still be recovered by SHA.

## Read these knowing they are old

**Nothing here has been checked against the current codebase**, and the app has
moved a long way since November 2025 — Go Daisy has been rebuilt around the
call, and Grow's navigation is still the open item these documents were written
to solve. Treat them as a record of what somebody was thinking, not as a
description of how anything works.

Two specific warnings:

- **The Findr documents describe another repository.** `FINDR_FISH_ID_*`,
  `AI_VISION_API_ALTERNATIVES` and `TESTING_SUMMARY_HUGGINGFACE_FISH_ID` are
  about Hugging Face fish identification, and Findr left this repo. The code
  that went with them was left on the branch rather than rescued, because it
  imports from paths that no longer exist here.
- **`GROW_DAISY_API_ENDPOINTS.md` and `GROW_DAISY_COMPONENT_MAPPING.md` are the
  most likely to be wrong.** Both name specific files and routes, and both
  predate a year of change. `DATABASE_SCHEMA_REFERENCE.md` and the code itself
  are the sources of truth.

## What may still be worth reading

`GROW_DAISY_HOMEPAGE_DESIGN_BRIEF.md`, `GROW_DAISY_NAVIGATION_UPDATE.md` and
`GROW_DAISY_UX_NAVIGATION.md` were written about a problem that is still open:
`LAUNCH_ROADMAP.md` phase 4 records that Grow has three competing navigation
implementations. Whoever takes that on should at least know this thinking
existed, even if they disagree with all of it.

`SPINOFF_APP_PROPOSALS.md` predates Grewp, Rise Daisy and Fly Cast Coach, which
now exist. It is interesting mostly as a record of which bets were taken.
