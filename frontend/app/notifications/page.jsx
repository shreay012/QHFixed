"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useI18nRouter } from "@/lib/hooks/useI18nRouter";
import { notificationsService } from "@/lib/services/notificationsApi";
import chatSocketService from "@/lib/services/chatSocketService";
import {
  resolveNotificationRoute,
  readCurrentRole,
} from "@/lib/utils/notificationRoute";
import { useTranslations } from "next-intl";

export const dynamic = "force-dynamic";

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function normalize(n) {
  if (!n) return null;
  return {
    id: n._id || n.id || n.messageId || `${Date.now()}-${Math.random()}`,
    title: n.title || "Notification",
    message: n.body || n.message || "",
    type: (n.type || "info").toString().toLowerCase().includes("cancel")
      ? "warning"
      : (n.type || "").toString().toLowerCase().includes("complete")
      ? "success"
      : (n.type || "").toString().toLowerCase().includes("error")
      ? "error"
      : "info",
    read: Boolean(n.read),
    time: formatTime(n.createdAt || n.time),
    raw: n,
  };
}

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const router = useI18nRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationsService.getAllNotifications(1, 30);
      const items = res?.data?.data || res?.data || [];
      setNotifications(items.map(normalize).filter(Boolean));
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates from the global socket connection.
  useEffect(() => {
    const previous = chatSocketService.callbacks?.onNotificationReceived;
    const handler = (data) => {
      const n = normalize(data);
      if (n) setNotifications((prev) => [n, ...prev]);
      if (typeof previous === "function") {
        try {
          previous(data);
        } catch (e) {
          console.error("previous notification callback error", e);
        }
      }
    };
    if (chatSocketService.callbacks) {
      chatSocketService.callbacks.onNotificationReceived = handler;
    }
    return () => {
      if (chatSocketService.callbacks) {
        chatSocketService.callbacks.onNotificationReceived = previous;
      }
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      await notificationsService.deleteNotification(id);
    } catch (e) {
      console.error("Failed to mark notification read", e);
    }
  };

  // Click on a notification → mark read (if unread) AND deep-link to the
  // related entity. Without this the user has no way to reach the booking,
  // chat, or payment that the notification was actually about.
  const handleOpenNotification = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    const target = resolveNotificationRoute(notification.raw, readCurrentRole());
    if (target) {
      router.push(target);
    }
  };

  const handleClearAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsService.markAllRead();
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1
            style={{
              color: "#000000",
              fontWeight: "var(--font-weight-600)",
              fontSize: "var(--font-size-24)",
            }}
            className="text-2xl sm:text-3xl"
          >
            {t("title")}
          </h1>
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-[#45A735] hover:text-[#3d9230] font-medium"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="py-16 text-center text-gray-500">{t("loading")}</div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Image
                src="/images/notification/notificationpage.png"
                alt="No Notifications"
                width={190}
                height={150}
                className="mb-4"
              />
              <p
                style={{
                  color: "#242424",
                  fontWeight: "var(--font-weight-600)",
                  fontSize: "var(--font-size-16)",
                }}
                className="mb-2"
              >
                {t("empty")}
              </p>
              <p
                style={{
                  color: "#484848",
                  fontWeight: "var(--font-weight-400)",
                  fontSize: "var(--font-size-14)",
                }}
              >
                {t("emptyDesc")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => handleOpenNotification(notification)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenNotification(notification);
                    }
                  }}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          notification.type === "success" ? "bg-green-100" : ""
                        } ${
                          notification.type === "info" ? "bg-blue-100" : ""
                        } ${
                          notification.type === "warning" ? "bg-yellow-100" : ""
                        } ${
                          notification.type === "error" ? "bg-red-100" : ""
                        }`}
                      >
                        <svg
                          className={`w-6 h-6 ${
                            notification.type === "success"
                              ? "text-green-600"
                              : notification.type === "warning"
                              ? "text-yellow-600"
                              : notification.type === "error"
                              ? "text-red-600"
                              : "text-blue-600"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              notification.type === "success"
                                ? "M5 13l4 4L19 7"
                                : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            }
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-[#45A735] rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-gray-600 mt-2">{notification.message}</p>
                      )}
                      {notification.time && (
                        <p className="text-sm text-gray-400 mt-2">{notification.time}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
