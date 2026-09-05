# Go Daisy → The Call · migration plan

**Plan dated:** 5 September 2026 · **Status measured at:** merge of #127

> **All seven phases have shipped.** The status table below is what actually
> happened, kept because the reasoning in the rest of the document is still the
> reasoning the code follows.

The plan below is Damian's, reproduced because it lived only in a chat thread and was
lost to a context compaction once already. The **Status** column is measured against
the repository, not remembered.

The ordering principle: the handoff is organised by screen, and the risk is not in the
screens. Everything except the verdict is presentation over data that already exists.

---

## Sequence

| # | Phase | Status | Where |
|---|-------|--------|-------|
| 0 | Remove Go Daisy+ | **done** | [#113](https://github.com/mrdamianrafferty/wotnow/pull/113) |
| 1a | Verdict engine, day-level | **done** | [#114](https://github.com/mrdamianrafferty/wotnow/pull/114) |
| 1b | Dayparts | **done** | [#118](https://github.com/mrdamianrafferty/wotnow/pull/118) |
| 2 | The call, at `/call` | **done** | [#115](https://github.com/mrdamianrafferty/wotnow/pull/115) |
| 3 | The share renderer | **done** | [#115](https://github.com/mrdamianrafferty/wotnow/pull/115), [#116](https://github.com/mrdamianrafferty/wotnow/pull/116) |
| 4 | Onboarding, three steps | **done** | [#119](https://github.com/mrdamianrafferty/wotnow/pull/119) |
| 5 | The evidence drawer | **done** | [#120](https://github.com/mrdamianrafferty/wotnow/pull/120) |
| 6 | Web: landing, spot pages | **done** | [#122](https://github.com/mrdamianrafferty/wotnow/pull/122), [#127](https://github.com/mrdamianrafferty/wotnow/pull/127) |
| 7 | The swap, then the deletions | **done** | [#126](https://github.com/mrdamianrafferty/wotnow/pull/126) |

### What the plan did not anticipate

Four pieces of work that were not phases and turned out to be load-bearing:

- **A day with a good run of parts is not a write-off** ([#121](https://github.com/mrdamianrafferty/wotnow/pull/121)).
  Found because the evidence drawer put the verdict next to its own bars and
  made them argue in public. No-days fell from 26 of 84 to 14.
- **A privacy policy reachable from inside the app** ([#123](https://github.com/mrdamianrafferty/wotnow/pull/123)) —
  an App Store requirement the new surface did not meet, and the reason the dot
  finally became a menu.
- **OpenWeather removed** ([#125](https://github.com/mrdamianrafferty/wotnow/pull/125)).
  The live path was not the visible fallback.
- **Sharing rewritten as an invitation** ([#127](https://github.com/mrdamianrafferty/wotnow/pull/127)) —
  a 413-character token URL, a leaked "also", and a message that read as a
  weather report rather than an ask.

### Still open

- Whether the landing page's primary CTA should be the redesign rather than
  `/login`. A conversion decision, deliberately not made as a side effect.
- `LandingPage` still serves logged-out visitors and Googlebot. Restyled, not
  replaced — the cookie fork is narrower but not gone.
- `BottomNav` is imported by nothing since `/activities` was archived.
- Measurement. Nothing counts a share, and the "before" for anything `/call`
  changed is unrecoverable. D7 against the old dashboard is also gone now that
  `/` is the call.

### Two preconditions the build ran past

Recorded because both were explicit in the plan and both were skipped, and neither is
visible from the code:

1. **"Phase 2 does not start until [1b] lands. The call screen is never built against
   day-only output."** It was. The mitigation the plan asked for *was* honoured — the
   verdict templates are window-aware from the start (`VerdictInput.window`,
   `WINDOW_CLAUSE` in `lib/godaisy/call/verdict.ts`), so 1b fills a slot rather than
   rewriting copy in ten locales. But nothing populates `window` today, so no call has
   ever said "before eleven", which is most of what makes this read as advice rather
   than a forecast.

2. **"Capture today's numbers before phase 2 ships. A redesign with no before is a
   redesign you cannot argue about afterwards."** Phase 2 shipped without a baseline,
   and there is still **no instrumentation of any kind** in the call flow — no send
   event, no attribution on `/share/[token]`, no funnel from a received link. The
   before is now unrecoverable for anything that changed with `/call`; D7 retention
   against the dashboard is still capturable because `/` is untouched.

---

## Phase 1b — dayparts

Score morning / afternoon / evening against each activity's thresholds. The best run of
parts is the window.

Resolution was settled deliberately, twice:

| Resolution | Evaluations per user per day | What the call can say |
|---|---|---|
| Day | 56 | "Today is a surf day." No window. |
| **Dayparts** | **168** | "…before eleven." "…on tonight." "Best in the morning." |
| Hourly | 1,344 | "07:00–10:00" — more precision than the forecast has |

Full hourly is wrong on **honesty**, not cost: twenty-four discrete scores invite the app
to claim the wind turns at 10:00 when the forecast cannot support it, contradicting its
own rule about never putting a confident sentence over incomplete data.

Nearly free to build — `unified-weather.ts` already fetches and maps ~5 days of hourly
series, so this iterates an array that exists rather than adding an ingestion layer.

The two cases that genuinely need clock times do not come from scoring at all: tide
extremes already return times from `pages/api/tides.ts`, and the astronomy endpoints
already return them for "clear skies at midnight".

**While the window is missing:** the reason drops its second sentence, the third FactTile
carries a value rather than a range, and HourBars stays out of the drawer. Nothing
breaks; the call simply knows less, and says less.

---

## Phase 4 — onboarding, three steps

Only needed once strangers arrive. Absorbs `pages/onboarding.tsx` (1,243),
`pages/interests.tsx` (955) and `components/QuickSetupModal.tsx` (442) into one flow:
**sports, spots, hour.**

Push permission moves here and becomes load-bearing — the notification is the product's
heartbeat.

---

## Phase 5 — the evidence drawer

Everything `pages/weather.tsx` does today — 1,568 lines, eight sections — on demand, over
the call, **ordered by which inputs moved the verdict**. Mostly re-presentation of working
code, which makes it lower risk than its size suggests.

Depends on 1b for HourBars.

---

## Phase 6 — web

Replaces `LandingPage.tsx` and resolves the cookie fork. The ~2,000 spot pages already
exist and already rank — **restyle them, do not regenerate them, and keep every URL.**
Two-directional internal linking is what turns them into a network, and it costs nothing
but a template.

---

## Phase 7 — the swap, then the deletions

`/call` becomes `/`. Then, and only then, delete `pages/activities.tsx` (1,233), the five
navigation components (779 lines, of which `AppHeader` is 620), the day-tab components,
the quick-setup modal, and the warning strips.

**Deleting early feels like progress and is the most common way a migration like this
strands itself half-done.**

---

## Running alongside

| Thread | When | Note |
|---|---|---|
| Voice, in nine languages | from phase 1 | Templates are **authored** per locale, not translated — the lead-in cannot be translated as a phrase, because the article agrees with a noun that changes. Blocked on DeepL quota until 1 October for the register switch; the authoring is not blocked at all. |
| Activity imagery | before phase 3 | **Done.** 117 of 118 mapped. The share pre-bake is 327 images, 23.3 MB, ~20 s, wired into `prebuild` / `vercel-build.sh`. |

---

## Risks

1. **The sentences are mediocre.** The single biggest risk, and no test catches it — only
   reading a week of real output. This is why the engine shipped as
   `scripts/print-calls.ts` before it shipped as an API. Run it while tuning; it costs
   nothing.
2. **Resolution creep.** The compute is not the risk. The risk is reaching for hourly
   *because* it is cheap, then writing sentences more precise than the forecast supports.
3. **The spot pages break.** ~2,000 indexed URLs are the only organic acquisition the
   product has. Any change that alters those paths costs more than the redesign gains.
   (The share card now prints `/{activity}/{location}`, which makes this load-bearing in
   a second place.)
4. **Half-migrated for a long time.** Two home screens, two navigation models, one
   codebase. Keep the window short; resist deleting until the swap.

---

## Measurement

Word of mouth is the success metric, so instrument it directly rather than inferring from
installs. **None of this exists yet.**

| Signal | Reads on |
|---|---|
| Shares per active day | Whether the card is worth sending — the core premise |
| Share → first call by a new person | Whether the object actually recruits |
| Push open rate | Whether one message a day is welcome or ignored |
| Alternates cycled per session | Whether one answer is enough, or the cap is wrong |
| D7 retention vs today's baseline | Whether The Call beats the dashboard it replaced |

---

## What to cut, in this order

None of it is in phases 0–3.

1. **The editorial template.** `/how-we-know` is a trust asset, not a launch asset.
2. **The story crop.** Three renders instead of four — the chat card and the link preview
   carry the growth model, and nobody has safe-area specced 1080×1920.
3. **The landing rebuild.** The cookie fork is ugly, but it is not what is stopping
   growth. Spot pages are where strangers actually arrive.
4. **The full evidence drawer.** Ship two paragraphs of prose and the hour bars; leave the
   nine collapsed rows.

**Not** the alternates control, though it looks optional: the seeding decision means good
days routinely have several right answers, and without it the call has no cheap way to
show the second one.

---

Line counts and gate locations re-measured at `f8c50598`; the plan's own figures were
taken at `e86c0569` and differ by a few lines where files have since changed.
