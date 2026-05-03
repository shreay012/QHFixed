'use client';

/**
 * Resource Dashboard — what a developer / freelancer sees first thing.
 *
 * Designed around the resource's daily workflow:
 *   1. Welcome strip — greets by name, shows the count of "needs your
 *      acceptance" so they know what to do.
 *   2. Hero KPIs — active / completed / hours-logged / today's hours.
 *   3. Today's queue — assignments to accept + assignments in progress.
 *   4. Recent time logs preview — quick look at this week's work.
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

export default function ResourceDashboard() {
  const t = useTranslations('resource.dashboard');
  const router = useRouter();
  const [data, setData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState(null);
  const [staffName, setStaffName] = useState('');
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  useEffect(() => {
    const u = staffAuth.getUser();
    if (u?.name) queueMicrotask(() => setStaffName(u.name));

    Promise.allSettled([
      staffApi.get('/resource/dashboard'),
      staffApi.get('/resource/assignments?pageSize=5'),
      staffApi.get('/resource/time-logs?pageSize=5'),
    ]).then(([dashRes, asgRes, logsRes]) => {
      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value.data?.data);
      } else {
        setError(dashRes.reason);
      }
      if (asgRes.status === 'fulfilled') {
        setAssignments(asgRes.value.data?.data || []);
      }
      if (logsRes.status === 'fulfilled') {
        setRecentLogs(logsRes.value.data?.data || []);
      }
    });
  }, []);

  const needsAcceptance = assignments.filter((a) => !a.resourceAcceptedAt).length;
  // Mounted-once anchor for "this week" so re-renders don't shift the
  // window. The lint rule that flags Date.now() inside useMemo treats
  // the call as impure during render — capturing it once on mount in a
  // ref-style state gets us a stable cutoff.
  const [weekStartedAt] = useState(() => Date.now());
  const hoursThisWeek = useMemo(() => {
    const cutoff = weekStartedAt - 7 * 24 * 60 * 60 * 1000;
    return recentLogs
      .filter((l) => new Date(l.createdAt).getTime() >= cutoff)
      .reduce((s2, l) => s2 + (Number(l.hours) || 0), 0);
  }, [recentLogs, weekStartedAt]);

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        helpText="Tip: log time daily for accurate weekly earnings."
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
                {needsAcceptance > 0
                  ? `${needsAcceptance} new assignment${needsAcceptance === 1 ? '' : 's'} waiting for you to accept.`
                  : data?.activeAssignments > 0
                    ? `${data.activeAssignments} active assignment${data.activeAssignments === 1 ? '' : 's'} in flight.`
                    : 'No active work right now. Take a break!'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="primary" size="md" onClick={() => router.push('/resource/assignments')}>
                Open assignments
              </Button>
              <Button variant="subtle" size="md" onClick={() => router.push('/resource/time-logs')}>
                Log time
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
                label="Active"
                value={(data.activeAssignments || 0).toLocaleString('en-IN')}
                hint="In progress or paused"
                color={data.activeAssignments > 0 ? 'green' : 'slate'}
                icon="⚡"
                onClick={() => router.push('/resource/assignments?status=in_progress')}
              />
              <StatCard
                label="Completed"
                value={(data.completedAssignments || 0).toLocaleString('en-IN')}
                hint="All time"
                color="slate"
                icon="✓"
                onClick={() => router.push('/resource/assignments?status=completed')}
              />
              <StatCard
                label="Hours this week"
                value={hoursThisWeek.toFixed(1)}
                hint="Last 7 days"
                color={hoursThisWeek > 0 ? 'green' : 'slate'}
                icon="⏱"
                onClick={() => router.push('/resource/time-logs')}
              />
              <StatCard
                label="Total hours logged"
                value={(data.totalHoursLogged || 0).toLocaleString('en-IN')}
                hint="Lifetime"
                color="slate"
                icon="📊"
                onClick={() => router.push('/resource/time-logs')}
              />
            </div>

            {/* Today's queue + recent time logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SectionCard
                title="Your assignments"
                subtitle="Latest 5 — accept new ones, continue active work"
                action={
                  <Button size="sm" variant="subtle" onClick={() => router.push('/resource/assignments')}>
                    View all
                  </Button>
                }
                className="lg:col-span-2"
              >
                {assignments.length === 0 ? (
                  <EmptyState
                    title="No assignments yet"
                    description="Your PM will assign bookings to you. They'll show up here as soon as they do."
                  />
                ) : (
                  <div className="divide-y divide-[#EEF5EC] -mx-5">
                    {assignments.map((a) => (
                      <button
                        key={a._id}
                        type="button"
                        onClick={() => router.push(`/resource/assignments/${a._id}`)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#F7FBF6] transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="text-sm font-open-sauce-semibold text-[#26472B] truncate">
                              {s(a.customerName) || 'Customer'}
                            </div>
                            {!a.resourceAcceptedAt && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-open-sauce-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#636363] truncate">
                            {s(a.serviceName) || 'Service'}
                            {a.services?.[0]?.preferredStartDate && ` · ${new Date(a.services[0].preferredStartDate).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={a.status} />
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
                title="Recent time logs"
                subtitle="Last 5 entries"
                action={
                  <Button size="sm" variant="subtle" onClick={() => router.push('/resource/time-logs')}>
                    Log new
                  </Button>
                }
              >
                {recentLogs.length === 0 ? (
                  <EmptyState
                    title="No logs yet"
                    description="Log hours daily so you don't lose track."
                    action={
                      <Button variant="primary" size="sm" onClick={() => router.push('/resource/time-logs')}>
                        Log first entry
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {recentLogs.map((l) => (
                      <div
                        key={l._id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F7FBF6]"
                      >
                        <div className="min-w-0">
                          <div className="text-xs text-[#636363] truncate">
                            {new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="text-xs text-[#909090] truncate">
                            #{String(l.bookingId).slice(-6)}
                            {l.note && ` · ${l.note.slice(0, 30)}`}
                          </div>
                        </div>
                        <span className="text-sm font-open-sauce-bold text-[#26472B] tabular-nums flex-shrink-0">
                          {l.hours}h
                        </span>
                      </div>
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
