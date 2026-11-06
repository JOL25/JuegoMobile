import { getLanguage } from "../game/ui/i18n.js";
import { createWeapon, createUltimate } from "../game/weapons/registry.js";
import { DASH } from "../game/config.js";

// Display identity is independent of save IDs and combat balance.
const ITEMS = {
  magic_wand: {
    symbol: "↗",
    color: "#8ee3f5",
    shape: "needle",
    es: [
      "Aguja vectorial",
      "VECTOR",
      "Proyectiles que trazan el camino hasta su objetivo.",
    ],
    en: [
      "Vector Needle",
      "VECTOR",
      "Projectiles trace a path to their target.",
    ],
  },
  whip: {
    symbol: "⌁",
    color: "#f4c66b",
    shape: "arc",
    es: [
      "Arco tangente",
      "ARCO",
      "Un barrido curvo corta a los enemigos cercanos.",
    ],
    en: ["Tangent Arc", "ARC", "A curved sweep cuts through nearby enemies."],
  },
  garlic: {
    symbol: "◎",
    color: "#a7e8b1",
    shape: "orbit",
    es: [
      "Órbita repulsora",
      "CÍRCULO",
      "Anillos de energía dañan y ralentizan a tu alrededor.",
    ],
    en: [
      "Repulsor Orbit",
      "CIRCLE",
      "Energy rings damage and slow enemies around you.",
    ],
  },
  pierce_ray: {
    symbol: "╱",
    color: "#c7b4ff",
    shape: "prism",
    es: [
      "Prisma lineal",
      "PRISMA",
      "Un haz recto atraviesa toda la formación enemiga.",
    ],
    en: [
      "Linear Prism",
      "PRISM",
      "A straight beam pierces the enemy formation.",
    ],
  },
  missile: {
    symbol: "▲",
    color: "#f7a17e",
    shape: "delta",
    es: [
      "Delta explosiva",
      "TRIÁNGULO",
      "Un delta persigue a su objetivo y estalla en área.",
    ],
    en: [
      "Explosive Delta",
      "TRIANGLE",
      "A delta pursues its target and detonates in an area.",
    ],
  },
  tome: {
    symbol: "✚",
    color: "#f296a8",
    shape: "core",
    es: [
      "Núcleo circular",
      "NÚCLEO",
      "Expande el núcleo y aumenta tu vida máxima.",
    ],
    en: [
      "Circular Core",
      "CORE",
      "Expand your core to increase maximum health.",
    ],
  },
  boots: {
    symbol: "↠",
    color: "#8ee3f5",
    shape: "velocity",
    es: [
      "Vector de impulso",
      "VECTOR",
      "Más velocidad para atravesar la horda.",
    ],
    en: ["Impulse Vector", "VECTOR", "Move faster through the horde."],
  },
  armor: {
    symbol: "⬡",
    color: "#a7e8b1",
    shape: "hexagon",
    es: [
      "Coraza hexagonal",
      "HEXÁGONO",
      "Placas de seis lados reducen el daño recibido.",
    ],
    en: [
      "Hexagonal Shell",
      "HEXAGON",
      "Six-sided plates reduce incoming damage.",
    ],
  },
  amulet: {
    symbol: "⊕",
    color: "#c7b4ff",
    shape: "magnet",
    es: [
      "Radio magnético",
      "RADIO",
      "Amplía el radio que atrae los fragmentos de experiencia.",
    ],
    en: [
      "Magnetic Radius",
      "RADIUS",
      "Widen the radius that attracts experience shards.",
    ],
  },
  heart: {
    symbol: "↻",
    color: "#f296a8",
    shape: "cycle",
    es: [
      "Ciclo vital",
      "CICLO",
      "Recicla la energía de los enemigos derrotados en vida.",
    ],
    en: [
      "Vital Cycle",
      "CYCLE",
      "Recycle defeated enemies' energy into health.",
    ],
  },
  ult_pierce_shot: {
    symbol: "◆",
    color: "#c7b4ff",
    shape: "diamond",
    es: [
      "Diamante absoluto",
      "DIAMANTE",
      "Libera un gran proyectil que atraviesa la horda.",
    ],
    en: [
      "Absolute Diamond",
      "DIAMOND",
      "Release a huge projectile that pierces the horde.",
    ],
  },
  ult_wave: {
    symbol: "◉",
    color: "#f7a17e",
    shape: "nova",
    es: [
      "Supernova radial",
      "RADIAL",
      "Una onda creciente golpea todo lo que cruza.",
    ],
    en: [
      "Radial Supernova",
      "RADIAL",
      "An expanding wave strikes everything it crosses.",
    ],
  },
  ult_orbit_laser: {
    symbol: "⊙",
    color: "#f4c66b",
    shape: "constellation",
    es: [
      "Constelación orbital",
      "ÓRBITA",
      "Haces giratorios barren el espacio a tu alrededor.",
    ],
    en: [
      "Orbital Constellation",
      "ORBIT",
      "Rotating beams sweep the space around you.",
    ],
  },
  dash: {
    symbol: "»",
    color: "#8ee3f5",
    shape: "dash",
    es: [
      "Salto vectorial",
      "DESPLAZAMIENTO",
      "Cruza el peligro con un impulso direccional.",
    ],
    en: ["Vector Dash", "MOVEMENT", "Cross danger with a directional burst."],
  },
  health: {
    symbol: "+",
    color: "#f296a8",
    shape: "health",
    es: ["Integridad", "REPARACIÓN", "Recompone tu figura y recupera vida."],
    en: ["Integrity", "REPAIR", "Rebuild your shape and restore health."],
  },
};
const FALLBACK = {
  symbol: "⬡",
  color: "#a7e8b1",
  shape: "hexagon",
  es: [
    "Fragmento geométrico",
    "GEOMETRÍA",
    "Una nueva pieza para tu configuración.",
  ],
  en: ["Geometry Shard", "GEOMETRY", "A new piece for your build."],
};
export const ITEM_IDS = Object.freeze(Object.keys(ITEMS));
const language = (lang) =>
  lang === "en" ? "en" : lang === "es" ? "es" : getLanguage();

