# Daisy Serif

**Daisy Serif is a subset of [Charis SIL](https://software.sil.org/charis/) 6.101
by SIL International**, licensed under the SIL Open Font License 1.1 (`OFL.txt`).

It carries a different name because it has to. The OFL declares "Charis" and
"SIL" as Reserved Font Names, and clause 3 forbids a Modified Version from using
them. These files are subset to the ten locales Go Daisy ships, which is a
modification — so the internal name tables were rewritten to `Daisy Serif`, and
nameID 10 in each file records what it derives from. The original copyright
string (nameID 0) is retained, as the licence requires.

**This is not endorsed by or associated with SIL International.**

| | |
|---|---|
| Faces | Regular 400, Bold 700, Italic 400 |
| Web | `.woff2`, ~57 KB total |
| Renderer | `.ttf` — satori takes font buffers, not family names |
| Coverage | Latin + the diacritics for en, es, fr, pt, de, it, nl, pl, sv, tr |
| Features kept | `kern`, `liga`, `smcp`, `c2sc`, `ccmp`, `mark`, `mkmk` |

`smcp` is the point. Georgia has no small-caps at all, so the 11px italic
small-caps label the design system calls its signature was synthesised by the
browser on every platform. These are drawn glyphs.

To regenerate, subset from the upstream release with `pyftsubset`, then rewrite
the name table — a subset that still says "Charis SIL" inside is a licence
violation, however harmless it looks.
