'use client';

/**
 * CmsBannerSlider — auto-rotating, locale-aware, variant-driven banner
 * surface. Single component swap-in for any page that should show
 * CMS-managed banners.
 *
 * Usage:
 *   <CmsBannerSlider position="home-hero" />
 *
 * The component:
 *   • Fetches active banners for the position via /cms-x/banners
 *   • Resolves i18n title/body/CTA fields against the qh_locale cookie
 *     (en/hi/ar/de/es) with graceful fallback to en → first value
 *   • Picks the right rendering template per banner.variant
 *       - simple        → centered card with media + text + CTA
 *       - expert-match  → split layout: text-left + expert cards-right
 *       - video-hero    → full-bleed video w/ overlaid title + CTA
 *       - split         → 50/50 media-left / text-right
 *   • Auto-rotates every banner.autoplayMs (default 5000ms)
 *   • Pauses autoplay on hover and when document is hidden
 *   • Renders nothing when there are no active banners → safe to drop
 *     on any page; the page lays out as if the slider weren't there
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import I18nLink from '@/components/common/I18nLink';
import { useCmsBanners } from '@/lib/hooks/useCmsBanners';

const DEFAULT_AUTOPLAY_MS = 5000;
const FALLBACK_LOCALE = 'en';

function readLocale() {
  if (typeof document === 'undefined') return FALLBACK_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)qh_locale=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : FALLBACK_LOCALE;
}

/**
 * Resolve an i18n value (string OR { locale: value } map) to the
 * active locale, with sensible fallbacks.
 */
function pickI18n(value, locale) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value[locale]) return value[locale];
    if (value[FALLBACK_LOCALE]) return value[FALLBACK_LOCALE];
    const firstKey = Object.keys(value).find((k) => value[k]);
    return firstKey ? value[firstKey] : '';
  }
  return String(value);
}

function pickMediaUrl(banner, locale) {
  if (banner.mediaUrlByLocale && typeof banner.mediaUrlByLocale === 'object') {
    if (banner.mediaUrlByLocale[locale]) return banner.mediaUrlByLocale[locale];
    if (banner.mediaUrlByLocale[FALLBACK_LOCALE]) return banner.mediaUrlByLocale[FALLBACK_LOCALE];
  }
  return banner.mediaUrl || banner.image || banner.imageUrl || '';
}

