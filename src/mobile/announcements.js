import { t } from "../game/ui/i18n.js";
export function announcementText(game) {
  if (game.powerUpSpawner.announcementAge !== null)
    return `${t("Han aparecido beneficios")} ${t("misteriosos en el mapa")}`;
  const current = game.spawner.announcement;
  return current ? `${t("HAN EMERGIDO LOS")} ${t(current.type.plural)}` : "";
}
