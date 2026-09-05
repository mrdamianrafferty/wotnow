# Inter — for the share renderer only

Subset of [Inter](https://github.com/rsms/inter) by Rasmus Andersson, SIL Open
Font License 1.1 (`OFL.txt`). **Inter declares no Reserved Font Name**, so unlike
Daisy Serif these keep their original name.

The app's body and data type is the system stack — SF Pro, Segoe, Roboto — which
does not exist on a server. Satori takes font *buffers*, not family names, so the
sans half of the type system has to ship as a file too. Inter is the closest
widely-available match to that stack, and the parent design system already
carried `Inter-Regular.otf` in its bundle.

TTF, not WOFF2: satori reads raw buffers. Two weights, `tnum` retained because
every number on the share card is tabular. ~40 KB each, and they are **not**
served to browsers — nothing links them from CSS.
