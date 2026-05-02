'use client';

/**
 * Admin Dashboard — redesigned with senior-grade information architecture.
 *
 * Layout (top → bottom):
 *   1. Welcome strip          — greets the admin by name + summary stat
 *   2. Hero KPI grid          — 4 click-through tiles for the metrics
 *                                most ops/CEO/finance teams check first
 *   3. Needs-attention rail   — actionable counters that drive triage
 *   4. Revenue chart + status — 6-month revenue + bookings-by-status
 *   5. Recent activity feed   — last 10 bookings, link to full list
 *
 * Design principles applied:
 *   • Each KPI tile is clickable → routes to the filtered list view, so a
 *     CEO can drill from "23 pending bookings" to the actual queue in one
 *     click. No more guessing where data lives.
 *   • Needs-attention panel surfaces actionable items (refunds awaiting
 *     review, payouts due, tickets escalated, mock payments) so the
 *     admin sees what to do today, not just numbers.
 *   • Empty states have CTAs and helpful copy, never just "No data".
 *   • Stat values are tabular-nums so columns line up visually.
 *   • All interactive surfaces have hover affordances + focus rings.
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { staffAuth } from '@/lib/axios/staffApi';
import { s } from '@/lib/utils/i18nText';
import {
  PageHeader,
  StatCard,
  Spinner,
  ErrorBox,
  Button,
  StatusBadge,
  EmptyState,
  SectionCard,
  Card,
  MetricDelta,
} from '@/components/staff/ui';

function Avatar({ name }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] flex items-center justify-center text-white font-open-sauce-bold text-xs flex-shrink-0">
      {initials}
    </div>
  );
}

function shortMonth(monthStr) {
  try {
    const [year, mon] = String(monthStr).split('-');
    const d = new Date(Number(year), Number(mon) - 1, 1);
    return d.toLocaleString('en-US', { month: 'short' });
  } catch {
    return monthStr;
  }
}

function formatCompactNumber(n) {
  if (typeof n !== 'number') return n ?? '—';
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function greetingForHour(h) {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [bookingsByStatus, setBookingsByStatus] = useState({});
  const [needsAttention, setNeedsAttention] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    const u = staffAuth.getUser();
    if (u?.name) queueMicrotask(() => setStaffName(u.name));

    Promise.allSettled([
      staffApi.get('/admin/dashboard/stats'),
      staffApi.get('/admin/dashboard/revenue'),
      staffApi.get('/admin/dashboard/recent-activity'),
      staffApi.get('/admin/dashboard'),
      // Needs-attention pulls — each is a tiny pageSize=1 query so we
      // only need meta.total for the count. Soft-fails so a single
      // missing route doesn't break the whole panel.
      staffApi.get('/admin-ops/refunds?status=pending&pageSize=1').catch(() => null),
      staffApi.get('/admin-ops/payouts?status=pending&pageSize=1').catch(() => null),
      staffApi.get('/admin/tickets?status=open&pageSize=1').catch(() => null),
      staffApi.get('/admin/payments?status=created&pageSize=1').catch(() => null),
    ]).then((results) => {
      const [statsRes, revenueRes, activityRes, dashRes, refundsRes, payoutsRes, ticketsRes, pendingPaymentsRes] = results;
      const errs = {};

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data || null);
      } else {
        errs.stats = statsRes.reason;
      }

      if (revenueRes.status === 'fulfilled') {
        const raw = revenueRes.value.data?.data || revenueRes.value.data;
        setRevenueData(Array.isArray(raw) ? raw : []);
      } else {
        errs.revenue = revenueRes.reason;
      }

      if (activityRes.status === 'fulfilled') {
        const raw = activityRes.value.data?.data || activityRes.value.data;
        setRecentActivity(Array.isArray(raw) ? raw : []);
      } else {
        errs.activity = activityRes.reason;
      }

      if (dashRes.status === 'fulfilled') {
        const raw = dashRes.value.data?.data || dashRes.value.data;
        setBookingsByStatus(raw?.bookingsByStatus || {});
        if (errs.stats && raw) {
          setStats({
            totalBookings: raw.totalBookings,
            pendingBookings: null,
            activeJobs: null,
            totalRevenue: raw.revenue?.total || 0,
            totalCustomers: raw.totalUsers,
            totalPMs: null,
            totalResources: null,
            revenue: raw.revenue,
          });
          delete errs.stats;
        }
      } else {
        errs.dash = dashRes.reason;
      }

      // Needs-attention counts — each route returns meta.total even
      // when the data array is capped at 1 row (set on the backend by
      // the previous scale-readiness commit).
      setNeedsAttention({
        pendingRefunds:  refundsRes?.value?.data?.meta?.total ?? 0,
        pendingPayouts:  payoutsRes?.value?.data?.meta?.total ?? 0,
        openTickets:     ticketsRes?.value?.data?.meta?.total ?? 0,
        pendingPayments: pendingPaymentsRes?.value?.data?.data?.total ?? 0,
      });

      setErrors(errs);
      setLoading(false);
    });
  }, []);

  const maxRev = Math.max(...revenueData.map((r) => r.revenue ?? 0), 1);
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of QuickHire operations"
        helpText="Click any KPI to drill into the underlying list. Cached for 60s for performance."
      />

      <div className="p-4 sm:p-8 space-y-6">
        {/* Welcome strip */}
        <Card className="px-5 sm:px-6 py-5 bg-gradient-to-r from-[#F2F9F1] via-white to-white">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider mb-1">{greeting}</div>
              <h2 className="text-xl sm:text-2xl font-open-sauce-bold text-[#26472B] leading-tight">
                {staffName ? `${staffName} 👋` : 'Welcome back'}
              </h2>
              <p className="text-sm text-[#636363] mt-1">
                Here&rsquo;s what&rsquo;s happening across QuickHire today.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="primary" size="md" onClick={() => router.push('/admin/bookings')}>
                Open bookings
              </Button>
              <Button variant="subtle" size="md" onClick={() => router.push('/admin/cms/banners')}>
                Edit banners
              </Button>
            </div>
          </div>
        </Card>

        {/* Hero KPIs — clickable */}
        {loading && !stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-full"><Spinner /></div>
          </div>
        ) : (
          <>
            {errors.stats && <ErrorBox error={errors.stats} />}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Customers"
                  value={(stats.totalCustomers ?? 0).toLocaleString('en-IN')}
                  hint="All registered users"
                  color="green"
                  icon="👥"
                  onClick={() => router.push('/admin/users')}
                />
                <StatCard
                  label="Bookings"
                  value={(stats.totalBookings ?? 0).toLocaleString('en-IN')}
                  hint={`${stats.activeJobs ?? 0} active right now`}
                  color="green"
                  icon="📋"
                  onClick={() => router.push('/admin/bookings')}
                />
                <StatCard
                  label="Revenue"
                  value={formatCompactNumber(stats.totalRevenue || 0)}
                  hint={stats.revenue?.count != null ? `${stats.revenue.count} payments` : 'Lifetime'}
                  color="orange"
                  icon="💰"
                  onClick={() => router.push('/admin/payments')}
                />
                <StatCard
                  label="Pending approval"
                  value={(stats.pendingBookings ?? 0).toLocaleString('en-IN')}
                  hint="Awaiting confirmation"
                  color={stats.pendingBookings > 0 ? 'red' : 'slate'}
                  icon="⏳"
                  onClick={() => router.push('/admin/bookings?status=pending')}
                />
              </div>
            )}
          </>
        )}

        {/* Needs-attention rail */}
        <SectionCard
          title="Needs attention"
          description="Items that need a human decision today. Click any row to triage."
          helpText="Counts are pulled live; cached for 60s. The rail hides cards with zero items."
        >
          <NeedsAttentionRail data={needsAttention} loading={loading} router={router} />
        </SectionCard>

        {/* Revenue + bookings by status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            title="Revenue trend"
            subtitle="Last 6 months"
            action={
              <Button size="sm" variant="subtle" onClick={() => router.push('/admin/analytics')}>
                Full analytics
              </Button>
            }
          >
            {errors.revenue ? (
              <ErrorBox error={errors.revenue} />
            ) : loading ? (
              <Spinner />
            ) : revenueData.length === 0 ? (
              <EmptyState
                message="No revenue data yet"
                description="Revenue points appear here once paid bookings start flowing."
              />
            ) : (
              <RevenueChart data={revenueData} maxRev={maxRev} />
            )}
          </SectionCard>

          <SectionCard
            title="Bookings by status"
            subtitle="Across the entire platform"
            action={
              <Button size="sm" variant="subtle" onClick={() => router.push('/admin/bookings')}>
                Open list
              </Button>
            }
          >
            {errors.dash ? (
              <ErrorBox error={errors.dash} />
            ) : loading ? (
              <Spinner />
            ) : Object.keys(bookingsByStatus).length === 0 ? (
              <EmptyState
                message="No bookings yet"
                description="Booking distribution lights up once customers start booking."
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(bookingsByStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => router.push(`/admin/bookings?status=${status}`)}
                      className="bg-[#F7FBF6] rounded-xl border border-[#E5F1E2] p-3 text-left hover:border-[#45A735] hover:shadow-[0_4px_12px_rgba(69,167,53,0.10)] transition-all"
                    >
                      <div className="text-[11px] text-[#636363] font-open-sauce-semibold uppercase tracking-wider truncate">
                        {status.replace(/_/g, ' ')}
                      </div>
                      <div className="text-2xl font-open-sauce-bold text-[#26472B] mt-1 tabular-nums">
                        {count.toLocaleString('en-IN')}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Recent activity */}
        <SectionCard
          title="Recent activity"
          subtitle="Last 10 bookings"
          action={
            <Button size="sm" variant="subtle" onClick={() => router.push('/admin/bookings')}>
              View all
            </Button>
          }
        >
          {errors.activity ? (
            <ErrorBox error={errors.activity} />
          ) : loading ? (
            <Spinner />
          ) : recentActivity.length === 0 ? (
            <EmptyState
              message="No recent bookings"
              description="The last 10 bookings will show up here as they come in."
            />
          ) : (
            <div className="divide-y divide-[#EEF5EC] -mx-5 sm:-mx-5">
              {recentActivity.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => router.push(`/admin/bookings/${item._id}`)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#F7FBF6] transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={s(item.customerName)} />
                    <div className="min-w-0">
                      <div className="text-sm font-open-sauce-semibold text-[#242424] truncate">
                        {s(item.customerName) || '—'}
                      </div>
                      <div className="text-xs text-[#636363] font-open-sauce truncate">
                        {s(item.serviceName) || '—'}
                        {' · '}
                        {item.startTime ? new Date(item.startTime).toLocaleDateString() : 'No date'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={item.status} />
                    <span className="text-sm font-open-sauce-semibold text-[#26472B] hidden sm:block tabular-nums">
                      ₹{(item.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="text-[#909090]">
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function NeedsAttentionRail({ data, loading, router }) {
  const items = [
    { key: 'pendingRefunds',  label: 'Refunds awaiting review', count: data.pendingRefunds || 0,  href: '/admin/ops/refunds?status=pending', tone: 'orange' },
    { key: 'pendingPayouts',  label: 'Payouts due',              count: data.pendingPayouts || 0,  href: '/admin/ops/payouts?status=pending', tone: 'amber' },
    { key: 'openTickets',     label: 'Open tickets',              count: data.openTickets || 0,     href: '/admin/tickets?status=open',         tone: 'blue' },
    { key: 'pendingPayments', label: 'Pending payments',          count: data.pendingPayments || 0, href: '/admin/payments?status=created',     tone: 'red' },
  ];
  const total = items.reduce((s, it) => s + it.count, 0);

  if (loading) return <Spinner />;
  if (total === 0) {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="inline-flex w-9 h-9 rounded-full bg-[#F2F9F1] text-[#45A735] items-center justify-center text-base">✓</span>
        <div>
          <div className="text-sm font-open-sauce-semibold text-[#26472B]">All clear</div>
          <div className="text-xs text-[#636363]">Nothing needs your attention right now.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items
        .filter((it) => it.count > 0)
        .map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => router.push(it.href)}
            className="text-left p-3 rounded-xl bg-white ring-1 ring-[#E5F1E2] hover:ring-[#45A735] hover:shadow-[0_4px_12px_rgba(69,167,53,0.12)] transition-all"
          >
            <div className="text-3xl font-open-sauce-bold text-[#26472B] tabular-nums">{it.count}</div>
            <div className="text-xs text-[#636363] font-open-sauce mt-1">{it.label}</div>
          </button>
        ))}
    </div>
  );
}

function RevenueChart({ data, maxRev }) {
  const total = data.reduce((s, r) => s + (r.revenue || 0), 0);
  const avg = total / Math.max(1, data.length);
  const lastMonth = data[data.length - 1]?.revenue || 0;
  const prevMonth = data[data.length - 2]?.revenue || 0;
  const momPct = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100) : 0;

  return (
    <div>
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold">6-month total</div>
          <div className="text-2xl font-open-sauce-bold text-[#26472B] tabular-nums mt-0.5">
            ₹{total.toLocaleString('en-IN')}
          </div>
        </div>
        {prevMonth > 0 && (
          <div className="ml-auto">
            <MetricDelta value={momPct} label="MoM" />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 h-36 w-full">
        {data.map((r) => {
          const barH = Math.max(4, ((r.revenue || 0) / maxRev) * 136);
          return (
            <div key={r.month} className="flex flex-col items-center gap-1 flex-1 group relative">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#26472B] text-white text-[10px] font-open-sauce-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                ₹{(r.revenue || 0).toLocaleString('en-IN')}
              </div>
              <div
                className="w-full bg-gradient-to-t from-[#45A735] to-[#78EB54] rounded-t-md hover:from-[#26472B] hover:to-[#45A735] transition-all duration-200 cursor-default"
                style={{ height: `${barH}px`, minHeight: '4px' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {data.map((r) => (
          <div key={r.month} className="flex-1 text-center text-[10px] text-[#909090] font-open-sauce">
            {shortMonth(r.month)}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-[#909090] font-open-sauce">
        <span>Avg: ₹{Math.round(avg).toLocaleString('en-IN')}</span>
        <span>Peak: ₹{maxRev.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}
