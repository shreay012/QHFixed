/**
 * Country-prefix utility for path-based geo routing.
 *
 * Pairs with proxy.js (which handles the server-side rewrite) so that
 * customer-facing links emit URLs like `/de/about-us` directly — avoiding
 * the proxy's two-hop redirect (root path → 307 to /de → rewrite → render)
 * on every internal navigation.
 *
 * Truth table for `withCountryPrefix(href, currentPath)`:
 *
 *   currentPath  href              result
 *   ─────────────────────────────────────────────
 *   /            /about-us         /about-us         (India root, no prefix)
 *   /de          /about-us         /de/about-us      (DE user, prefix added)
 *   /de/foo      /about-us         /de/about-us
 *   /de/foo      /de/contact-us    /de/contact-us    (already prefixed)
 *   /de/foo      /admin/users      /admin/users      (staff, exempt)
 *   /de/foo      /api/x            /api/x            (api, exempt)
 *   /de/foo      https://x.com     https://x.com     (external, untouched)
 *   /de/foo      #section          #section          (hash, untouched)
 *   /de/foo      relative          relative          (non-absolute, untouched)
 *
 * Routes that MUST stay prefix-free:
 *   • /admin, /pm, /resource, /staff-login — staff portals
 *   • /login                                  — global auth surface
 *   • /api, /_next                            — system
 */

const SUPPORTED_SEGMENTS = ['in', 'ae', 'de', 'us', 'au'];
const SEGMENT_RE = new RegExp(`^/(${SUPPORTED_SEGMENTS.join('|')})(?=/|$)`, 'i');
const EXEMPT_RE  = /^\/(admin|pm|resource|staff-login|login|api|_next|favicon)(?=\/|$)/i;

/**
 * Read the country segment out of a pathname (e.g. "/de/foo" → "de").
 * Returns null if the path doesn't start with a supported country code.
 */
export function getCountrySegmentFromPath(pathname) {
  if (typeof pathname !== 'string') return null;
  const m = pathname.match(SEGMENT_RE);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Read the country segment out of the qh_country cookie. Browser-only.
 */
export function readCountryCookie() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)qh_country=([A-Z]{2})/i);
  if (!m) return null;
  const seg = m[1].toLowerCase();
  return SUPPORTED_SEGMENTS.includes(seg) ? seg : null;
}

/**
 * Decide the country segment to apply when emitting a link from `currentPath`.
 *
 * Path wins over cookie so that an Indian user who manually typed /de/ keeps
 * navigating inside /de/ even if their cookie still says IN. India (no
 * segment in the URL) → no prefix added — IN is served at root by design.
 */
export function resolveActiveSegment(currentPath) {
  const fromPath = getCountrySegmentFromPath(currentPath);
  if (fromPath) return fromPath;
  return null; // root / IN — no prefix
}

/**
 * Prepend the active country segment to an internal href.
 *
 * @param {string|object} href         Either a string href or a Next.js URL object
 * @param {string}        currentPath  The pathname the link is rendered from
 * @returns {string|object}            Same shape as input
 */
export function withCountryPrefix(href, currentPath) {
  // Pass through Next.js URL objects unchanged — we only know how to
  // mutate string hrefs. Callers that need prefixed object hrefs should
  // construct the string explicitly.
  if (!href || typeof href !== 'string') return href;

  // External / protocol-relative / mailto / tel / hash / non-absolute
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('#') ||
    !href.startsWith('/')
  ) {
    return href;
  }

  // Already country-prefixed
  if (SEGMENT_RE.test(href)) return href;

  // Prefix-exempt (staff, login, api, …)
  if (EXEMPT_RE.test(href)) return href;

  const segment = resolveActiveSegment(currentPath);
  if (!segment) return href; // India / unknown — leave unchanged

  return href === '/' ? `/${segment}` : `/${segment}${href}`;
}
