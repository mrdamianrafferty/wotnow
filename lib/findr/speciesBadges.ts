// Central catalogue for all badge keys coming from DB (species_badges)
// Add new keys here any time without touching DB schema.

export type BadgeKey =
  | "shark"
  | "ray_skate"
  | "cephalopod"
  | "crustacean"
  | "flatfish"
  | "billfish"
  | "gamefish"
  | "baitfish"
  | "salmonid"
  | "migratory"
  | "deepwater"
  | "reef_specialist";

export type BadgeMeta = {
  key: BadgeKey;
  emoji: string;          // primary UI glyph
  label: string;          // short label for chip
  tooltip?: string;       // optional longer hint
  color?: string;         // DaisyUI color token for chip
};

export const BADGE_META: Record<BadgeKey, BadgeMeta> = {
  shark:            { key: "shark",            emoji: "🦈", label: "Shark",        tooltip: "Elasmobranch (shark)",                color: "error" },
  ray_skate:        { key: "ray_skate",        emoji: "🛸", label: "Ray/Skate",    tooltip: "Rays & skates",                        color: "warning" },
  cephalopod:       { key: "cephalopod",       emoji: "🐙", label: "Cephalopod",   tooltip: "Octopus / squid / cuttlefish",         color: "primary" },
  crustacean:       { key: "crustacean",       emoji: "🦀", label: "Crustacean",   tooltip: "Crab / lobster / shrimp",              color: "secondary" },
  flatfish:         { key: "flatfish",         emoji: "🐟", label: "Flatfish",     tooltip: "Plaice / sole / halibut / turbot",     color: "info" },
  billfish:         { key: "billfish",         emoji: "🗡️", label: "Billfish",     tooltip: "Marlin / sailfish / swordfish",        color: "accent" },
  gamefish:         { key: "gamefish",         emoji: "🛥️", label: "Gamefish",    tooltip: "High-profile sport species",           color: "success" },
  baitfish:         { key: "baitfish",         emoji: "🐟", label: "Baitfish",     tooltip: "Forage species (herring, mackerel…)",  color: "info" },
  salmonid:         { key: "salmonid",         emoji: "🎣", label: "Salmonid",     tooltip: "Salmo / Oncorhynchus / Salvelinus",    color: "success" },
  migratory:        { key: "migratory",        emoji: "🧭", label: "Migratory",    tooltip: "Seasonal movements (e.g., anadromous)",color: "neutral" },
  deepwater:        { key: "deepwater",        emoji: "🕳️", label: "Deepwater",    tooltip: "Beyond shelf / deeper habitats",       color: "neutral" },
  reef_specialist:  { key: "reef_specialist",  emoji: "🪸", label: "Reef",         tooltip: "Reef/structure associated",            color: "primary" },
};

// Defensive mapping from DB -> safe BadgeMeta[]
export function resolveBadgeMeta(badges: (string | null | undefined)[] | null | undefined): BadgeMeta[] {
  if (!badges?.length) return [];
  const uniq = Array.from(new Set(badges.filter(Boolean))) as string[];
  const resolved: BadgeMeta[] = [];
  for (const key of uniq) {
    if (key in BADGE_META) {
      resolved.push(BADGE_META[key as BadgeKey]);
    }
  }
  // Optional: stable presentation order
  const order: BadgeKey[] = [
    "shark","ray_skate","cephalopod","crustacean","flatfish",
    "billfish","gamefish","baitfish","salmonid","migratory",
    "deepwater","reef_specialist",
  ];
  resolved.sort((a,b) => order.indexOf(a.key) - order.indexOf(b.key));
  return resolved;
}