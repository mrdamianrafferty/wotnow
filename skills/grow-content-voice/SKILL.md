---
name: grow-content-voice
description: Content voice for Grow Daisy — writes UK gardening prose in three modes. Editorial (species pages, blog, hubs) blends Monty Don × Beth Chatto — warm, observational, place-aware. Practical task copy (in-app tasks, HowTo steps, push, errors, onboarding) is Charles Dowding-direct — imperative, no hedging. Quick-answer SEO lead (top 80–150 words of every plant page, FAQ answers, schema content) is dense, factual, UK-specific with a number in sentence one — the paragraph ChatGPT and Perplexity quote. Anti-pattern across all modes: smugness — no lecturing, class-marker language, performative Latin, preening hedges, corporate marketing speak. Use when writing Grow Daisy prose: species descriptions, blog posts, FAQ pairs, HowTo steps, app strings, push notifications, App Store listings, onboarding, marketing copy. Trigger on "write copy", "species bio", "plant page", "blog post", "voice", "tone", "app copy", "quick answer", "FAQ for", "HowTo for", "how to grow", "when to plant".
---

# Grow Daisy Content Voice

Grow Daisy is read by UK and Irish gardeners who already know more than most websites give them credit for. They have allotments and back gardens and window boxes. They've killed plants. They know what their soil is like. They want help with timing, with the species they don't know, with the pests they've just seen for the first time. They don't want to be patronised, marketed at, or made to feel that the writer is showing off.

Three voices, each for a different content type. Voice is not just words — it's sentence length, what the writer notices, what they leave out, and how much they're willing to be uncertain in public.

## Three voice modes

| Mode | Use for | Touchstone | Reference |
|---|---|---|---|
| **Editorial / contemplative** | Species page About paragraph, blog posts, hub pages, long-form guides, the "in your garden this week" rail — anything read at leisure | Monty Don × Beth Chatto blend | `references/voice-editorial.md` |
| **Practical / task copy** | In-app tasks, HowTo steps (the steps themselves), push notifications, onboarding, empty states, error messages, "what to do this week" panel | Charles Dowding | `references/voice-practical.md` |
| **Quick-answer SEO lead** | The 80–150 word paragraph that opens every plant page; FAQ answers; schema JSON-LD content; anything an AI assistant will quote | Its own discipline — dense, factual, UK-specific, number in sentence one | `references/voice-quick-answer.md` |

If in doubt which voice to use, the question is: **is the reader sitting down with a cup of tea, or are they outside with mud on their hands?** Tea → editorial. Mud → practical. The paragraph that AI will quote is a third thing — that's its own discipline.

## Anti-pattern across all modes: smugness

Smugness is the dominant failure mode of UK gardening writing. The fix is usually to remove the line rather than soften it.

Quick check before publishing — does the prose:

1. Talk down to the reader? ("of course", "as any gardener knows")
2. Gatekeep? (class-marker language, "the dedicated grower")
3. Show off? (performative Latin in opening paragraphs)
4. Hedge to preen? ("though I never grow them this way myself…")
5. Use words the reader won't use? (corporate "transform", "leverage", "harness")

Any "yes" means rewrite. Full check with worked examples in `references/anti-smugness.md`.

## Reference files

| Topic | File |
|---|---|
| Editorial / contemplative voice with worked example and counter-examples | `references/voice-editorial.md` |
| Practical / task copy voice with examples per content type | `references/voice-practical.md` |
| Quick-answer SEO lead voice — structure, word target, AI-citation rationale | `references/voice-quick-answer.md` |
| British English vocabulary, spelling, units, when to use Latin, house style for headers | `references/british-english.md` |
| Anti-smugness check, smug → direct rewrites, smug words to strike on sight | `references/anti-smugness.md` |
| Voice references — Monty Don, Beth Chatto, Dowding, what to read and what to avoid | `references/voice-references.md` |

For a piece of content that touches multiple modes (a species page has a quick-answer lead **and** an editorial About paragraph **and** practical HowTo steps), load each relevant reference for the section you're writing.

## Practical workflow

When asked to write any Grow Daisy prose:

1. **Identify the content type** — long-form editorial, in-app task, quick-answer lead, FAQ, push, error, etc. — and pick the voice mode.
2. **Identify the audience and intent** — someone reading a plant page on a Sunday is in a different mode from someone tapping a push notification while looking at their courgette plant.
3. **Consult `grow-gardening-expert`** for any horticultural detail before writing. Voice without correct facts is just lifestyle copy.
4. **Load the relevant voice-mode reference** for examples and discipline.
5. **Draft**, then read back through the anti-smugness check (`references/anti-smugness.md`).
6. **Trim.** First drafts are usually 20% too long. Practical voice especially benefits from a second pass that cuts every word that isn't doing work.
7. **Spell-check in British English** — see `references/british-english.md`.

## Must-know-immediately (don't load a reference)

- **British English by default.** Courgette not zucchini, aubergine not eggplant, autumn not fall, organise not organize.
- **Em-dashes for asides**, generously. Sentence-case for headings, not Title Case.
- **°C only**; metric for plant spacing and plot dimensions; "fortnight" and "season" for time durations.
- **Latin names sparingly** in opening paragraphs. They belong in Quick Facts cards, H1 elements, or where they disambiguate — not as decoration.
- **The first sentence of a quick-answer lead carries a number.** Always.
- **"Simply" and "just" are smug words.** If removing them leaves a complete instruction, they were filler.
