const LOOKS = {
  magic_wand: ["↗", "#7ec6e0"],
  whip: ["⌁", "#e8b13a"],
  garlic: ["◎", "#9fe3a4"],
  pierce_ray: ["╱", "#c5a0ef"],
  missile: ["▲", "#f5a477"],
  tome: ["✚", "#ed8796"],
  boots: ["↠", "#7ec6e0"],
  armor: ["⬡", "#9fe3a4"],
  amulet: ["⊕", "#c5a0ef"],
  heart: ["↻", "#ed8796"],
  ult_pierce_shot: ["◆", "#c5a0ef"],
  ult_wave: ["◉", "#f5a477"],
  ult_orbit_laser: ["⊙", "#e8b13a"],
  dash: ["»", "#7ec6e0"],
  health: ["+", "#ed8796"],
};

export function itemLook(id) {
  const [symbol, color] = LOOKS[id] ?? ["⬡", "#9fe3a4"];
  return { symbol, color };
}

export function upgradeDestination(option) {
  if (option.kind.startsWith("weapon-"))
    return `weapon:${option.id ?? option.weapon.id}`;
  if (option.kind.startsWith("passive-")) return `passive:${option.def.id}`;
  if (option.kind.startsWith("ultimate-")) return `ultimate:${option.id}`;
  return option.kind === "dash-upgrade" ? "dash" : "health";
}

export function upgradeLook(option) {
  return itemLook(upgradeDestination(option).split(":").pop());
}

export function inventoryEntries(player, preview = null) {
  const entries = [
    ...player.weapons.map((w) => ({
      key: `weapon:${w.id}`,
      id: w.id,
      name: w.name,
      level: w.level,
    })),
    ...player.passives.map((p) => ({
      key: `passive:${p.id}`,
      id: p.id,
      name: p.name,
      level: p.level,
    })),
    ...(player.ultimate
      ? [
          {
            key: `ultimate:${player.ultimate.id}`,
            id: player.ultimate.id,
            name: player.ultimate.name,
            level: player.ultimate.level,
          },
        ]
      : []),
    { key: "dash", id: "dash", name: "Dash", level: player.dashLevel },
    { key: "health", id: "health", name: "Vida", level: Math.ceil(player.hp) },
  ];
  if (preview) {
    const key = upgradeDestination(preview);
    if (!entries.some((e) => e.key === key))
      entries.push({
        key,
        id: key.split(":").pop(),
        name: preview.title,
        level: "+",
        preview: true,
      });
  }
  return entries;
}
