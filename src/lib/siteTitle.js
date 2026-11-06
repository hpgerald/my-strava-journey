// The site's own title, as index.html carries it (written at each refresh by
// scripts/build_seo.mjs). Read once, before any page changes document.title.
export const SITE_TITLE = typeof document !== 'undefined' && document.title ? document.title : 'My Strava Journey'
