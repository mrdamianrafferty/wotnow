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
| `pages/interests.tsx` | `/interests` — the activity picker | `/start` step 1, grouped and ordered by what people recognise | 6 Sep 2026 |
| `pages/onboarding.tsx` | `/onboarding` — the old three-screen first run | `/start` | 6 Sep 2026 |
| `components/BottomNav.tsx` | The Go Daisy tab bar | Nothing. The call has no tab bar; the menu is behind the hamburger | 6 Sep 2026 |

`pages/index.tsx`'s previous contents — `HomeApp`, ~1,300 lines — are not here.
That one is in git history rather than in the tree, because it was the page
being replaced rather than something with a life of its own.

## Why these three went together

`/interests` and `/onboarding` both did what `/start` does, and both stayed
reachable until the last of the old chrome came off: `/account` pointed at
`/interests` until [#131](https://github.com/mrdamianrafferty/wotnow/pull/131),
and after [#132](https://github.com/mrdamianrafferty/wotnow/pull/132) the only
remaining link lived inside `AppHeader` — a loop rather than a route, since the
only page still mounting `AppHeader` was `/interests` itself.

`BottomNav` was imported by one page nobody links to, `app/settings`. Grow
Daisy has its own `GrowBottomNav` and is unaffected.

`app/settings` is NOT here. It is unlinked and mostly duplicates `/account`,
but it is the only place a signed-in person can change their password — and
password auth is live (`signInWithPassword`, `signUp`) — so archiving it would
remove a capability rather than a duplicate.
