/**
 * Community branding, read from the environment at request time so one Docker
 * image can serve any community. Defaults are Switch Dimension's.
 */
const DEFAULTS = {
  name: "Switch Dimension Accelerator",
  logoUrl: "https://switchdimension.com/site/logo.png",
  tagline: "Trust what your agents ship.",
};

export type Brand = typeof DEFAULTS;

const value = (key: string) => process.env[key]?.trim() || undefined;

export function getBrand(): Brand {
  const logo = value("BRAND_LOGO_URL");
  return {
    name: value("BRAND_NAME") ?? DEFAULTS.name,
    logoUrl: logo && /^https?:\/\//i.test(logo) ? logo : DEFAULTS.logoUrl,
    tagline: value("BRAND_TAGLINE") ?? DEFAULTS.tagline,
  };
}

/** "<page> · <brand>" for places that build a title by hand (route metadata uses the root template). */
export function pageTitle(page: string): string {
  return `${page} · ${getBrand().name}`;
}
