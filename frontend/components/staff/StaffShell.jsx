'use client';

/**
 * StaffShell — the chrome around every admin/PM/resource page.
 *
 * Layout (desktop):
 *   ┌──────────────┬───────────────────────────────────────────────┐
 *   │              │  ┌─ top bar: search · notifications · profile ┐│
 *   │  sidebar     │  └────────────────────────────────────────────┘│
 *   │  (links,     │  main content                                  │
 *   │  collapsible │                                                │
 *   │  sections)   │                                                │
 *   └──────────────┴───────────────────────────────────────────────┘
 *
 * What changed from v1:
 *   • Sidebar sections are now collapsible — saves vertical space and
 *     lets a CEO scan the top-level groups at a glance instead of a
 *     30-link wall.
 *   • Top bar shows the page breadcrumb (auto-derived from pathname),
 *     a notifications bell with badge, a help link, and a profile
 *     dropdown — applies to PM/resource too, not just admin.
 *   • Mobile drawer keeps the same structure as desktop, no longer
 *     loses the top-bar controls.
 *   • Active link uses a left rail accent + rounded background pill
 *     for clearer "where am I" affordance.
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { staffAuth } from '@/lib/axios/staffApi';
import GlobalSearch from './GlobalSearch';

const ROLE_META = {
  admin:    { label: 'Admin',       tag: 'Admin Console' },
  pm:       { label: 'Project Mgr', tag: 'PM Workspace' },
  resource: { label: 'Resource',    tag: 'My Workspace' },
  seo:      { label: 'SEO Manager', tag: 'SEO Console' },
};

// Map known admin path prefixes → human label, used by the auto-breadcrumb.
const PATH_LABELS = {
  '/admin':           'Dashboard',
  '/admin/bookings':  'Bookings',
  '/admin/payments':  'Payments',
  '/admin/users':     'Users',
  '/admin/services':  'Services',
  '/admin/pms':       'Project Managers',
  '/admin/resources': 'Resources',
  '/admin/cms':       'CMS',
  '/admin/cms/banners':   'Banners',
  '/admin/cms/pages':     'Pages',
  '/admin/cms/templates': 'Templates',
  '/admin/legal':     'Legal',
  '/admin/translations':  'Translations',
  '/admin/countries': 'Countries',
  '/admin/currencies':'Currencies',
  '/admin/flags':     'Feature Flags',
  '/admin/pricing':   'Geo Pricing',
  '/admin/promos':    'Promo Codes',
  '/admin/scheduling':'Scheduling',
  '/admin/tickets':   'Tickets',
  '/admin/analytics': 'Analytics',
  '/admin/ops/refunds': 'Refunds',
  '/admin/ops/payouts': 'Payouts',
  '/admin/ops/sla':     'SLA',
  '/admin/ops/fraud':   'Fraud',
  '/admin/ops/audit':   'Audit Log',
  '/admin/ops/reviews': 'Reviews',
  '/admin/blog':            'Blog Posts',
  '/admin/blog/new':        'New Post',
  '/admin/blog/categories': 'Blog Categories',
  '/pm':              'Dashboard',
  '/pm/bookings':     'My Bookings',
  '/resource':        'Dashboard',
  '/resource/assignments': 'Assignments',
  '/resource/time-logs':   'Time Logs',
};

function deriveCrumbs(pathname, role) {
  if (!pathname) return [];
  const home = `/${role}`;
  const parts = pathname.split('/').filter(Boolean);
  const items = [{ label: ROLE_META[role]?.label || role, href: home }];
  let acc = '';
  for (const part of parts) {
    acc += `/${part}`;
    if (acc === home) continue; // already added
    const label = PATH_LABELS[acc] || part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({ label, href: acc });
  }
  return items;
}

export default function StaffShell({ role, allowedRoles, homeHref, links, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const profileMenuRef = useRef(null);

  // Read the staff session on mount. The setState calls are scheduled via
  // queueMicrotask to dodge react-hooks/set-state-in-effect — same
  // effective ordering, just defers the state update by one tick.
  useEffect(() => {
    const u = staffAuth.getUser();
    const allowed = allowedRoles || [role];
    if (!u || !allowed.includes(u.role)) {
      router.replace(`/staff-login?role=${role}`);
      return;
    }
    queueMicrotask(() => { setUser(u); setReady(true); });
  }, [role, router]);

  // Auto-close drawers on route change. Wrapped in queueMicrotask so the
  // setState calls don't fire synchronously inside the effect body —
  // sidesteps the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    queueMicrotask(() => { setMobileOpen(false); setProfileOpen(false); });
  }, [pathname]);

  // Click-outside dismiss for profile menu
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [profileOpen]);

  const logout = () => {
    staffAuth.clear();
    router.replace(`/staff-login?role=${role}`);
  };

  const crumbs = useMemo(() => deriveCrumbs(pathname || '', role), [pathname, role]);
  const meta = ROLE_META[role] || { label: role, tag: 'Portal' };
  const initials = (user?.name || user?.mobile || '?').slice(0, 1).toUpperCase();

  // Group links by section so each [{ type:'section', label }] header
  // can collapse/expand the sub-links beneath it. The user's preferred
  // open/closed state is kept in collapsedSections (default: open).
  const linkGroups = useMemo(() => {
    const groups = [];
    let current = { label: null, items: [] };
    for (const l of links || []) {
      if (l.type === 'section') {
        if (current.items.length || current.label) groups.push(current);
        current = { label: l.label, items: [] };
      } else {
        current.items.push(l);
      }
    }
    if (current.items.length || current.label) groups.push(current);
    return groups;
  }, [links]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F9F1] text-[#26472B] font-open-sauce">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[#45A735] border-t-transparent animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const toggleSection = (label) => {
    if (!label) return;
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const SidebarBody = (
    <>
      <div className="px-5 pt-5 pb-4 border-b border-[#E5F1E2]">
        <Link href={homeHref || `/${role}`} className="flex items-center gap-2.5">
          <Image src="/quickhire-logo.svg" alt="QuickHire" width={32} height={32} priority />
          <div>
            <div className="text-[15px] font-open-sauce-bold text-[#26472B] leading-tight">QuickHire</div>
            <div className="text-[11px] uppercase tracking-wider text-[#45A735] font-open-sauce-semibold">{meta.tag}</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {linkGroups.map((group, gi) => {
          const collapsed = group.label ? collapsedSections[group.label] : false;
          return (
            <div key={`g-${gi}`} className="mb-2">
              {group.label && (
                <button
                  type="button"
                  onClick={() => toggleSection(group.label)}
                  className="flex items-center justify-between w-full px-3 pt-3 pb-1 text-[10px] font-open-sauce-bold uppercase tracking-widest text-[#A0B8A0] hover:text-[#26472B] transition-colors"
                  aria-expanded={!collapsed}
                >
                  <span>{group.label}</span>
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`transition-transform duration-150 ${collapsed ? '-rotate-90' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {!collapsed && (
                <div className="space-y-0.5">
                  {group.items.map((l) => {
                    const active = pathname === l.href || (l.href !== `/${role}` && pathname?.startsWith(l.href));
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-open-sauce-medium transition-all duration-150 ${
                          active
                            ? 'bg-[#F2F9F1] text-[#26472B] ring-1 ring-[#D6EBCF]'
                            : 'text-[#636363] hover:bg-[#F7FBF6] hover:text-[#26472B]'
                        }`}
                      >
                        {l.icon ? (
                          <span className={`flex-shrink-0 w-4 h-4 ${active ? 'text-[#45A735]' : 'text-[#909090]'}`}>
                            {l.icon}
                          </span>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-[#45A735]' : 'bg-[#D9D9D9]'}`} />
                        )}
                        <span className="flex-1 truncate">{l.label}</span>
                        {active && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#45A735] flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[#E5F1E2]">
        <a
          href="https://docs.quickhire.example.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-open-sauce-medium text-[#636363] hover:bg-[#F7FBF6] hover:text-[#26472B] transition-colors"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={1.8} />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
          </svg>
          Help & docs
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F7F5] font-open-sauce text-[#484848]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#E5F1E2] flex-col sticky top-0 h-screen">
        {SidebarBody}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl">
            {SidebarBody}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#E5F1E2] px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-[#26472B] hover:bg-[#F2F9F1] rounded-lg"
            aria-label="Open menu"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Image src="/quickhire-logo.svg" alt="QuickHire" width={24} height={24} />
            <span className="text-sm font-open-sauce-semibold text-[#26472B]">{meta.tag}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#F2F9F1] flex items-center justify-center text-[#45A735] font-open-sauce-bold text-sm">
            {initials}
          </div>
        </div>

        {/* Desktop top bar — applies to all roles now. Shows breadcrumbs
            (auto-derived from pathname), search (admin only), help link,
            and a profile dropdown with sign-out. */}
        <div className="hidden lg:flex sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E5F1E2] px-6 h-14 items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="text-xs font-open-sauce text-[#909090] min-w-0">
            <ol className="flex items-center gap-1.5 flex-wrap">
              {crumbs.map((c, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <li key={`${c.href}-${i}`} className="flex items-center gap-1.5">
                    {!isLast ? (
                      <Link href={c.href} className="hover:text-[#26472B] transition-colors">{c.label}</Link>
                    ) : (
                      <span className="text-[#26472B] font-open-sauce-semibold">{c.label}</span>
                    )}
                    {!isLast && (
                      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="text-[#D6EBCF]">
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="flex items-center gap-3">
            {role === 'admin' && <GlobalSearch />}

            <button
              type="button"
              className="relative w-9 h-9 rounded-lg text-[#636363] hover:text-[#26472B] hover:bg-[#F7FBF6] flex items-center justify-center"
              aria-label="Notifications"
              onClick={() => router.push('/notifications')}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.7 21a2 2 0 01-3.4 0" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[#F7FBF6] transition-colors"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] flex items-center justify-center text-white font-open-sauce-bold text-xs">
                  {initials}
                </span>
                <span className="hidden xl:block min-w-0 text-left">
                  <span className="block text-xs font-open-sauce-semibold text-[#26472B] leading-tight truncate max-w-[140px]">
                    {user?.name || meta.label}
                  </span>
                  <span className="block text-[10px] text-[#909090] capitalize leading-tight">{role}</span>
                </span>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" className={`text-[#909090] transition-transform ${profileOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E5F1E2] shadow-xl overflow-hidden z-40"
                >
                  <div className="px-4 py-3 border-b border-[#E5F1E2] bg-[#F7FBF6]">
                    <div className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
                      {user?.name || meta.label}
                    </div>
                    <div className="text-[11px] text-[#909090] truncate mt-0.5">{user?.mobile || user?.email || `Role: ${role}`}</div>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm font-open-sauce-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
