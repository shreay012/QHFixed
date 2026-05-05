/**
 * Role + payload aware notification → route resolver.
 *
 * Backend sends notifications like:
 *   { type: 'BOOKING_CREATED' | 'CHAT_MESSAGE' | 'work_started' | …,
 *     data: { bookingId, jobId, roomId, … }, route?: 'optional override' }
 *
 * Each role lives under a different URL space — a customer's booking is at
 * /booking-ongoing/<id> while a PM sees the same booking at /pm/bookings/<id>.
 * `resolveNotificationRoute(notification, role)` returns the correct deep
 * link for the current viewer, falling back to /notifications if nothing
 * matches so the click is never a dead end.
 *
 * Used by both the realtime toast (SocketProvider) and the persisted
 * notifications list (/notifications) so click-through behaviour stays
 * consistent across surfaces.
 */

/**
 * @typedef {Object} NotificationLike
 * @property {string} [type]
 * @property {string} [route]    // explicit override the backend may set
 * @property {Object} [data]
 * @property {string} [bookingId] // some emit shapes flatten ids onto root
 * @property {string} [jobId]
 * @property {string} [roomId]
 */

const STAFF_ROLES = new Set([
  'admin',
  'super_admin',
  'ops',
  'finance',
  'support',
  'growth',
  'viewer',
]);

function pickBookingId(n) {
  const d = n?.data || {};
  // Some emitters put the id on `roomId` as `booking_<id>`
  const roomId = d.roomId || n?.roomId || '';
  const fromRoom = typeof roomId === 'string' && roomId.startsWith('booking_')
    ? roomId.slice('booking_'.length)
    : null;
  return (
    d.bookingId ||
    d.jobId ||
    n?.bookingId ||
    n?.jobId ||
    fromRoom ||
    null
  );
}

function bookingPathForRole(role, bookingId) {
  if (!bookingId) return null;
  if (role === 'pm') return `/pm/bookings/${bookingId}`;
  if (role === 'resource') return `/resource/assignments/${bookingId}`;
  if (STAFF_ROLES.has(role)) return `/admin/bookings/${bookingId}`;
  // default: customer
  return `/booking-workspace/${bookingId}`;
}

/**
 * @param {NotificationLike} notification
 * @param {string} [role]   user's current role (defaults to 'user')
 * @returns {string|null}   target path or null if nothing useful resolves
 */
export function resolveNotificationRoute(notification, role = 'user') {
  if (!notification) return null;

  // Backend explicit override wins
  if (notification.route && typeof notification.route === 'string') {
    return notification.route;
  }

  const type = String(notification.type || '').toLowerCase();
  const bookingId = pickBookingId(notification);

  // Chat-class events route to the booking page (chat panel lives there)
  if (
    type === 'chat_message' ||
    type === 'message' ||
    type.startsWith('chat:') ||
    type.startsWith('message:')
  ) {
    const path = bookingPathForRole(role, bookingId);
    if (path) return path;
    return '/chat';
  }

  // Booking lifecycle, PM/resource workflow events
  if (
    type.startsWith('booking_') ||
    type.startsWith('booking:') ||
    type === 'booking_assigned' ||
    type === 'pm_declined' ||
    type === 'work_started' ||
    type === 'work_paused' ||
    type === 'work_resumed' ||
    type === 'booking_completed' ||
    type === 'booking_update' ||
    type === 'booking_paid'
  ) {
    return bookingPathForRole(role, bookingId) || '/notifications';
  }

  // Payment events — customer goes to their bookings list, staff to admin payments
  if (type.startsWith('payment') || type.startsWith('refund')) {
    if (STAFF_ROLES.has(role)) return '/admin/payments';
    return bookingPathForRole(role, bookingId) || '/profile';
  }

  // Ticket / support
  if (type.startsWith('ticket')) {
    if (STAFF_ROLES.has(role)) return '/admin/tickets';
    return '/support-chat';
  }

  // Last-resort: known booking id with no specific type → role booking page
  if (bookingId) {
    const path = bookingPathForRole(role, bookingId);
    if (path) return path;
  }

  return '/notifications';
}

/**
 * Read the current user role from localStorage. Centralised here so callers
 * (toast + list) stay in sync. Falls back to 'user' for anonymous browsing.
 */
export function readCurrentRole() {
  if (typeof window === 'undefined') return 'user';
  try {
    const raw = window.localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.role) return String(u.role);
    }
  } catch { /* ignore parse errors */ }
  // staff sessions sometimes mark role via userType
  const userType = window.localStorage.getItem('userType');
  if (userType) return String(userType);
  return 'user';
}
