'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import chatSocketService from '@/lib/services/chatSocketService';
import { getCurrentUser } from '@/lib/utils/userHelpers';
import { resolveNotificationRoute } from '@/lib/utils/notificationRoute';
import { withCountryPrefix } from '@/lib/utils/i18nLink';
import {
  playNotificationSound,
  unlockNotificationSound,
} from '@/lib/utils/notificationSound';

// Resolve the active session — accepts both customer (`token` / `user`) and
// staff (`qh_staff_token` / `qh_staff_user`) credentials. Staff sessions take
// precedence so a logged-in admin/PM/resource never falls back to a stale
// customer token left in storage.
function readActiveSession() {
  if (typeof window === 'undefined') return null;
  try {
    const staffToken = localStorage.getItem('qh_staff_token');
    if (staffToken) {
      const raw = localStorage.getItem('qh_staff_user');
      const user = raw ? JSON.parse(raw) : null;
      if (user && (user._id || user.id)) {
        return { user, token: staffToken, kind: 'staff' };
      }
    }
  } catch { /* ignore */ }
  const user = getCurrentUser();
  const token = localStorage.getItem('token');
  if (user && token) return { user, token, kind: 'customer' };
  return null;
}

// Resolve socket base URL from environment — NEVER hardcode localhost
const SOCKET_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin) ||
  'http://localhost:4000';

