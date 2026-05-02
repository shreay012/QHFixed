'use client';

/**
 * Admin command-bar — searches across bookings, customers, payments, and
 * tickets in one shot. Results are grouped by kind and clicking one
 * deep-links to the relevant detail / filtered list page.
 *
 * Shape comes from GET /admin/search?q=… (admin.routes.js); each row is
 * already pre-baked with `kind`, `label`, `sublabel`, and `route` so this
 * component stays presentation-only.
 *
 * Hotkey: ⌘K (mac) / Ctrl+K — opens the dropdown without using the mouse.
 * Esc closes. Search runs on a 200ms debounce so the FE doesn't fire a
 * request per keystroke.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';

const KIND_META = {
  booking:  { label: 'Bookings',  color: 'text-[#26472B]', bg: 'bg-[#F2F9F1]' },
  customer: { label: 'Customers', color: 'text-blue-700',  bg: 'bg-blue-50'  },
  payment:  { label: 'Payments',  color: 'text-amber-700', bg: 'bg-amber-50' },
  ticket:   { label: 'Tickets',   color: 'text-purple-700', bg: 'bg-purple-50' },
};

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState('');
  const [results, setResults] = useState({ bookings: [], customers: [], payments: [], tickets: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Cmd/Ctrl + K to open
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Debounced search
  const runSearch = useCallback((query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ bookings: [], customers: [], payments: [], tickets: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    staffApi.get(`/admin/search?q=${encodeURIComponent(trimmed)}`)
      .then((r) => {
        setResults(r.data?.data || { bookings: [], customers: [], payments: [], tickets: [] });
      })
      .catch(() => {
        setResults({ bookings: [], customers: [], payments: [], tickets: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 200);
    return () => clearTimeout(debounceRef.current);
  }, [q, runSearch]);

  const goTo = (route) => {
    setOpen(false);
    setQ('');
    router.push(route);
  };

  const totalHits =
    results.bookings.length +
    results.customers.length +
    results.payments.length +
    results.tickets.length;

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Trigger button (collapsed state) — visible in the shell header */}
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5F1E2] rounded-lg text-xs text-[#909090] hover:border-[#45A735] transition-colors min-w-[200px]"
        aria-label="Open global search"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <span className="flex-1 text-left">Search bookings, users, payments…</span>
        <kbd className="text-[10px] font-mono bg-[#F5F7F5] border border-[#E5E7EB] rounded px-1.5 py-0.5 text-[#636363]">⌘K</kbd>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(560px,calc(100vw-2rem))] bg-white border border-[#E5F1E2] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-[#E5F1E2]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090]" width={15} height={15} viewBox="0 0 24 24" fill="none">
                <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Booking ID, customer name/mobile/email, payment ID…"
                className="w-full pl-9 pr-3 py-2.5 border border-[#E5F1E2] rounded-lg text-sm focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {q.trim().length < 2 && (
              <div className="px-4 py-8 text-center text-xs text-[#909090]">
                Type at least 2 characters to search.
              </div>
            )}

            {q.trim().length >= 2 && loading && (
              <div className="px-4 py-8 text-center text-xs text-[#909090]">Searching…</div>
            )}

            {q.trim().length >= 2 && !loading && totalHits === 0 && (
              <div className="px-4 py-8 text-center text-xs text-[#909090]">
                No matches for &ldquo;{q.trim()}&rdquo;.
              </div>
            )}

            {!loading && totalHits > 0 && (
              <div className="py-2">
                {Object.entries(results).map(([kind, rows]) => {
                  if (!rows.length) return null;
                  const meta = KIND_META[kind.replace(/s$/, '')] || { label: kind };
                  return (
                    <div key={kind} className="mb-1">
                      <div className="px-4 pt-2 pb-1 flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider font-open-sauce-bold ${meta.color}`}>{meta.label}</span>
                        <span className="text-[10px] text-[#909090]">{rows.length}</span>
                      </div>
                      {rows.map((row) => (
                        <button
                          key={`${row.kind}-${row._id}`}
                          onClick={() => goTo(row.route)}
                          className="w-full px-4 py-2.5 hover:bg-[#F7FBF6] flex items-start gap-3 text-left transition-colors group"
                        >
                          <span className={`flex-shrink-0 w-7 h-7 ${meta.bg} ${meta.color} rounded-md flex items-center justify-center text-[10px] font-open-sauce-bold uppercase mt-0.5`}>
                            {meta.label[0]}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-[#26472B] font-open-sauce-semibold truncate">{row.label}</span>
                            <span className="block text-[11px] text-[#909090] truncate">{row.sublabel}</span>
                          </span>
                          <svg className="flex-shrink-0 w-4 h-4 text-[#909090] opacity-0 group-hover:opacity-100 transition-opacity mt-2" viewBox="0 0 24 24" fill="none">
                            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-[#E5F1E2] flex items-center justify-between text-[10px] text-[#909090]">
            <span>Press Esc to close</span>
            <span>Searches across bookings · customers · payments · tickets</span>
          </div>
        </div>
      )}
    </div>
  );
}
