/** The fixed "Get a consultation" bar is hidden while the hero's own call to action or the footer is on screen. */
export function hideMobileCta(onScreen: { hero: boolean; footer: boolean }): boolean {
  return onScreen.hero || onScreen.footer;
}

/** Bar height (3rem) plus its bottom margin (1rem). Content below the last section keeps this much room. */
export const MOBILE_CTA_SPACE = "4rem";