const SocketContext = createContext({
  isConnected: false,
  notifications: [],
});

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userState, setUserState] = useState(null);

  // De-dupe ring: chatSocketService fires the SocketProvider callback AND
  // dispatches a `newNotification` window event on every `notification:new`.
  // We listen to both so a clobbered callback (e.g. some other component
  // overrides chatSocketService.callbacks.onNotificationReceived) can never
  // silently drop notifications — but each notification must only render
  // once. Track the last 50 ids we've already toasted.
  const seenNotificationIdsRef = useRef(new Set());
  const seenNotificationOrderRef = useRef([]);

  // Monitor localStorage for session changes (customer + staff login / logout)
  // SOCKET_RECONNECT_FIX_V1: only update userState when the underlying identity
  // actually changes (user._id or token string). Previously every checkUser
  // call produced a new object reference, which made the connect-effect below
  // re-run on every storage event and clobbered ChatPanel's onMessageReceived
  // callback — so chat messages stopped appearing on the chat screen.
  useEffect(() => {
    // Arm the audio context on the first user gesture so notification chimes
    // play under the browser's autoplay policy.
    unlockNotificationSound();

    const checkUser = () => {
      const session = readActiveSession();

      setUserState((prev) => {
        if (!session) return prev === null ? prev : null;
        const nextId = session.user?._id || session.user?.id;
        const prevId = prev?.user?._id || prev?.user?.id;
        if (
          prev &&
          prevId === nextId &&
          prev.token === session.token &&
          prev.kind === session.kind
        ) {
          return prev; // identity unchanged → keep ref stable, no reconnect
        }
        return session;
      });
    };

    checkUser();

    // Re-check whenever the user navigates back to the tab. Long sleeps /
    // tab-switching can let the underlying socket drop silently — this nudges
    // the connect effect to reconnect with fresh credentials so a logged-in
    // PM/admin/customer never has a "phantom" disconnected provider while
    // they're working in another window.
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkUser();
      }
    };
    window.addEventListener('storage', checkUser);
    window.addEventListener('userLoggedIn', checkUser);
    // Staff portals dispatch this so same-tab staff login still triggers a
    // socket connect (storage events only fire across tabs).
    window.addEventListener('staffLoggedIn', checkUser);
    window.addEventListener('focus', checkUser);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userLoggedIn', checkUser);
      window.removeEventListener('staffLoggedIn', checkUser);
      window.removeEventListener('focus', checkUser);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Render an incoming notification (toast + sound + browser push + state).
  // Same logic runs whether the notification arrived via the chatSocketService
  // callback OR via the `newNotification` window event — and the de-dupe ring
  // ensures it only fires once per messageId either way. Defined as a stable
  // ref so we don't need to thread `userState` through callbacks.
  const userStateRef = useRef(userState);
  useEffect(() => { userStateRef.current = userState; }, [userState]);

  const renderIncomingNotification = (data) => {
    if (!data) return;

    // De-dupe — chatSocketService fires both a callback AND a window event
    // for every notification:new. Without this guard the toast would render
    // twice and the chime would play twice for each push.
    const dedupeId = String(
      data.messageId || data._id || data.id ||
      `${data.type || 'evt'}_${data.createdAt || ''}_${data.title || ''}`,
    );
    const seen = seenNotificationIdsRef.current;
    if (seen.has(dedupeId)) return;
    seen.add(dedupeId);
    seenNotificationOrderRef.current.push(dedupeId);
    if (seenNotificationOrderRef.current.length > 50) {
      const evicted = seenNotificationOrderRef.current.shift();
      seen.delete(evicted);
    }

    // Audible chime on every incoming notification (regardless of role)
    playNotificationSound();

    const title = data.title || 'New Notification';
    const body = data.message || data.body || '';
    // Resolve the deep link the user should land on if they tap this toast.
    // The route depends on BOTH the payload (bookingId/jobId/roomId) and the
    // current role — e.g. a CHAT_MESSAGE for booking #123 lands a customer
    // on /booking-workspace/123 but a PM on /pm/bookings/123.
    const role = userStateRef.current?.user?.role || 'user';
    // Apply the active country prefix so an in-DE user clicking a toast on
     // any page lands on /de/booking-workspace/<id> directly instead of being
     // redirected by the proxy.
    const baseRoute = resolveNotificationRoute(data, role);
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const targetRoute = withCountryPrefix(baseRoute, currentPath);
    // Render via react-hot-toast (the global <Toaster /> is mounted in
    // ClientProviders). Custom node so we can show title + body.
    toast.custom(
      (t) => (
        <div
          role="button"
          tabIndex={0}
          className={`bg-white rounded-xl shadow-lg p-4 flex items-start gap-3 max-w-sm ring-1 ring-[#E5F1E2] cursor-pointer hover:ring-[#C7E2C0] transition ${
            t.visible ? 'animate-enter' : 'animate-leave'
          }`}
          onClick={() => {
            toast.dismiss(t.id);
            if (targetRoute && typeof window !== 'undefined') {
              // Hard navigation rather than next/router so this works
              // identically from staff and customer trees (the provider is
              // mounted at the root and doesn't have a router instance
              // bound to a specific layout).
              window.location.assign(targetRoute);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              toast.dismiss(t.id);
              if (targetRoute && typeof window !== 'undefined') {
                window.location.assign(targetRoute);
              }
            }
          }}
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#F2F9F1] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#45A735]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#26472B] truncate">{title}</p>
            {body ? <p className="text-xs text-[#636363] mt-0.5 break-words">{body}</p> : null}
          </div>
        </div>
      ),
      { duration: 5000, position: 'top-right' },
    );

    setNotifications((prev) => [
      ...prev,
      {
        id: data.messageId || Date.now(),
        type: data.type,
        title: data.title,
        message: data.message,
        route: data.route,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        serviceId: data.serviceId,
        createdAt: new Date(),
        read: false,
      },
    ]);

    // Browser push notification (only if permission already granted)
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(data.title || 'New Notification', {
        body: data.message,
        icon: '/favicon.svg',
      });
    }
  };

  // Defensive backup: chatSocketService.connect() preserves its callbacks
  // across reconnects, but if some other component ever overwrites
  // `onNotificationReceived` (intentionally or not), we still need toasts to
  // fire on every page for every logged-in role. chatSocketService
  // unconditionally dispatches a `newNotification` window event for every
  // `notification:new` it receives — so we listen for that here as a second
  // delivery path. The de-dupe ring inside renderIncomingNotification keeps
  // this from double-toasting when both the callback AND the event fire.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onWindowNotification = (e) => {
      renderIncomingNotification(e?.detail);
    };
    window.addEventListener('newNotification', onWindowNotification);
    return () => window.removeEventListener('newNotification', onWindowNotification);
  }, []); // renderIncomingNotification reads userStateRef + closure-stable refs

  // Connect / reconnect whenever userState changes
  useEffect(() => {
    if (!userState) return;

    const { user, token } = userState;

    chatSocketService.connect({
      baseUrl: SOCKET_BASE_URL,
      path: '/api/socket.io',
      roomId: user._id,
      userId: user._id,
      serviceId: null,
      authToken: token,

      onNotificationReceived: renderIncomingNotification,

      // SOCKET_CALLBACK_PRESERVE_FIX_V1: don't pass onMessageReceived /
      // onError here. chatSocketService preserves any existing callback when
      // the new config omits it — that lets ChatPanel keep its own message
      // handler across SocketProvider reconnects.

      onConnected: () => {
        setIsConnected(true);
      },

      onDisconnected: () => {
        setIsConnected(false);
      },
    });

    // Request browser notification permission on first connect
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }

    // Cleanup handled by logout flow, not unmount, to prevent ghost disconnects
  }, [userState]);

  return (
    <SocketContext.Provider value={{ isConnected, notifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
