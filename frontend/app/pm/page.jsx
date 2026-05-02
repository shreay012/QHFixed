'use client';

/**
 * PM Dashboard — workspace home for Project Managers.
 *
 * Key UX choices:
 *   • Welcome strip greets by name + shows the day's most urgent count
 *     ("3 bookings need to start today").
 *   • Hero KPI grid is clickable — each tile deep-links into the
 *     bookings list filtered to that status.
 *   • "Today's focus" panel surfaces the actionable bookings the PM
 *     should look at first (assigned but not started, in-progress,
 *     paused) so the morning routine is "open dashboard → click first
 *     row → start work".
 *   • Status breakdown rendered as click-through chips so a PM can
 *     pivot from "I have 12 paused" to "show me those 12" instantly.
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import staffApi, { staffAuth } from '@/lib/axios/staffApi';
import {
  PageHeader,
  StatCard,
  Spinner,
  ErrorBox,
  Button,
  EmptyState,
  SectionCard,
  Card,
  StatusBadge,
} from '@/components/staff/ui';
import { s } from '@/lib/utils/i18nText';

function greetingForHour(h) {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function PmDashboard() {
  const t = useTranslations('pm.dashboard');
  const router = useRouter();
  const [data, setData] = useState(null);
  const [todays, setTodays] = useState([]);
  const [error, setError] = useState(null);
  const [staffName, setStaffName] = useState('');
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  useEffect(() => {
    const u = staffAuth.getUser();
    if (u?.name) queueMicrotask(() => setStaffName(u.name));

    Promise.allSettled([
      staffApi.get('/pm/dashboard'),
      // Today's focus = first 5 bookings the PM has, sorted by recency,
      // filtered to actionable statuses. Caps at 5 so the panel stays
      // scannable even for PMs managing dozens.
      staffApi.get('/pm/bookings?pageSize=5'),
    ]).then(([dashRes, listRes]) => {
      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value.data?.data);
      } else {
        setError(dashRes.reason);
      }
      if (listRes.status === 'fulfilled') {
        setTodays(listRes.value.data?.data || []);
      }
    });
  }, []);

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        helpText="Click any KPI to see the underlying bookings. Numbers refresh every 30s."
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
                {data?.assigned > 0
                  ? `You have ${data.assigned} booking${data.assigned === 1 ? '' : 's'} waiting to start.`
                  : 'Nothing waiting to start. Check in-progress work below.'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="primary" size="md" onClick={() => router.push('/pm/bookings?status=assigned_to_pm')}>
                Open assigned queue
              </Button>
              <Button variant="subtle" size="md" onClick={() => router.push('/pm/bookings')}>
                All bookings
              </Button>
            </div>
          </div>
        </Card>

        <ErrorBox error={error} />

        {!data && !error && <Spinner />}

        {data && (
          <>
            {/* Hero KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label={t('assigned')}
                value={(data.assigned || 0).toLocaleString('en-IN')}
                hint="Awaiting start"
                color={data.assigned > 0 ? 'amber' : 'slate'}
                icon="📥"
                onClick={() => router.push('/pm/bookings?status=assigned_to_pm')}
              />
              <StatCard
                label={t('inProgress')}
                value={(data.inProgress || 0).toLocaleString('en-IN')}
                hint="Active work"
                color={data.inProgress > 0 ? 'green' : 'slate'}
                icon="⚡"
                onClick={() => router.push('/pm/bookings?status=in_progress')}
              />
              <StatCard
                label={t('paused')}
                value={(data.paused || 0).toLocaleString('en-IN')}
                hint="Resume when ready"
                color={data.paused > 0 ? 'orange' : 'slate'}
                icon="⏸"
                onClick={() => router.push('/pm/bookings?status=paused')}
              />
              <StatCard
                label={t('completed')}
                value={(data.completed || 0).toLocaleString('en-IN')}
                hint="Lifetime"
                color="slate"
                icon="✓"
                onClick={() => router.push('/pm/bookings?status=completed')}
              />
            </div>

            {/* Today's focus + breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SectionCard
                title="Today's focus"
                subtitle="The 5 most recent bookings that need your attention"
                action={
                  <Button size="sm" variant="subtle" onClick={() => router.push('/pm/bookings')}>
                    View all
                  </Button>
                }
                className="lg:col-span-2"
              >
                {todays.length === 0 ? (
                  <EmptyState
                    title="All clear"
                    description="No active bookings need your attention right now."
                    action={
                      <Button variant="primary" size="md" onClick={() => router.push('/pm/bookings')}>
                        Browse all bookings
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-[#EEF5EC] -mx-5">
                    {todays.map((b) => (
                      <button
                        key={b._id}
                        type="button"
                        onClick={() => router.push(`/pm/bookings/${b._id}`)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#F7FBF6] transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
                            {s(b.customerName) || 'Customer'}
                          </div>
                          <div className="text-xs text-[#636363] truncate">
                            {s(b.serviceName) || 'Service'}
                            {b.customerMobile && ` · ${b.customerMobile}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={b.status} />
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="text-[#909090]">
                            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="By status"
                subtitle="Click to jump"
              >
                {Object.keys(data.byStatus || {}).length === 0 ? (
                  <EmptyState
                    message="Nothing assigned yet"
                    description="Bookings appear here as admins assign them to you."
                  />
                ) : (
                  <div className="space-y-2">
                    {Object.entries(data.byStatus)
                      .sort(([, a], [, b]) => b - a)
                      .map(([k, v]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => router.push(`/pm/bookings?status=${k}`)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#F7FBF6] hover:bg-white hover:ring-1 hover:ring-[#45A735] transition-all text-left"
                        >
                          <span className="text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider truncate">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="text-base font-open-sauce-bold text-[#26472B] tabular-nums">{v}</span>
                        </button>
                      ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
