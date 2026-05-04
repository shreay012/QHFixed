'use client';

import { useSearchParams } from 'next/navigation';
import QuickServiceForm from '../_quick-form';
import ServiceFormPage from '../_form';

// Default: simple flat form (covers 80% of use cases). Append
// `?advanced=1` to the URL to load the legacy 6-tab multi-language editor.
export default function NewServicePage() {
  const sp = useSearchParams();
  const advanced = sp?.get('advanced') === '1';
  if (advanced) return <ServiceFormPage serviceId={null} initialData={null} />;
  return <QuickServiceForm serviceId={null} initialData={null} />;
}