export function itemLook(id, lang) {
  const item = ITEMS[id] ?? FALLBACK;
  const [name, family, tagline] = item[language(lang)];
  return {
    symbol: item.symbol,
    color: item.color,
    shape: item.shape,
    name,
    family,
    tagline,
    effectHook: tagline,
  };
}
export function itemName(id, lang) {
  return itemLook(id, lang).name;
}

export function upgradeDestination(option) {
  if (option.kind.startsWith("weapon-"))
    return "weapon:" + (option.id ?? option.weapon.id);
  if (option.kind.startsWith("passive-")) return "passive:" + option.def.id;
  if (option.kind.startsWith("ultimate-")) return "ultimate:" + option.id;
  return option.kind === "dash-upgrade" ? "dash" : "health";
}
export function upgradeLook(option) {
  return itemLook(upgradeDestination(option).split(":").pop());
}

const STAT_LABELS = {
  damage: ["Daño", "Damage"],
  cooldownMs: ["Recarga", "Cooldown"],
  count: ["Proyectiles", "Projectiles"],
  pierce: ["Perforación", "Piercing"],
  range: ["Alcance", "Range"],
  radius: ["Radio", "Radius"],
  slowPercent: ["Ralentización", "Slow"],
  length: ["Alcance", "Range"],
  width: ["Anchura", "Width"],
  explodeRadius: ["Explosión", "Blast radius"],
  knockbackCm: ["Empuje", "Knockback"],
  bothSides: ["Ambos lados", "Both sides"],
  durationMs: ["Duración", "Duration"],
  beams: ["Haces", "Beams"],
  maxRadius: ["Radio", "Radius"],
  arcDeg: ["Arco", "Arc"],
};
function formatStat(key, value, english) {
  if (typeof value === "boolean")
    return value ? (english ? "Yes" : "Sí") : english ? "No" : "No";
  if (!Number.isFinite(value)) return "∞";
  if (key.endsWith("Ms")) return Number((value / 1000).toFixed(2)) + " s";
  if (key === "slowPercent") return value + "%";
  if (key === "arcDeg") return value + "°";
  if (key === "knockbackCm") return value + " cm";
  return String(Number(value.toFixed(2)));
}
function combatStats(before, after, english) {
  if (!after) return [];
  return Object.keys(STAT_LABELS)
    .filter(
      (key) =>
        after[key] !== undefined && (!before || before[key] !== after[key]),
    )
    .map((key) => ({
      label: STAT_LABELS[key][english ? 1 : 0],
      ...(before?.[key] !== undefined
        ? { before: formatStat(key, before[key], english) }
        : {}),
      after: formatStat(key, after[key], english),
    }));
}
function descriptionStats(before, after) {
  const oldLines = before?.split("\n") ?? [];
  return after.split("\n").map((line, i) => {
    const index = line.indexOf(":");
    return {
      label: index >= 0 ? line.slice(0, index).trim() : line.trim(),
      ...(oldLines[i] && oldLines[i] !== line
        ? {
            before:
              oldLines[i].split(":").slice(1).join(":").trim() || oldLines[i],
          }
        : {}),
      after: index >= 0 ? line.slice(index + 1).trim() : "",
    };
  });
}

