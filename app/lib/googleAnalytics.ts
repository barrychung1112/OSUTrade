export const GA_MEASUREMENT_ID = "G-EE1HLRT49M";

export function shouldEnableGoogleAnalytics(
  vercelEnvironment: string | undefined,
) {
  return vercelEnvironment === "production";
}
