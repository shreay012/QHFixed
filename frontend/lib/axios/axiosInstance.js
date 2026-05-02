import axios from 'axios';
import { flattenI18nDeep, readActiveLocale } from '../i18n/flattenI18nDeep';

// QuickHire backend base URL. Uses NEXT_PUBLIC_API_URL when set and falls back to the local backend.
// Local backend routes are mounted at root, not under /api.
const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:4000';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Token helpers (browser-safe) ----------------------------------------
function readToken() {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('token') ||
    window.localStorage.getItem('guestToken') ||
    null
  );
}

function clearAuthStorage() {
  if (typeof window === 'undefined') return;
  ['token', 'user', 'userType', 'isNewUser', 'guestToken', 'guestData'].forEach(
    (k) => window.localStorage.removeItem(k),
  );
}

export const userAuth = {
  getToken: readToken,
  isAuthenticated: () => Boolean(readToken()),
  clear: clearAuthStorage,
};

// --- Geo cookie reader (browser-safe) ------------------------------------
function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// --- Request: attach Bearer + geo headers + handle FormData --------------
axiosInstance.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    // Auth token
    const token = readToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Geo headers — tells backend which country/locale the user is operating in.
    // Backend geo middleware reads X-Country to override CF-IPCountry detection.
    const country = readCookie('qh_country');
    const locale  = readCookie('qh_locale');
    if (country) config.headers['X-Country'] = country;
    if (locale)  config.headers['X-Lang']    = locale;

    // FormData: let browser set the correct multipart Content-Type boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response: i18n flatten + 401 redirect + 429 rate-limit handling -----
const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/about-us',
  '/contact-us',
  '/how-it-works',
  '/faq',
  '/terms-and-conditions',
  '/cancellation-and-refund-policy',
  '/privacy-policy',
  '/staff-login',
  '/admin',
  '/pm',
  '/resource',
  '/service-details',
  '/book-your-resource',
  '/support-chat',
];

// PUBLIC_PATH_FIX_V1: strip a leading country segment (/in /ae /de /us /au)
// before public-prefix matching. Path-routing redirects `/` to `/in/`, so the
// homepage URL in the browser reads as `/in` — which used to bypass the
// `path === '/'` short-circuit and trigger an unwanted login redirect.
const COUNTRY_PREFIX_RE = /^\/(?:in|ae|de|us|au)(?=\/|$)/i;
function stripCountry(p) {
  if (!p) return p;
  return p.replace(COUNTRY_PREFIX_RE, '') || '/';
}

/** Pending requests waiting for a token refresh */
let _refreshing = false;
let _refreshQueue = [];

function _processQueue(err, token) {
  _refreshQueue.forEach((cb) => (err ? cb.reject(err) : cb.resolve(token)));
  _refreshQueue = [];
}

function readRefreshToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('refreshToken') || null;
}

axiosInstance.interceptors.response.use(
  (response) => {
    // Flatten i18n-shaped objects to the active locale
    try {
      if (response && response.data != null && typeof response.data === 'object') {
        response.data = flattenI18nDeep(response.data, readActiveLocale());
      }
    } catch {
      // Best-effort — never let normalisation break a successful response.
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalReq = error?.config;

    // ── 401: try silent token refresh, then redirect ─────────────────────
    if (status === 401 && typeof window !== 'undefined' && !originalReq?._retry) {
      const refreshToken = readRefreshToken();

      if (refreshToken) {
        if (_refreshing) {
          // Queue this request until the refresh resolves
          return new Promise((resolve, reject) => {
            _refreshQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalReq.headers.Authorization = `Bearer ${token}`;
              return axiosInstance(originalReq);
            })
            .catch((err) => Promise.reject(err));
        }

        originalReq._retry = true;
        _refreshing = true;

        try {
          const res = await axiosInstance.post('/auth/refresh', { refreshToken });
          const newToken = res.data?.data?.accessToken || res.data?.token;
          if (newToken) {
            window.localStorage.setItem('token', newToken);
            axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            originalReq.headers.Authorization = `Bearer ${newToken}`;
            _processQueue(null, newToken);
            return axiosInstance(originalReq);
          }
        } catch (_) {
          _processQueue(error, null);
        } finally {
          _refreshing = false;
        }
      }

      // Refresh failed or no refresh token. If the user *thought* they were
      // authenticated (has a non-guest token in localStorage), the token is
      // now stale — clear it and bounce them to /login so they can re-auth.
      // This must run even on PUBLIC_PREFIXES pages (e.g. /book-your-resource,
      // /service-details) because those pages still trigger authenticated
      // calls like /payments/create-order, and silently surfacing a 401 just
      // shows a generic "failed" toast with no way to recover.
      const rawPath = window.location.pathname || '/';
      const path = stripCountry(rawPath);
      const hadAuthToken = !!window.localStorage.getItem('token');
      const isPublic =
        path === '/' || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
      if (hadAuthToken || !isPublic) {
        clearAuthStorage();
        window.location.replace(`/login?next=${encodeURIComponent(rawPath)}`);
      }
    }

    // ── 429: rate-limited — fire a toast warning (non-blocking) ─────────
    if (status === 429 && typeof window !== 'undefined') {
      const retryAfter = error.response.headers?.['retry-after'];
      const seconds = retryAfter ? parseInt(retryAfter, 10) : 30;
      // Dynamically import toast to avoid SSR issues
      import('@/lib/utils/toast').then(({ showWarning }) => {
        showWarning(`Too many requests. Please wait ${seconds} seconds before trying again.`);
      }).catch(() => {});
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;

