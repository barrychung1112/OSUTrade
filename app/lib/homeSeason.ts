export const homeSeasons = ["move-out", "move-in", "evergreen"] as const;

export type HomeSeason = (typeof homeSeasons)[number];

const pacificMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  timeZone: "America/Los_Angeles",
});

export function getHomeSeason(now = new Date()): HomeSeason {
  const month = Number(pacificMonthFormatter.format(now));

  if (month >= 4 && month <= 7) {
    return "move-out";
  }

  if (month >= 8 && month <= 11) {
    return "move-in";
  }

  return "evergreen";
}
