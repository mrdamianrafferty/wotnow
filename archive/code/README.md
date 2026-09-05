# Archived code

Superseded by the Go Daisy redesign and kept because it may be wanted again.
Nothing here is built, typechecked, linted or routed — `archive/` is outside
`tsconfig`'s `include` and is ignored by ESLint, so these files cannot break a
build and will also not be kept compiling as the code around them moves on.

Read them, copy from them, or restore one with `git mv`. If you restore a page,
remember it becomes a route again the moment it lands back in `pages/`.

| File | Was | Superseded by | Archived |
|---|---|---|---|
| `pages/activities.tsx` | `/activities` — the activity dashboard, 1,233 lines | `/` (the call) and `/weather` | 5 Sep 2026 |
| `components/QuickSetupModal.tsx` | The first-run location/interests prompt, 442 lines | `/start` | 5 Sep 2026 |

`pages/index.tsx`'s previous contents — `HomeApp`, ~1,300 lines — are not here.
That one is in git history rather than in the tree, because it was the page
being replaced rather than something with a life of its own.
