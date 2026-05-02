'use client';

import staffApi from '@/lib/axios/staffApi';

/**
 * Trigger a browser download of an authenticated CSV (or any blob)
 * endpoint. Uses staffApi so the Bearer token + base URL are applied
 * exactly like every other admin call — `window.open()` would lose
 * the Authorization header and 401.
 *
 * Usage:
 *   await downloadAuthed('/admin/payments.csv?status=paid', 'payments.csv');
 *
 * @param {string} path     Relative path (joined to staffApi baseURL)
 * @param {string} filename Suggested filename for the browser save dialog
 */
export async function downloadAuthed(path, filename) {
  const res = await staffApi.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Yield to the browser so the click is processed before we yank the
  // href out from under it. 0ms is enough on every engine; we use a
  // microtask-equivalent via setTimeout for cross-browser predictability.
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}