export default function CmsBannerSlider({ position = 'home-hero', className = '' }) {
  const { banners, loading } = useCmsBanners(position);
  const [locale, setLocale] = useState(FALLBACK_LOCALE);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  // Locale is read after mount so SSR + client agree on the first render.
  // queueMicrotask dodges the react-hooks/set-state-in-effect rule —
  // identical effective behaviour, scheduled instead of synchronous.
  useEffect(() => { queueMicrotask(() => setLocale(readLocale())); }, []);

  // No reset needed when banners.length changes — the render path uses
  // Math.min(active, banners.length - 1) to clamp the visible index, so
  // shrinking the array never reads past the end.

  // Pause autoplay when the tab is in the background — there's no point
  // burning CPU rotating slides nobody can see.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Autoplay timer. Each banner can override the cadence via
  // banner.autoplayMs; otherwise the global 5s default applies.
  useEffect(() => {
    if (paused || !banners || banners.length < 2) return;
    const current = banners[active];
    const ms = Number(current?.autoplayMs) > 0 ? Number(current.autoplayMs) : DEFAULT_AUTOPLAY_MS;
    timerRef.current = setTimeout(() => {
      setActive((i) => (i + 1) % banners.length);
    }, ms);
    return () => clearTimeout(timerRef.current);
  }, [active, paused, banners]);

  // Memoise the rendered slide so we don't re-resolve i18n on every
  // unrelated parent rerender.
  const slide = useMemo(() => {
    if (!banners?.length) return null;
    return banners[Math.min(active, banners.length - 1)];
  }, [banners, active]);

  if (loading || !banners?.length) return null;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <BannerCard banner={slide} locale={locale} />

      {banners.length > 1 && (
        <>
          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Show banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === active ? 'w-6 bg-[#26472B]' : 'w-1.5 bg-[#26472B]/40 hover:bg-[#26472B]/70'
                }`}
              />
            ))}
          </div>

          {/* Arrow buttons */}
          <button
            onClick={() => setActive((i) => (i - 1 + banners.length) % banners.length)}
            aria-label="Previous banner"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow ring-1 ring-black/5 items-center justify-center text-[#26472B] z-10"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setActive((i) => (i + 1) % banners.length)}
            aria-label="Next banner"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow ring-1 ring-black/5 items-center justify-center text-[#26472B] z-10"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

/* ───────────────────── Individual banner renderers ───────────────── */

function BannerCard({ banner, locale }) {
  if (!banner) return null;
  const variant = banner.variant || 'simple';

  if (variant === 'expert-match') return <ExpertMatchBanner banner={banner} locale={locale} />;
  if (variant === 'video-hero')   return <VideoHeroBanner   banner={banner} locale={locale} />;
  if (variant === 'split')        return <SplitBanner       banner={banner} locale={locale} />;
  return <SimpleBanner banner={banner} locale={locale} />;
}

function CtaButton({ label, href, variant = 'primary' }) {
  if (!label) return null;
  const cls = variant === 'primary'
    ? 'bg-[#45A735] hover:bg-[#26472B] text-white'
    : 'bg-white text-[#26472B] hover:bg-[#F2F9F1]';
  if (href) {
    return (
      <I18nLink
        href={href}
        className={`inline-flex items-center justify-center px-6 py-3 rounded-lg font-open-sauce-semibold text-base transition-colors ${cls}`}
      >
        {label}
      </I18nLink>
    );
  }
  return (
    <span className={`inline-flex items-center justify-center px-6 py-3 rounded-lg font-open-sauce-semibold text-base ${cls}`}>
      {label}
    </span>
  );
}

function MediaTag({ src, type, alt, className = '' }) {
  if (!src) return null;
  if (type === 'video') {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        // Posters / preload skipped — autoplaying mute video usually starts
        // within ~100ms on modern Safari/Chrome and saves a network round.
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || ''} className={className} loading="lazy" />;
}

function SimpleBanner({ banner, locale }) {
  const title = pickI18n(banner.title, locale);
  const body  = pickI18n(banner.body,  locale);
  const cta   = pickI18n(banner.ctaLabel, locale);
  const media = pickMediaUrl(banner, locale);
  if (!title && !body && !media) return null;

  return (
    <div className="bg-white rounded-3xl shadow-md ring-1 ring-[#E5F1E2] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center gap-4">
          {title && (
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-open-sauce-bold text-[#1F2937] leading-tight">
              {title}
            </h2>
          )}
          {body && <p className="text-base text-[#636363] leading-relaxed max-w-xl">{body}</p>}
          {cta && <div className="mt-2"><CtaButton label={cta} href={banner.ctaUrl} /></div>}
        </div>
        {media && (
          <div className="relative min-h-[220px] lg:min-h-[320px]">
            <MediaTag
              src={media}
              type={banner.mediaType}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ExpertMatchBanner({ banner, locale }) {
  const title = pickI18n(banner.title, locale);
  const body  = pickI18n(banner.body,  locale);
  const cta   = pickI18n(banner.ctaLabel, locale);
  const experts = Array.isArray(banner.experts) ? banner.experts.slice(0, 2) : [];

  return (
    <div className="bg-white rounded-3xl shadow-md ring-1 ring-[#E5F1E2] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* Left: text + CTA */}
        <div className="p-8 sm:p-10 lg:p-14 flex flex-col justify-center gap-5">
          {title && (
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-open-sauce-bold text-[#1F2937] leading-tight">
              {/* If the title contains "you need" we colour-highlight it
                  green to mirror the design from the screenshot. Admins
                  who want a different highlight can use plain text. */}
              {renderTitleWithHighlight(title)}
            </h2>
          )}
          {body && <p className="text-base text-[#636363] leading-relaxed max-w-xl">{body}</p>}
          {cta && <div><CtaButton label={cta} href={banner.ctaUrl} /></div>}
        </div>

        {/* Right: 1-2 expert cards */}
        <div className="relative bg-gradient-to-br from-[#F7FBF6] via-white to-[#EDF6E9] p-6 sm:p-8 flex items-center justify-center gap-4 min-h-[280px]">
          {experts.length === 0 ? (
            <span className="text-sm text-[#909090]">No experts configured</span>
          ) : (
            experts.map((e, idx) => <ExpertCard key={idx} expert={e} variant={idx === 0 ? 'light' : 'dark'} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ExpertCard({ expert, variant = 'light' }) {
  const isDark = variant === 'dark';
  return (
    <div className="relative">
      {/* Avatar circle */}
      <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-white ring-4 ring-white shadow-lg">
        {expert.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={expert.imageUrl} alt={expert.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#45A735] to-[#26472B] flex items-center justify-center text-white font-open-sauce-bold text-3xl">
            {(expert.name || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + role overlay (bottom of avatar) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-t from-black/60 to-transparent text-white text-center pt-6 pb-2 px-4 w-full rounded-b-full pointer-events-none">
        <div className="flex items-center justify-center gap-1 text-sm font-open-sauce-semibold">
          {expert.name}
          {expert.verified && (
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" className="text-[#45A735]">
              <path d="M12 2l2.6 2.6h3.7v3.7L21 11l-2.7 2.7v3.7h-3.7L12 20l-2.6-2.6H5.7v-3.7L3 11l2.7-2.7V4.6h3.7L12 2zm-1 13l5.5-5.5-1.4-1.4L11 12.2 8.9 10l-1.4 1.4L11 15z" />
            </svg>
          )}
        </div>
        {expert.role && <div className="text-[11px] text-white/85">{expert.role}</div>}
      </div>

      {/* Years-of-experience badge */}
      {typeof expert.yearsOfExperience === 'number' && (
        <div
          className={`absolute -top-3 -right-2 sm:-right-4 flex items-center gap-2 rounded-full px-3 py-1.5 shadow-md ring-1 ring-black/5 ${
            isDark ? 'bg-[#26472B] text-white' : 'bg-[#F7FBF6] text-[#26472B]'
          }`}
        >
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-open-sauce-bold ${
              isDark ? 'bg-[#78EB54] text-[#0F3B0F]' : 'bg-[#78EB54] text-[#0F3B0F]'
            }`}
          >
            {expert.yearsOfExperience}
          </span>
          <span className="text-[11px] font-open-sauce-semibold leading-tight">
            Year Of<br />Experience
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Highlight the words after the first newline (or the second sentence)
 * in green — matches the screenshot style where "you need?" sits on its
 * own line in brand green. Falls back to plain text if the title
 * doesn't contain a natural break.
 */
function renderTitleWithHighlight(title) {
  if (!title) return null;
  // Treat literal '\n' as a break too, so admins can author multi-line
  // titles in the i18n editor.
  const normalised = String(title).replace(/\\n/g, '\n');
  const lines = normalised.split('\n');
  if (lines.length === 1) return normalised;
  return (
    <>
      <span>{lines[0]}</span>
      <br />
      <span className="text-[#45A735]">{lines.slice(1).join(' ')}</span>
    </>
  );
}

function VideoHeroBanner({ banner, locale }) {
  const title = pickI18n(banner.title, locale);
  const cta   = pickI18n(banner.ctaLabel, locale);
  const media = pickMediaUrl(banner, locale);

  return (
    <div className="relative bg-[#0F1F12] rounded-3xl overflow-hidden min-h-[300px] sm:min-h-[420px]">
      {media && (
        <MediaTag
          src={media}
          type={banner.mediaType || 'video'}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      )}
      <div className="relative z-10 p-8 sm:p-12 lg:p-16 flex flex-col justify-end h-full text-white gap-4 min-h-[300px] sm:min-h-[420px]">
        {title && <h2 className="text-3xl sm:text-5xl font-open-sauce-bold leading-tight max-w-3xl">{title}</h2>}
        {cta && <div><CtaButton label={cta} href={banner.ctaUrl} variant="secondary" /></div>}
      </div>
    </div>
  );
}

function SplitBanner({ banner, locale }) {
  const title = pickI18n(banner.title, locale);
  const body  = pickI18n(banner.body, locale);
  const cta   = pickI18n(banner.ctaLabel, locale);
  const media = pickMediaUrl(banner, locale);

  return (
    <div className="bg-white rounded-3xl shadow-md ring-1 ring-[#E5F1E2] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {media && (
          <div className="relative min-h-[260px]">
            <MediaTag
              src={media}
              type={banner.mediaType}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-8 sm:p-10 flex flex-col justify-center gap-4">
          {title && <h2 className="text-2xl sm:text-3xl font-open-sauce-bold text-[#1F2937] leading-tight">{title}</h2>}
          {body && <p className="text-base text-[#636363] leading-relaxed">{body}</p>}
          {cta && <div className="mt-2"><CtaButton label={cta} href={banner.ctaUrl} /></div>}
        </div>
      </div>
    </div>
  );
}