/** Presentation only: all numerical values come from the real progression tables. */
export function upgradeDisplay(option, player = null) {
  const id = upgradeDestination(option).split(":").pop();
  const english = getLanguage() === "en";
  const look = itemLook(id);
  const isNew = option.kind.endsWith("-new");
  let level = 0,
    nextLevel = 1,
    maxLevel = null,
    stats = [];
  if (option.kind.startsWith("weapon-")) {
    const weapon = option.weapon ?? createWeapon(id);
    level = isNew ? 0 : weapon.level;
    nextLevel = isNew ? 1 : Math.min(weapon.maxLevel, level + 1);
    maxLevel = weapon.maxLevel;
    stats = combatStats(
      isNew ? null : weapon.stats,
      weapon.levels[nextLevel - 1],
      english,
    );
  } else if (option.kind.startsWith("passive-")) {
    level = isNew ? 0 : (option.instance?.level ?? 0);
    nextLevel = Math.min(option.def.maxLevel, level + 1);
    maxLevel = option.def.maxLevel;
    stats = descriptionStats(
      level > 0 ? option.def.description(level) : null,
      option.def.description(nextLevel),
    );
  } else if (option.kind.startsWith("ultimate-")) {
    const ownedUltimate = player?.ultimate?.id === id ? player.ultimate : null;
    const ultimate = ownedUltimate ?? createUltimate(id);
    // Existing options encode the chosen level in the title; use that only when no player is supplied.
    const titleLevel = Number(option.title?.match(/Lv\.\s*(\d+)/i)?.[1] ?? 0);
    level = isNew ? 0 : (ownedUltimate?.level ?? Math.max(1, titleLevel - 1));
    nextLevel = isNew ? 1 : Math.min(ultimate.maxLevel, level + 1);
    maxLevel = ultimate.maxLevel;
    stats = combatStats(
      isNew ? null : ultimate.levels[level - 1],
      ultimate.levels[nextLevel - 1],
      english,
    );
  } else if (option.kind === "dash-upgrade") {
    const titleLevel = Number(
      option.title?.match(/(?:Nv\.|Lv\.)\s*(\d+)/i)?.[1] ?? 0,
    );
    level = player?.dashLevel ?? Math.max(1, titleLevel - 1);
    nextLevel = Math.min(DASH.maxLevel, level + 1);
    maxLevel = DASH.maxLevel;
    stats = [
      {
        label: english ? "Charges" : "Cargas",
        before: String(DASH.baseCharges + level - 1),
        after: String(DASH.baseCharges + nextLevel - 1),
      },
      {
        label: english ? "Range" : "Alcance",
        before:
          DASH.baseDistanceCm + (level - 1) * DASH.rangePerUpgradeCm + " cm",
        after:
          DASH.baseDistanceCm +
          (nextLevel - 1) * DASH.rangePerUpgradeCm +
          " cm",
      },
    ];
  } else {
    level = null;
    nextLevel = null;
    stats = [{ label: english ? "Healing" : "Curación", after: "+30 HP" }];
  }
  const kindLabel = option.kind.startsWith("weapon")
    ? english
      ? "WEAPON"
      : "ARMA"
    : option.kind.startsWith("passive")
      ? english
        ? "PASSIVE"
        : "PASIVA"
      : option.kind.startsWith("ultimate")
        ? english
          ? "ULTIMATE"
          : "DEFINITIVA"
        : option.kind === "dash-upgrade"
          ? english
            ? "MOVEMENT"
            : "MOVIMIENTO"
          : english
            ? "REPAIR"
            : "REPARACIÓN";
  return {
    id,
    name: look.name,
    kindLabel,
    family: look.family,
    tagline: look.tagline,
    level,
    nextLevel,
    maxLevel,
    isNew,
    stats,
  };
}

export function inventoryEntries(player, preview = null) {
  const entries = [
    ...player.weapons.map((w) => ({
      key: "weapon:" + w.id,
      id: w.id,
      name: itemName(w.id),
      level: w.level,
      maxLevel: w.maxLevel,
    })),
    ...player.passives.map((p) => ({
      key: "passive:" + p.id,
      id: p.id,
      name: itemName(p.id),
      level: p.level,
    })),
    ...(player.ultimate
      ? [
          {
            key: "ultimate:" + player.ultimate.id,
            id: player.ultimate.id,
            name: itemName(player.ultimate.id),
            level: player.ultimate.level,
            maxLevel: player.ultimate.maxLevel,
          },
        ]
      : []),
    {
      key: "dash",
      id: "dash",
      name: itemName("dash"),
      level: player.dashLevel,
      maxLevel: DASH.maxLevel,
    },
    {
      key: "health",
      id: "health",
      name: itemName("health"),
      level: Math.ceil(player.hp),
    },
  ];
  if (preview) {
    const key = upgradeDestination(preview);
    if (!entries.some((e) => e.key === key))
      entries.push({
        key,
        id: key.split(":").pop(),
        name: itemName(key.split(":").pop()),
        level: "+",
        preview: true,
      });
  }
  return entries;
}
