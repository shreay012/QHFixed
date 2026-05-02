"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MessageInputBar from "./MessageInputBar";
import chatSocketService from "@/lib/services/chatSocketService";
import {
  getChatMessages,
  sendTextMessage,
  sendMessageWithAttachment,
  sendTypingStatus,
} from "@/lib/services/chatApi";
import {
  parseMessageData,
  getInitials,
  isMessageFromCurrentUser,
} from "@/lib/utils/chatHelpers";

const ChatPanel = ({
  projectTitle = "Development",
  serviceInfo = "Service Details",
  bookingId,
  adminId,
  serviceId,
  hourlyRate = "",
  currentUserId,
  authToken,
  // Socket.IO connects to the backend ORIGIN (path '/api/socket.io' is added separately).
  // Use NEXT_PUBLIC_BACKEND_URL (host without /api) so we don't end up with /api/api/socket.io.
  // BACKEND_URL_FIX_V1: NEXT_PUBLIC_API_URL is the canonical Vercel env var (matches SocketProvider).
  // Fallback to NEXT_PUBLIC_BACKEND_URL for back-compat with older deployments.
  baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000",
  triggerSocketConnect = 0, // Trigger from parent component
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [manualConnect, setManualConnect] = useState(true); // Auto-connect socket on mount

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const hasInitialized = useRef(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Fetch + parse chat messages. Two modes:
  //   • initial = true  → first load on mount: shows the spinner, fully replaces
  //                       state, surfaces network errors.
  //   • initial = false → silent poll/refresh: merges any genuinely new
  //                       messages into the existing array without touching
  //                       `loading`, so the chat window doesn't flicker /
  //                       reset its scroll position every poll tick.
  // The socket's `onMessageReceived` is the primary path for new messages —
  // this function exists only as a recovery mechanism when the socket is down
  // or briefly drops a server event.
  const loadMessages = useCallback(async (initial = true) => {
    if (!bookingId || !serviceId) {
      if (initial) {
        setError("Missing booking or service information");
        setLoading(false);
      }
      return;
    }

    if (initial) {
      setLoading(true);
      setError(null);
    }

    try {
      const customerId = adminId && adminId.trim() ? adminId : serviceId;
      // BOOKING_ID_PARAM_FIX_V1_FE: pass bookingId so server filters by booking_<id> room.
      const response = await getChatMessages(customerId, serviceId, bookingId);

      if (response.success && response.data) {
        const parsedMessages = response.data
          .map((msg) => {
            const parsed = parseMessageData(msg);
            parsed.isFromCurrentUser = isMessageFromCurrentUser(parsed.senderId, currentUserId);
            return parsed;
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        // Deduplicate by id
        const uniqueMessages = parsedMessages.filter(
          (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
        );

        if (initial) {
          setMessages(uniqueMessages);
        } else {
          // Merge: keep existing message identities (so React doesn't remount
          // every bubble + the scroll container doesn't snap), only push the
          // ones we don't already have.
          setMessages((prev) => {
            const seen = new Set();
            for (const m of prev) {
              if (m.id) seen.add(m.id);
              if (m.messageId) seen.add(m.messageId);
            }
            const additions = uniqueMessages.filter(
              (m) => !seen.has(m.id) && !seen.has(m.messageId),
            );
            if (additions.length === 0) return prev;
            return [...prev, ...additions].sort((a, b) => a.timestamp - b.timestamp);
          });
        }

        if (uniqueMessages.length > 0) {
          lastMessageIdRef.current = uniqueMessages[uniqueMessages.length - 1].id;
        }
      } else if (initial) {
        setMessages([]);
      }
    } catch (err) {
      if (!initial) return; // silent on background polls
      // Don't block UI for 500/404 — backend may not be ready
      if (err.response?.status === 500 || err.response?.status === 404) {
        setError(null);
        setMessages([]);
      } else {
        setError("Failed to load messages. Please try again.");
        setMessages([]);
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, [bookingId, adminId, serviceId, currentUserId]);

  // Polling is now ONLY a degraded-mode fallback. When the socket is
  // connected (the normal case), `onMessageReceived` already appends new
  // messages in real time — polling there is redundant and was causing the
  // visible "chat window auto-refresh" flicker. So:
  //   • socket connected    → no polling at all
  //   • socket disconnected → quiet 10s delta-merge poll until reconnect
  useEffect(() => {
    if (!bookingId || !serviceId) return;
    if (socketConnected) return;

    pollingIntervalRef.current = setInterval(() => {
      loadMessages(false);
    }, 10_000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [socketConnected, bookingId, serviceId, loadMessages]);

  // Initialize WebSocket connection
  const initializeSocket = useCallback(() => {
    if (!bookingId || !serviceId || !currentUserId) return;
    if (!authToken || authToken === "Bearer test-token-123") return;

    // GROUP_CHAT_FIX_V1: prefer booking-scoped room so customer + PM +
    // resource + admin converge. Fall back to legacy pairwise room only
    // when bookingId is missing (e.g. pre-booking service browsing).
    const groupRoomId = bookingId
      ? `booking_${bookingId}`
      : (adminId && adminId.trim() && adminId !== serviceId)
        ? `${adminId}_service_${serviceId}`
        : `service_${serviceId}_pending_${currentUserId}`;

    chatSocketService.connect({
      baseUrl,
      roomId: groupRoomId,
      userId: currentUserId,
      serviceId,
      authToken,
      onMessageReceived: (data) => {
        const newMessage = parseMessageData(data);
        newMessage.isFromCurrentUser = isMessageFromCurrentUser(newMessage.senderId, currentUserId);

        setMessages((prev) => {
          const exists = prev.some(
            (msg) => msg.id === newMessage.id || msg.messageId === newMessage.messageId,
          );
          if (exists) return prev;
          return [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp);
        });
      },
      onRefreshMessages: () => { loadMessages(false); },
      onConnected: () => { setSocketConnected(true); },
      onDisconnected: () => { setSocketConnected(false); },
      onError: () => { setSocketConnected(false); },
      onTypingStatusReceived: (senderId, isTyping, typingData) => {
        if (senderId === adminId && isTyping) {
          setIsTyping(true);
          setTypingUser({ name: typingData.userName || "PM", initials: getInitials(typingData.userName || "PM") });
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => { setIsTyping(false); setTypingUser(null); }, 5000);
        } else if (senderId === adminId && !isTyping) {
          setIsTyping(false);
          setTypingUser(null);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
      },
    });
  }, [bookingId, serviceId, currentUserId, adminId, authToken, baseUrl]);

  // Load messages and auto-connect socket on mount
  useEffect(() => {
    loadMessages();

    if (!hasInitialized.current && bookingId && serviceId && currentUserId && authToken) {
      hasInitialized.current = true;
      setTimeout(() => { initializeSocket(); }, 500);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [loadMessages, bookingId, serviceId, currentUserId, authToken, initializeSocket]);

  // Initialize socket when manual connect is triggered
  useEffect(() => {
    if (manualConnect && !hasInitialized.current) {
      hasInitialized.current = true;
      initializeSocket();
    }
  }, [manualConnect, initializeSocket]);

  // Watch for external trigger to connect socket
  useEffect(() => {
    if (triggerSocketConnect > 0) {
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        setManualConnect(true);
      }
    }
  }, [triggerSocketConnect]);

  // Handle sending text message
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const customerId = adminId && adminId.trim() ? adminId : serviceId;
    const firstMsg = !adminId || !adminId.trim() ? 1 : null;

    // Optimistic UI update
    const optimisticId = `temp_${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      senderName: "You",
      senderInitials: getInitials("You"),
      senderId: currentUserId,
      message: messageText,
      timestamp: new Date(),
      isFromCurrentUser: true,
      msgType: 0,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await sendTextMessage(customerId, messageText, serviceId, firstMsg, bookingId);

      if (response.success && response.data) {
        const actualMessage = parseMessageData(response.data);
        actualMessage.isFromCurrentUser = true;

        setMessages((prev) =>
          prev
            .filter((msg) => msg.id !== optimisticId)
            .concat(actualMessage)
            .sort((a, b) => a.timestamp - b.timestamp),
        );

        // Notify other participants via socket
        if (socketConnected) {
          chatSocketService.sendMessage({
            message: messageText,
            recipientId: adminId || serviceId,
            roomId: response.data.chatId?.toString() || bookingId,
            serviceId,
          });
        }

        setError(null);
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
        setError("Failed to send message.");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith("temp_")));
      setError("Failed to send message. Please check your connection.");
    }
  };

  // Handle sending attachment
  const handleSendAttachment = async (file) => {
    if (!file) return;
    try {
      const customerId = adminId && adminId.trim() ? adminId : serviceId;
      const firstMsg = !adminId || !adminId.trim() ? 1 : null;
      const response = await sendMessageWithAttachment(customerId, file, serviceId, "", 1, firstMsg, bookingId);
      if (response.success && response.data) {
        const newMessage = parseMessageData(response.data);
        newMessage.isFromCurrentUser = true;
        setMessages((prev) => [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setError("Failed to send attachment.");
      }
    } catch (err) {
      console.error("Error sending attachment:", err);
      setError("Failed to send attachment. Please try again.");
    }
  };

  // Handle typing status change
  const handleTypingChange = async (isTyping) => {
    if (!socketConnected) return;
    try {
      const customerId = adminId && adminId.trim() ? adminId : serviceId;
      chatSocketService.sendTypingStatus(isTyping, serviceId);
      await sendTypingStatus(customerId, isTyping, serviceId);
    } catch (_) { /* non-fatal */ }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Security Banner */}
      <div className="border-b border-gray-200 px-4 py-2">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Image
                src="/images/verifyIcon.svg"
                alt="Verified"
                width={20}
                height={20}
              />
            </div>
            <p className="text-sm text-gray-700">
              Secure & Protected
            </p>
          </div>
          <p className="text-[10px] sm:text-[11px] md:text-[12px] font-normal mt-0.5" style={{ color: '#909090' }}>
            Your conversations are encrypted and your data is always safe with
            us.
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#45A735]" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col justify-center items-center h-full text-gray-500">
            <p className="text-base font-normal text-gray-600">
              No messages yet.
            </p>
            <p className="text-base font-normal text-gray-600 mt-1">
              Start the conversation!
            </p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isFromCurrentUser={message.isFromCurrentUser}
              />
            ))}

            {isTyping && typingUser && (
              <TypingIndicator
                senderName={typingUser.name}
                senderInitials={typingUser.initials}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      <MessageInputBar
        onSendMessage={handleSendMessage}
        onSendAttachment={handleSendAttachment}
        onTypingChange={handleTypingChange}
        disabled={loading}
      />
    </div>
  );
};

export default ChatPanel;
