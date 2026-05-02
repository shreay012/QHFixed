'use client';

import { useEffect, useState, useMemo } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Spinner, ErrorBox, Button, StickyActionBar } from '@/components/staff/ui';
import { showSuccess, showError } from '@/lib/utils/toast';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_CONFIG = {
  maxBookingsPerDay: 20,
  advanceBookingDays: 30,
  minLeadTimeHours: 2,
  autoAssignPM: false,
  autoAssignResource: false,
  cancellationWindowHours: 24,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
};

// ─── Toggle switch ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#45A735] focus-visible:ring-offset-2 ${
        checked ? 'bg-[#45A735]' : 'bg-[#D1D5DB]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E5F1E2] bg-[#F2F9F1]">
        <h2 className="text-sm font-open-sauce-semibold text-[#26472B] uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

// ─── Field label + hint row ───────────────────────────────────────────────────
function Field({ label, hint, htmlFor, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
      <div className="sm:w-64 flex-shrink-0">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-open-sauce-semibold text-[#26472B]"
        >
          {label}
        </label>
        {hint && (
          <p className="text-xs text-[#909090] font-open-sauce mt-0.5">{hint}</p>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Number input ─────────────────────────────────────────────────────────────
function NumInput({ id, value, onChange, min = 0, max, suffix }) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28 border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735]"
      />
      {suffix && (
        <span className="text-xs text-[#636363] font-open-sauce">{suffix}</span>
      )}
    </div>
  );
}

// ─── Time input ───────────────────────────────────────────────────────────────
function TimeInput({ id, value, onChange }) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-36 border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#242424] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735]"
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminSchedulingPage() {
  const [rawConfig, setRawConfig] = useState(null); // full server response preserved
  const [form, setForm] = useState(DEFAULT_CONFIG);
  // Snapshot of the form right after the most recent successful load /
  // save. Used to compute the "Unsaved changes" indicator that drives
  // the sticky action bar status.
  const [savedSnapshot, setSavedSnapshot] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedSnapshot), [form, savedSnapshot]);

  // Load config on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await staffApi.get('/admin/scheduling-config');
        const config = r.data?.data?.config ?? {};
        setRawConfig(config);
        const next = {
          maxBookingsPerDay: config.maxBookingsPerDay ?? DEFAULT_CONFIG.maxBookingsPerDay,
          advanceBookingDays: config.advanceBookingDays ?? DEFAULT_CONFIG.advanceBookingDays,
          minLeadTimeHours: config.minLeadTimeHours ?? DEFAULT_CONFIG.minLeadTimeHours,
          autoAssignPM: config.autoAssignPM ?? DEFAULT_CONFIG.autoAssignPM,
          autoAssignResource: config.autoAssignResource ?? DEFAULT_CONFIG.autoAssignResource,
          cancellationWindowHours:
            config.cancellationWindowHours ?? DEFAULT_CONFIG.cancellationWindowHours,
          workingHoursStart: config.workingHoursStart ?? DEFAULT_CONFIG.workingHoursStart,
          workingHoursEnd: config.workingHoursEnd ?? DEFAULT_CONFIG.workingHoursEnd,
          workingDays: Array.isArray(config.workingDays)
            ? config.workingDays
            : DEFAULT_CONFIG.workingDays,
        };
        setForm(next);
        setSavedSnapshot(next);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day) => {
    const days = form.workingDays.includes(day)
      ? form.workingDays.filter((d) => d !== day)
      : [...form.workingDays, day];
    // Preserve canonical order
    set('workingDays', ALL_DAYS.filter((d) => days.includes(d)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Spread rawConfig first so any unknown server fields are preserved
      const body = { ...(rawConfig ?? {}), ...form };
      await staffApi.put('/admin/scheduling-config', body);
      setRawConfig(body);
      setSavedSnapshot(form); // mark current form as the new "saved" baseline
      setJustSaved(true);
      // Clear the "Saved ✓" flash after a few seconds so the bar returns
      // to its idle state if the user lingers without making changes.
      setTimeout(() => setJustSaved(false), 4000);
      showSuccess('Scheduling config saved.');
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed to save scheduling config.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm(savedSnapshot);
    setJustSaved(false);
  };

  return (
    <div>
      <PageHeader
        title="Scheduling Configuration"
        subtitle="Control booking rules and availability windows"
        helpText="These rules apply globally. Changes affect every customer's booking flow on the next page load."
      />

      <div className="p-4 sm:p-8 space-y-6">
        {/* Loading state */}
        {loading && <Spinner />}

        {/* Error state */}
        {!loading && error && <ErrorBox error={error} />}

        {/* Form — only rendered once config has loaded */}
        {!loading && !error && (
          <>
            {/* ── Availability ────────────────────────────────────────── */}
            <Section title="Availability">
              <Field
                label="Working Hours"
                hint="Start and end time for each working day."
                htmlFor="workingHoursStart"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <TimeInput
                    id="workingHoursStart"
                    value={form.workingHoursStart}
                    onChange={(v) => set('workingHoursStart', v)}
                  />
                  <span className="text-sm text-[#636363] font-open-sauce">to</span>
                  <TimeInput
                    id="workingHoursEnd"
                    value={form.workingHoursEnd}
                    onChange={(v) => set('workingHoursEnd', v)}
                  />
                </div>
              </Field>

              <div className="border-t border-[#E5F1E2]" />

              <Field
                label="Working Days"
                hint="Days of the week when bookings are accepted."
              >
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => {
                    const active = form.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-open-sauce-semibold border transition-all duration-150 ${
                          active
                            ? 'bg-[#45A735] text-white border-[#45A735] shadow-[0_2px_8px_rgba(69,167,53,0.25)]'
                            : 'bg-white text-[#636363] border-[#E5F1E2] hover:border-[#45A735] hover:text-[#45A735]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                {form.workingDays.length === 0 && (
                  <p className="text-xs text-red-500 font-open-sauce mt-1">
                    Select at least one working day.
                  </p>
                )}
              </Field>
            </Section>

            {/* ── Booking Rules ────────────────────────────────────────── */}
            <Section title="Booking Rules">
              <Field
                label="Max Bookings per Day"
                hint="System-wide cap on the number of bookings that can be accepted in a single day."
                htmlFor="maxBookingsPerDay"
              >
                <NumInput
                  id="maxBookingsPerDay"
                  value={form.maxBookingsPerDay}
                  onChange={(v) => set('maxBookingsPerDay', v)}
                  min={1}
                  suffix="bookings / day"
                />
              </Field>

              <div className="border-t border-[#E5F1E2]" />

              <Field
                label="Advance Booking Window"
                hint="How many days ahead of today a user is allowed to place a booking."
                htmlFor="advanceBookingDays"
              >
                <NumInput
                  id="advanceBookingDays"
                  value={form.advanceBookingDays}
                  onChange={(v) => set('advanceBookingDays', v)}
                  min={1}
                  suffix="days in advance"
                />
              </Field>

              <div className="border-t border-[#E5F1E2]" />

              <Field
                label="Minimum Lead Time"
                hint="Minimum number of hours that must remain before a booking start time when placing the request."
                htmlFor="minLeadTimeHours"
              >
                <NumInput
                  id="minLeadTimeHours"
                  value={form.minLeadTimeHours}
                  onChange={(v) => set('minLeadTimeHours', v)}
                  min={0}
                  suffix="hours"
                />
              </Field>

              <div className="border-t border-[#E5F1E2]" />

              <Field
                label="Cancellation Window"
                hint="How many hours before the booking start time a customer is still allowed to cancel."
                htmlFor="cancellationWindowHours"
              >
                <NumInput
                  id="cancellationWindowHours"
                  value={form.cancellationWindowHours}
                  onChange={(v) => set('cancellationWindowHours', v)}
                  min={0}
                  suffix="hours before start"
                />
              </Field>
            </Section>

            {/* ── Automation ───────────────────────────────────────────── */}
            <Section title="Automation">
              <Field
                label="Auto-assign Project Manager"
                hint="Automatically assign an available PM as soon as a booking is confirmed."
                htmlFor="autoAssignPM"
              >
                <div className="flex items-center gap-3">
                  <Toggle
                    id="autoAssignPM"
                    checked={form.autoAssignPM}
                    onChange={(v) => set('autoAssignPM', v)}
                  />
                  <span className="text-sm font-open-sauce text-[#636363]">
                    {form.autoAssignPM ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </Field>

              <div className="border-t border-[#E5F1E2]" />

              <Field
                label="Auto-assign Resource"
                hint="Automatically assign an available resource once the PM confirms the booking."
                htmlFor="autoAssignResource"
              >
                <div className="flex items-center gap-3">
                  <Toggle
                    id="autoAssignResource"
                    checked={form.autoAssignResource}
                    onChange={(v) => set('autoAssignResource', v)}
                  />
                  <span className="text-sm font-open-sauce text-[#636363]">
                    {form.autoAssignResource ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </Field>
            </Section>

          </>
        )}
      </div>

      {/* Sticky bottom bar — visible whenever the form has changed
          relative to the last successful save. Replaces the lonely
          "Save Changes" button at the end of the form so the user
          never has to scroll to find it on long config screens. */}
      {!loading && !error && (dirty || saving || justSaved) && (
        <StickyActionBar
          status={
            saving       ? 'Saving changes…' :
            justSaved    ? 'All changes saved' :
            dirty        ? 'You have unsaved changes' :
                           ''
          }
          statusKind={
            saving    ? 'saving' :
            justSaved ? 'saved'  :
            dirty     ? 'dirty'  :
                        'idle'
          }
        >
          <Button
            variant="ghost"
            size="md"
            onClick={handleDiscard}
            disabled={saving || !dirty}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving || !dirty || form.workingDays.length === 0}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </StickyActionBar>
      )}
    </div>
  );
}
