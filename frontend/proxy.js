/**
 * Next.js Edge Proxy — Geo-detection, Country Routing & Cookie Bootstrap
 *
 * Implements Layer 2 from docs/global-platform/09-geo-detection-routing.md.
 *
 * Sources of truth (highest priority first):
 *   1. Country path segment  (/in/, /ae/, /de/, /us/, /au/)
 *   2. qh_country cookie  (user's saved preference)
 *   3. CF-IPCountry / x-vercel-ip-country header  (ISP geolocation)
 *   4. Accept-Language header  (browser locale → country heuristic)
 *   5. Hard default: IN (India)
 *
 * What this proxy does:
 *   - Detects the active country + locale + currency for every request
 *   - Sets qh_country / qh_locale / qh_currency cookies (read by:
 *       • Redux regionSlice  – client-side display/formatting
 *       • Axios interceptor  – sends X-Country / X-Lang to backend)
 *   - Injects x-qh-country / x-qh-locale / x-qh-currency response headers
 *     (readable by server components via next/headers)
 *   - Blocks /test-chat in production (dev-only page)
 *   - When NEXT_PUBLIC_COUNTRY_PATH_ROUTING=true, redirects /foo to /in/foo
 *     (enable this once app/[country]/ route group is live)
 */

import { NextResponse } from 'next/server';
import {
  LOCALE_CODES,
  CURRENCY_CODES,
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
  COUNTRY_REGIONS,
} from './lib/i18n/config';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const COOKIE_OPTS = {
  path: '/',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

/** Active market country codes (lowercase path segments) */
const COUNTRY_SEGMENTS = new Set(['in', 'ae', 'de', 'us', 'au']);

/** lowercase path segment → ISO alpha-2 */
const SEGMENT_TO_CODE = { in: 'IN', ae: 'AE', de: 'DE', us: 'US', au: 'AU' };

/** ISO alpha-2 → lowercase path segment */
const CODE_TO_SEGMENT = { IN: 'in', AE: 'ae', DE: 'de', US: 'us', AU: 'au' };

/** Dev-only routes — return 404 in production */
const DEV_ONLY_ROUTES = ['/test-chat'];

/**
 * Routes that must NEVER receive a country prefix:
 *   • Staff portals — they have no country variants and live globally
 *   • Auth + system routes — login, /api, Next.js internals
 * If a request arrives at a country-prefixed staff URL (e.g. someone bookmarks
 * /de/admin), we still serve it via the rewrite so it doesn't 404, but new
 * navigations won't redirect into a prefix for these paths.
 */
const PREFIX_EXEMPT_PATHS = [
  '/admin',
  '/pm',
  '/resource',
  '/staff-login',
  '/login',
  '/api',
  '/_next',
];

function isPrefixExempt(pathname) {
  return PREFIX_EXEMPT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function pickLocaleFromAcceptLanguage(header) {
  if (!header) return null;
  const tags = header
    .split(',')
    .map((t) => t.split(';')[0].trim())
    .filter(Boolean);
  for (const tag of tags) {
    if (LOCALE_CODES.includes(tag)) return tag;
    const base = tag.split('-')[0];
    if (LOCALE_CODES.includes(base)) return base;
  }
  return null;
}

function extractCountrySegment(pathname) {
  const seg = pathname.split('/')[1]?.toLowerCase();
  return COUNTRY_SEGMENTS.has(seg) ? seg : null;
}

/* ── Proxy (Next.js 16+ convention — replaces middleware.js) ───────────────── */

export function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;
  const { cookies, headers } = request;

  // ── 1. Block dev-only routes in production ────────────────────────────────
  if (
    process.env.NODE_ENV === 'production' &&
    DEV_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  ) {
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  // ── 2. Detect country (priority order) ───────────────────────────────────

  // a) Country path segment (/in/, /ae/, etc.) — explicit URL override
  const pathSegment = extractCountrySegment(pathname);
  let detectedCountry = pathSegment ? SEGMENT_TO_CODE[pathSegment] : null;

  // a2) Dev-only override: ?_country=AE lets you test any country from localhost
  //     without needing CF-IPCountry.  Ignored in production.
  if (!detectedCountry && process.env.NODE_ENV !== 'production') {
    const devOverride = searchParams.get('_country')?.toUpperCase();
    if (devOverride && /^[A-Z]{2}$/.test(devOverride) && CODE_TO_SEGMENT[devOverride]) {
      detectedCountry = devOverride;
    }
  }

  // GEO_REDETECT_HOMEPAGE_V1: on the homepage we re-evaluate IP geo on every
  // request, even if a qh_country cookie is already set. This means a user
  // who travels (or hits the page from a new region) is always redirected
  // to the correct market on the next homepage refresh — instead of the
  // cookie sticking forever.
  //
  // Trade-off: if the user *manually* switched country via the picker and
  // then hits home, they'll be bounced back to their IP-detected country
  // unless they've also navigated into that country (the path segment
  // wins). For non-homepage paths, cookie-first ordering is preserved so
  // the manual choice persists during a session.
  const isHomepage = pathname === '/' || /^\/(in|ae|de|us|au)\/?$/i.test(pathname);

  // b) Cookie or IP — order depends on whether we're on the homepage
  if (!detectedCountry) {
    const cookieCountry = cookies.get('qh_country')?.value;
    const geoHeader = headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country');
    const ipCountry = geoHeader && COUNTRY_SEGMENTS.has(geoHeader.toLowerCase())
      ? geoHeader.toUpperCase()
      : null;
    const cookieValid = cookieCountry && COUNTRY_SEGMENTS.has(cookieCountry.toLowerCase());

    if (isHomepage && ipCountry) {
      // Homepage: prefer IP geo so refreshes always land on the correct market
      detectedCountry = ipCountry;
    } else if (cookieValid) {
      detectedCountry = cookieCountry.toUpperCase();
    } else if (ipCountry) {
      detectedCountry = ipCountry;
    }
  }

  // c) Hard default — India
  if (!detectedCountry) detectedCountry = 'IN';

  const region = COUNTRY_REGIONS[detectedCountry] || null;

  // GEO_COOKIE_SYNC_V1: when the detected country has *changed* from the
  // previous cookie value (e.g. user travelled IN → UAE, VPN switch, IP
  // re-detect on homepage), the locale and currency cookies almost
  // certainly belong to the previous market and would render the new
  // market's pages with the wrong language + wrong currency. Reset them
  // to the new region's defaults whenever the country flips.
  const prevCookieCountry = cookies.get('qh_country')?.value?.toUpperCase() || null;
  const countryChanged = prevCookieCountry && prevCookieCountry !== detectedCountry;

  // ── 3. Determine locale ───────────────────────────────────────────────────
  const cookieLocale = cookies.get('qh_locale')?.value;
  let locale = countryChanged ? null : cookieLocale;
  if (!locale) {
    const fromHeader = pickLocaleFromAcceptLanguage(headers.get('accept-language'));
    locale = region?.locale || fromHeader || DEFAULT_LOCALE;
    if (!LOCALE_CODES.includes(locale)) locale = DEFAULT_LOCALE;
  }

  // ── 4. Determine currency ─────────────────────────────────────────────────
  const cookieCurrency = cookies.get('qh_currency')?.value;
  let currency = countryChanged ? null : cookieCurrency;
  if (!currency) {
    currency = region?.currency || DEFAULT_CURRENCY;
    if (!CURRENCY_CODES.includes(currency)) currency = DEFAULT_CURRENCY;
  }

  // ── 5. Country path-prefix routing
  //
  // Routing rules (per product):
  //   • India users → root domain `/`, `/about`, `/service-details/...` (no
  //     prefix). Mirrors the canonical Indian experience.
  //   • Every other supported market (AE / DE / US / AU) → redirect bare
  //     paths to `/<code>/...`.
  //   • If a user is already on a country-prefixed URL, we don't touch it.
  //   • API routes, error routes are never redirected.
  //
  // PATH_ROUTING is always-on now. The old NEXT_PUBLIC_COUNTRY_PATH_ROUTING
  // gate stays as an emergency kill-switch — set it to "false" to disable.
  const PATH_ROUTING_DISABLED =
    process.env.NEXT_PUBLIC_COUNTRY_PATH_ROUTING === 'false';

  if (!PATH_ROUTING_DISABLED) {
    // ── 5a. Inbound is country-prefixed (/<code>/<rest>) — internal rewrite
    //
    // The Next.js app/ folder is FLAT (no `[country]` dynamic segment), so
    // a request for `/de/about-us` would 404 without intervention. We
    // therefore strip the country segment server-side and rewrite to the
    // flat path while keeping the URL the user sees unchanged. Combined
    // with step 5b below this gives us the full path-prefix UX described
    // in docs/global-platform/02-url-domain-strategy.md without having to
    // duplicate every page under app/[country]/.
    if (pathSegment) {
      // /de       → /
      // /de/      → /
      // /de/foo/bar → /foo/bar
      let strippedPath = pathname.slice(`/${pathSegment}`.length);
      if (!strippedPath || strippedPath === '/') strippedPath = '/';

      const rewriteUrl = new URL(strippedPath, request.url);
      rewriteUrl.search = searchParams.toString();

      const res = NextResponse.rewrite(rewriteUrl);
      res.cookies.set('qh_country', detectedCountry, COOKIE_OPTS);
      if (!cookieLocale || countryChanged) res.cookies.set('qh_locale', locale, COOKIE_OPTS);
      if (!cookieCurrency || countryChanged) res.cookies.set('qh_currency', currency, COOKIE_OPTS);
      res.headers.set('x-qh-country', detectedCountry);
      res.headers.set('x-qh-locale', locale);
      res.headers.set('x-qh-currency', currency);
      return res;
    }

    // ── 5b. No country prefix yet — redirect non-IN markets so the URL
    //       reflects the user's market.
    const shouldPrefix =
      detectedCountry !== 'IN' &&            // ← India served at root
      CODE_TO_SEGMENT[detectedCountry] &&
      !isPrefixExempt(pathname) &&
      pathname !== '/404' &&
      pathname !== '/500';

    if (shouldPrefix) {
      const segment = CODE_TO_SEGMENT[detectedCountry];
      const newPath = `/${segment}${pathname === '/' ? '' : pathname}`;
      const redirectUrl = new URL(newPath, request.url);
      redirectUrl.search = searchParams.toString();

      const res = NextResponse.redirect(redirectUrl, { status: 307 });
      res.cookies.set('qh_country', detectedCountry, COOKIE_OPTS);
      res.cookies.set('qh_locale', locale, COOKIE_OPTS);
      res.cookies.set('qh_currency', currency, COOKIE_OPTS);
      return res;
    }

    // Inverse case: an Indian visitor lands on a country-prefixed URL
    // (e.g. they manually typed /ae/) — handled by 5a above (rewrite).
    // An Indian visitor on a non-prefixed path passes through to step 6.
  }

  // ── 6. Pass through: set cookies + inject geo headers ────────────────────
  const res = NextResponse.next();

  // Always refresh qh_country cookie (so geo is always current)
  res.cookies.set('qh_country', detectedCountry, COOKIE_OPTS);
  // Re-write locale + currency when the country flipped (so a IN user who
  // hits the site from UAE doesn't keep their old `en` + `INR` cookies)
  // OR when they were never set.
  if (!cookieLocale || countryChanged) res.cookies.set('qh_locale', locale, COOKIE_OPTS);
  if (!cookieCurrency || countryChanged) res.cookies.set('qh_currency', currency, COOKIE_OPTS);

  // Headers for server components (next/headers().get('x-qh-country'))
  // and for backend Axios interceptor (X-Country → req.geo)
  res.headers.set('x-qh-country', detectedCountry);
  res.headers.set('x-qh-locale', locale);
  res.headers.set('x-qh-currency', currency);

  return res;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static/media files
    '/((?!_next/|api/|.*\\..*).*)',
  ],
};
