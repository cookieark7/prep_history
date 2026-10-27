// The homepage uses the app's look (.impeccable/surfaces/app-page-tsx.md): the fonts come from the
// root layout and the colours from app/globals.css, so light and dark follow html[data-theme].
// landing.css maps the homepage's own --lp-* names onto those tokens under `.lp`.

/**
 * Put on the landing's root, and on anything it portals out of that root (popovers, dialogs),
 * so they get the same colours and fonts.
 */
export const LANDING_THEME = "lp";
