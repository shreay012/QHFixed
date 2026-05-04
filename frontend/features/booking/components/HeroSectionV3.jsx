"use client";

/**
 * HeroSectionV3 — "Not sure what you need?" featured banner.
 *
 * Renders the CMS-managed featured banner(s) (position: featured-find-experts)
 * for the user's country. When multiple banners exist for the same country,
 * auto-rotates between them with dot navigation. Falls back to static i18n
 * strings + bookexpert.png when CMS has nothing — page is never empty.
 *
 * The single source of truth is /admin/cms/banners → "⭐ Featured Banner".
 * Same record(s) drive Home, How-it-works, and Book-your-resource.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "@mui/material/Button";
import Image from "next/image";
import Link from "@/components/common/I18nLink";
import { useTranslations } from "next-intl";
import { useCmsBanners } from "@/lib/hooks/useCmsBanners";

const FALLBACK_LOCALE = "en";
const DEFAULT_AUTOPLAY_MS = 6000;

function readLocale() {
  if (typeof document === "undefined") return FALLBACK_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)qh_locale=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : FALLBACK_LOCALE;
}

function pickI18n(value, locale) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value[locale]) return value[locale];
    if (value[FALLBACK_LOCALE]) return value[FALLBACK_LOCALE];
    const firstKey = Object.keys(value).find((k) => value[k]);
    return firstKey ? value[firstKey] : "";
  }
  return String(value);
}

function pickMediaUrl(banner, locale) {
  if (banner?.mediaUrlByLocale && typeof banner.mediaUrlByLocale === "object") {
    if (banner.mediaUrlByLocale[locale]) return banner.mediaUrlByLocale[locale];
    if (banner.mediaUrlByLocale[FALLBACK_LOCALE]) return banner.mediaUrlByLocale[FALLBACK_LOCALE];
  }
  return banner?.mediaUrl || banner?.image || banner?.imageUrl || "";
}

const HeroSectionV3 = () => {
  const t = useTranslations("vibeCoding");
  const { banners, loading } = useCmsBanners("featured-find-experts");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [locale, setLocale] = useState(FALLBACK_LOCALE);
  const timerRef = useRef(null);

  // Resolve cookie locale post-mount so SSR + client first render agree.
  useEffect(() => { queueMicrotask(() => setLocale(readLocale())); }, []);

  // Pause auto-rotation when tab is hidden — saves battery + avoids the
  // slide jumping when user comes back to the tab.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Auto-advance to next banner. Each banner can override cadence via
  // banner.autoplayMs; otherwise the 6s default applies.
  useEffect(() => {
    if (paused || !banners || banners.length < 2) return;
    const current = banners[active];
    const ms = Number(current?.autoplayMs) > 0 ? Number(current.autoplayMs) : DEFAULT_AUTOPLAY_MS;
    timerRef.current = setTimeout(() => {
      setActive((i) => (i + 1) % banners.length);
    }, ms);
    return () => clearTimeout(timerRef.current);
  }, [active, paused, banners]);

  const slide = useMemo(() => {
    if (!banners?.length) return null;
    return banners[Math.min(active, banners.length - 1)];
  }, [banners, active]);

  // Wait for the CMS request so we don't flash static fallback before
  // the admin's banner replaces it on every page load.
  if (loading) return null;

  // Resolve fields: prefer CMS when present, otherwise the i18n strings.
  const cmsTitle = slide ? pickI18n(slide.title, locale) : "";
  const cmsBody  = slide ? pickI18n(slide.body, locale) : "";
  const cmsCta   = slide ? pickI18n(slide.ctaLabel, locale) : "";
  const cmsImage = slide ? pickMediaUrl(slide, locale) : "";

  const lines = (cmsTitle ? cmsTitle.replace(/\\n/g, "\n").split("\n") : []);
  const titleLine1 = slide ? (lines[0] || "") : t("titleLine1");
  const titleHighlight = slide
    ? (lines.slice(1).join(" ") || lines[0] || "")
    : t("titleHighlight");
  const subtitle = slide ? cmsBody : t("subtitle");
  const ctaLabel = slide ? (cmsCta || t("ctaPlural")) : t("ctaPlural");
  const ctaHref  = slide?.ctaUrl || "/book-your-resource";
  const imageSrc = cmsImage || "/images/resource-services/bookexpert.png";

  const showDots = banners && banners.length > 1;

  return (
    <section
      className="w-full bg-white py-16 md:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-[1440px] px-6 sm:px-12 lg:px-24">
        <div className="relative bg-white rounded-[24px] shadow-[0_14px_74px_rgba(0,0,0,0.07)] p-8 md:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-[32px] md:text-[42px] lg:text-[56px] font-bold leading-[1.2] mb-6 font-['Open_Sauce_One_Bold']">
              <span className="text-[#484848]">{titleLine1} </span>
              {titleHighlight && titleHighlight !== titleLine1 && (
                <>
                  <br className="hidden md:block" />
                  <span className="text-[#45A735]">{titleHighlight}</span>
                </>
              )}
            </h2>

            <p className="text-[18px] md:text-[24px] text-[#636363] leading-[1.5] mb-10 max-w-[500px] mx-auto lg:mx-0 font-['Open_Sauce_One_Regular']">
              {subtitle}
            </p>

            <Link href={ctaHref} style={{ textDecoration: "none" }}>
              <Button
                variant="contained"
                className=" px-[24px]! py-[18px]!"
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  backgroundColor: "#45A735",
                  textTransform: "none",
                  fontFamily: "'Open Sauce One Regular'",
                  fontWeight: 700,
                  fontSize: { xs: "10px", md: "16px" },
                  lineHeight: "100%",
                  letterSpacing: "0px",
                  textAlign: "center",
                  borderRadius: "12px",
                  boxShadow: "none",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#26472B",
                    transition: "left 0.5s ease",
                    zIndex: 0,
                  },
                  "&:hover": {
                    boxShadow: "0px 14px 34px 0px #78EB5473",
                  },
                  "&:hover::before": {
                    left: 0,
                  },
                }}
              >
                <span style={{ position: "relative", zIndex: 1 }}>
                  {ctaLabel}
                </span>
              </Button>
            </Link>
          </div>

          {/* Right Visual */}
          <div className="flex-1 flex justify-center w-full">
            <div className="relative w-full max-w-[500px] aspect-square rounded-[20px] overflow-hidden">
              {imageSrc.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={imageSrc}
                  src={imageSrc}
                  alt={titleLine1 || "Find Experts"}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
                />
              ) : (
                <Image
                  key={imageSrc}
                  src={imageSrc}
                  alt={titleLine1 || "Find Experts"}
                  fill
                  className="object-contain"
                />
              )}
            </div>
          </div>

          {/* Carousel controls — only when multiple CMS banners exist */}
          {showDots && (
            <>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    aria-label={`Show banner ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === active ? "w-6 bg-[#26472B]" : "w-1.5 bg-[#26472B]/40 hover:bg-[#26472B]/70"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setActive((i) => (i - 1 + banners.length) % banners.length)}
                aria-label="Previous banner"
                className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow ring-1 ring-black/5 items-center justify-center text-[#26472B] z-10"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => setActive((i) => (i + 1) % banners.length)}
                aria-label="Next banner"
                className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white shadow ring-1 ring-black/5 items-center justify-center text-[#26472B] z-10"
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSectionV3;
