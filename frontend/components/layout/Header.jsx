"use client";

import Link from "@/components/common/I18nLink";
import { usePathname } from "next/navigation";
import { useI18nRouter } from "@/lib/hooks/useI18nRouter";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import axiosInstance, { userAuth } from "@/lib/axios/axiosInstance";
import chatSocketService from "@/lib/services/chatSocketService";

const Header = () => {
  const pathname = usePathname();
  const router = useI18nRouter();
  const t = useTranslations("header");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [screenSize, setScreenSize] = useState("desktop");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Dynamic auth + stats
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ unreadNotificationsCount: 0, cartItemCount: 0, totalPendingJobs: 0 });

  // Cache stats to avoid API call on every render
  const statsLastFetched = useRef(0);
  const STATS_TTL = 60_000; // re-fetch max once per minute

  const refreshAuthAndStats = useCallback(async (force = false) => {
    if (typeof window === "undefined") return;
    const authed = userAuth.isAuthenticated();
    setIsAuthenticated(authed);
    try {
      const raw = window.localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
    if (authed) {
      const now = Date.now();
      // Skip API call if stats fetched recently (unless forced)
      if (!force && now - statsLastFetched.current < STATS_TTL) return;
      statsLastFetched.current = now;
      try {
        const r = await axiosInstance.get("/dashboard/stats");
        const d = r?.data?.data || {};
        setStats({
          unreadNotificationsCount: d.unreadNotificationsCount || 0,
          cartItemCount: d.cartItemCount || 0,
          totalPendingJobs: d.totalPendingJobs || 0,
        });
      } catch {
        /* keep zeros */
      }
    } else {
      setStats({ unreadNotificationsCount: 0, cartItemCount: 0, totalPendingJobs: 0 });
    }
  }, []);

  useEffect(() => {
    refreshAuthAndStats();
    const onLogin = () => refreshAuthAndStats(true);  // force on login
    const onLogout = () => refreshAuthAndStats(true); // force on logout
    const onStorage = (e) => { if (!e.key || ['token', 'user'].includes(e.key)) refreshAuthAndStats(); };
    window.addEventListener("userLoggedIn", onLogin);
    window.addEventListener("userLoggedOut", onLogout);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("userLoggedIn", onLogin);
      window.removeEventListener("userLoggedOut", onLogout);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshAuthAndStats]);

  // Route change: only refresh auth state (no API call unless TTL expired)
  useEffect(() => { refreshAuthAndStats(); }, [pathname, refreshAuthAndStats]);
  // ↑ Uses TTL cache — won't hit /dashboard/stats on every navigation

  // Real-time notification badge update via socket
  useEffect(() => {
    const handleNewNotification = () => {
      // Increment badge immediately — no round-trip needed
      setStats(prev => ({
        ...prev,
        unreadNotificationsCount: (prev.unreadNotificationsCount || 0) + 1,
      }));
    };

    const sock = chatSocketService.socket;
    if (sock) {
      sock.on('notification:new', handleNewNotification);
      sock.on('notification', handleNewNotification);
    }

    // Also listen to global window event fired by chatSocketService
    window.addEventListener('newNotification', handleNewNotification);

    return () => {
      if (sock) {
        sock.off('notification:new', handleNewNotification);
        sock.off('notification', handleNewNotification);
      }
      window.removeEventListener('newNotification', handleNewNotification);
    };
  }, []);

  // Responsive breakpoint detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setScreenSize("mobile");
      else if (width < 1024) setScreenSize("tablet");
      else setScreenSize("desktop");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isMobileMenuOpen]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = async () => {
    try { await axiosInstance.post("/auth/logout"); } catch { /* ignore */ }
    userAuth.clear();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("userLoggedOut"));
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
    router.replace("/");
  };

  // Strip an optional country segment (/in /ae /de /us /au) so menu
  // highlighting works the same on /about-us and /de/about-us.
  const normalizedPath = (pathname || "/").replace(/^\/(in|ae|de|us|au)(?=\/|$)/i, "") || "/";
  const isMenuItemActive = (path) => {
    if (path === "/") return normalizedPath === "/";
    return normalizedPath.startsWith(path);
  };

  const menuItems = [
    { label: t("home"), path: "/" },
    { label: t("bookExperts"), path: "/book-your-resource" },
    { label: t("howItWorks"), path: "/how-it-works" },
    { label: t("contactUs"), path: "/contact-us" },
  ];

  const isMobile = screenSize === "mobile";
  const isTablet = screenSize === "tablet";

  // In RTL (Arabic) the "go forward" arrow should point left (←).
  // `rtl:rotate-180` achieves this without a separate component.
  const ChevronRight = () => (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="rtl:rotate-180">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 h-[72px] relative">
        <div className={`flex items-center h-full w-full justify-end ${isMobile ? "px-4" : isTablet ? "px-8" : "px-20"}`}>

          {/* Logo — start-* = inset-inline-start (left in LTR, right in RTL) */}
          <Link href="/" className="flex items-center flex-shrink-0 absolute start-4 sm:start-8 lg:start-20">
            <Image src="/quickhire-logo.svg" alt="QuickHire" width={isMobile ? 28 : isTablet ? 32 : 36} height={isMobile ? 28 : isTablet ? 32 : 36} className="h-auto w-auto" priority />
          </Link>

          {/* Mobile Icons (when authenticated) */}
          {isMobile && isAuthenticated && (
            <div className="flex items-center gap-1 ml-auto mr-0">
              <Link href="/cart" className="relative p-2 text-gray-600 hover:text-[#45A735] hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer" aria-label="Cart">
                <Image src="/cartIcon.svg" alt="Cart" width={20} height={20} className="w-auto h-auto" />
                {stats.cartItemCount > 0 && (
                  <span className="absolute -top-1 -end-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{stats.cartItemCount}</span>
                )}
              </Link>
              <Link href="/notifications" className="relative p-2 text-gray-600 hover:text-[#45A735] hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer" aria-label="Notifications">
                <Image src="/bellIcon.svg" alt="Notifications" width={20} height={20} className="w-auto h-auto" />
                {stats.unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -end-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{stats.unreadNotificationsCount}</span>
                )}
              </Link>
            </div>
          )}

          {/* Desktop & Tablet Navigation */}
          {!isMobile && (
            <nav className="flex items-center sm:gap-8 md:gap-4 xl:gap-6 ml-auto">
              {menuItems.map((item) => (
                <Link key={item.path} href={item.path} className={`transition-all duration-200 font-opensauce ${isTablet ? "text-sm" : "text-base"} ${isMenuItemActive(item.path) ? "text-[#45A735] font-semibold" : "text-gray-600 font-normal hover:text-[#45A735]"}`}>
                  {item.label}
                </Link>
              ))}

              {isAuthenticated ? (
                <div className="flex items-center gap-4 ml-4">
                  {/* Cart */}
                  <Link href="/cart" className="relative p-2 text-gray-600 hover:text-[#45A735] hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer" aria-label="Cart">
                    <Image src="/cartIcon.svg" alt="Cart" width={isTablet ? 20 : 24} height={isTablet ? 20 : 24} className="w-auto h-auto" />
                    {stats.cartItemCount > 0 && (
                      <span className="absolute -top-1 -end-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{stats.cartItemCount}</span>
                    )}
                  </Link>
                  {/* Notifications */}
                  <Link href="/notifications" className="relative p-2 text-gray-600 hover:text-[#45A735] hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer" aria-label="Notifications">
                    <Image src="/bellIcon.svg" alt="Notifications" width={isTablet ? 20 : 24} height={isTablet ? 20 : 24} className="w-auto h-auto" />
                    {stats.unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -end-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{stats.unreadNotificationsCount}</span>
                    )}
                  </Link>
                  {/* Profile Dropdown */}
                  <div className="relative user-menu-container">
                    <button onClick={() => setShowUserMenu(!showUserMenu)} className="p-2 text-gray-600 hover:text-[#45A735] hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer" aria-label="User menu">
                      <Image src="/profileIcon.svg" alt="User Profile" width={isTablet ? 20 : 24} height={isTablet ? 20 : 24} className="w-auto h-auto" />
                    </button>
                    {showUserMenu && (
                      <div className="absolute end-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-3 z-50">
                        {[
                          { label: t("myProfile"), href: "/profile?section=profile" },
                          { label: t("bookings"), href: "/profile?section=bookings" },
                          { label: t("payments"), href: "/profile?section=payments" },
                          { label: t("supportHelp"), href: "/profile?section=support" },
                        ].map((item) => (
                          <Link key={item.label} href={item.href} className="flex items-center justify-between px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setShowUserMenu(false)}>
                            <span className="text-base font-medium">{item.label}</span>
                            <ChevronRight />
                          </Link>
                        ))}
                        <div className="border-t border-gray-200 my-2" />
                        <button className="flex items-center justify-between w-full px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer" onClick={handleLogout}>
                          <span className="text-base font-medium">{t("logOut")}</span>
                          <ChevronRight />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Link href="/login" className={`inline-flex items-center justify-center border border-[#45A735] rounded-lg font-semibold font-opensauce text-[#45A735] bg-transparent transition-all duration-200 hover:bg-[#45A735] hover:text-white ${isTablet ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-base"}`}>
                  {t("signIn")}
                </Link>
              )}
            </nav>
          )}

          {/* Mobile Menu Button */}
          {isMobile && (
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#45A735] hover:bg-gray-100 rounded-lg transition-colors" aria-label="Toggle menu">
              {isMobileMenuOpen ? (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobile && (
        <>
          {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 transition-opacity duration-300" onClick={() => setIsMobileMenuOpen(false)} />}
          {/*
            end-0 = inset-inline-end: 0 → right in LTR, left in RTL.
            ltr:translate-x-full  slides menu out to the right when closed (LTR).
            rtl:-translate-x-full slides menu out to the left  when closed (RTL).
          */}
          <div className={`fixed top-[57px] end-0 bottom-0 w-[280px] bg-white z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "ltr:translate-x-full rtl:-translate-x-full"}`}>
            <nav className="flex flex-col p-0">
              {menuItems.map((item) => (
                <Link key={item.path} href={item.path} className={`mt-2 px-6 py-1 text-base font-opensauce transition-colors duration-200 text-start ${isMenuItemActive(item.path) ? "text-[#45A735] font-semibold" : "text-gray-700 font-normal hover:text-[#45A735]"}`} onClick={() => setIsMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-gray-300 my-0" />
              {isAuthenticated ? (
                <>
                  {[
                    { label: t("myProfile"), href: "/profile?section=profile" },
                    { label: t("bookings"), href: "/profile?section=bookings" },
                    { label: t("payments"), href: "/profile?section=payments" },
                    { label: t("supportHelp"), href: "/profile?section=support" },
                  ].map((item) => (
                    <Link key={item.label} href={item.href} className="flex items-center justify-between w-full px-6 py-4 text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-200 text-start" onClick={() => setIsMobileMenuOpen(false)}>
                      <span className="text-base font-medium">{item.label}</span>
                      <ChevronRight />
                    </Link>
                  ))}
                  <button className="flex items-center justify-between w-full px-6 py-4 text-gray-700 hover:bg-gray-50 transition-colors text-start" onClick={handleLogout}>
                    <span className="text-base font-medium">{t("logOut")}</span>
                    <ChevronRight />
                  </button>
                </>
              ) : (
                <Link href="/login" className="inline-flex items-center justify-center px-5 py-3 mx-6 mt-6 border border-[#45A735] rounded-lg font-semibold font-opensauce text-base text-[#45A735] bg-transparent transition-all duration-200 hover:bg-[#45A735] hover:text-white active:scale-95" onClick={() => setIsMobileMenuOpen(false)}>
                  {t("signIn")}
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
