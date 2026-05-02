'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { staffAuth } from '@/lib/axios/staffApi';
import GlobalSearch from './GlobalSearch';

const ROLE_META = {
  admin: { label: 'Admin', tag: 'Admin Console' },
  pm: { label: 'Project Manager', tag: 'PM Workspace' },
  resource: { label: 'Resource', tag: 'My Workspace' },
};

export default function StaffShell({ role, links, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const u = staffAuth.getUser();
    if (!u || u.role !== role) {
      router.replace(`/staff-login?role=${role}`);
      return;
    }
    setUser(u);
    setReady(true);
  }, [role, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const logout = () => {
    staffAuth.clear();
    router.replace(`/staff-login?role=${role}`);
  };

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

  const meta = ROLE_META[role] || { label: role, tag: 'Portal' };
  const initials = (user?.name || user?.mobile || '?').slice(0, 1).toUpperCase();

  const SidebarBody = (
    <>
      <div className="px-6 pt-6 pb-5 border-b border-[#E5F1E2]">
        <Link href={`/${role}`} className="flex items-center gap-2.5">
          <Image src="/quickhire-logo.svg" alt="QuickHire" width={34} height={34} priority />
          <div>
            <div className="text-[15px] font-open-sauce-bold text-[#26472B] leading-tight">QuickHire</div>
            <div className="text-[11px] uppercase tracking-wider text-[#45A735] font-open-sauce-semibold">{meta.tag}</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {links.map((l, i) => {
          if (l.type === 'section') {
            return (
              <div key={`section-${i}`} className="px-3 pt-4 pb-1">
                <span className="text-[10px] font-open-sauce-bold uppercase tracking-widest text-[#A0B8A0]">{l.label}</span>
              </div>
            );
          }
          const active = pathname === l.href || (l.href !== `/${role}` && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-open-sauce-medium transition-all duration-200 ${
                active
                  ? 'bg-[#F2F9F1] text-[#26472B] border-l-[3px] border-[#45A735] pl-[calc(0.75rem-3px)]'
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
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[#E5F1E2]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] flex items-center justify-center text-white font-open-sauce-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-open-sauce-semibold text-[#242424] truncate">
              {user?.name || meta.label}
            </div>
            <div className="text-[11px] text-[#909090] truncate">{user?.mobile}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-sm font-open-sauce-medium text-[#45A735] border border-[#45A735] rounded-lg py-2 transition-all duration-200 hover:bg-[#45A735] hover:text-white cursor-pointer"
        >
          Sign out
        </button>
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
            <Image src="/quickhire-logo.svg" alt="QuickHire" width={26} height={26} />
            <span className="text-sm font-open-sauce-semibold text-[#26472B]">{meta.tag}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#F2F9F1] flex items-center justify-center text-[#45A735] font-open-sauce-bold text-sm">
            {initials}
          </div>
        </div>

        {/* Desktop top bar with global search — admins only. PMs and
            resources don't have cross-cutting search needs (they work
            within their own assignments) so the bar would just be
            visual noise + a useless 401-prone API call for them. */}
        {role === 'admin' && (
          <div className="hidden lg:flex sticky top-0 z-30 bg-white border-b border-[#E5F1E2] px-6 h-14 items-center justify-end gap-3">
            <GlobalSearch />
          </div>
        )}

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
