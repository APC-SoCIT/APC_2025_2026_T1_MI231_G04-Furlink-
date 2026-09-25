'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";

type Notification = {
  id: string;
  type: string;
  title?: string;
  message: string;
  read: boolean;
  created_at: string;
  channel?: string;
};

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return 'Just now';
  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) return `${daysAgo}d ago`;
  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 4) return `${weeksAgo}w ago`;
  const monthsAgo = Math.floor(daysAgo / 30);
  return `${monthsAgo}mo ago`;
};

const getNotificationRoute = (type: string): string => {
  switch (type) {
    case 'admin_new_application':
    case 'admin_resubmitted_application':
      return ROUTES.ADMIN.ADMIN_DASHBOARD;

    case 'sp_application_approved':
      return ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD;
    case 'sp_application_rejected':
      return ROUTES.SERVICE_PROVIDER.ONBOARDING;

    case 'sp_new_booking':
    case 'sp_po_rescheduled':
    case 'sp_po_cancelled':
    case 'sp_new_review':
      return ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD;

    case 'po_booking_status_update':
    case 'po_sp_cancelled':
    case 'po_booking_completed':
      return ROUTES.PET_OWNER.MANAGE_BOOKING;

    case 'account_warning':
      return ROUTES.AUTH.MANAGE_ACCOUNT;

    default:
      return ROUTES.HOME;
  }
};

export default function NotificationsDropdown({ onClose }: { onClose?: () => void }) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    let isActive = true;

    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isActive) return;

        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .neq("channel", "email_only")
          .order("created_at", { ascending: false });

        if (isActive && notifData) {
          const unreadList = notifData.filter(n => !n.read);
          const readList = notifData.filter(n => n.read).slice(0, 10);
          
          const combined = Array.from(
            new Map([...unreadList, ...readList].map(item => [item.id, item])).values()
          ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          setNotifications(combined);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isActive = true;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isActive) return;

      const topic = `notifications-${user.id}`;
      const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
      if (stale) {
        await supabase.removeChannel(stale);
      }

      if (!isActive) return;

      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            
            if (newNotif.channel === 'email_only') return;

            if (payload.eventType === "INSERT") {
              setNotifications((prev) => {
                const updated = [newNotif, ...prev];
                const unreadList = updated.filter(n => !n.read);
                const readList = updated.filter(n => n.read).slice(0, 10);
                
                return Array.from(
                  new Map([...unreadList, ...readList].map(item => [item.id, item])).values()
                ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              });
            } else if (payload.eventType === "UPDATE") {
              setNotifications((prev) => {
                const updated = prev.map((n) => (n.id === newNotif.id ? newNotif : n));
                const unreadList = updated.filter(n => !n.read);
                const readList = updated.filter(n => n.read).slice(0, 10);
                
                return Array.from(
                  new Map([...unreadList, ...readList].map(item => [item.id, item])).values()
                ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              });
            } else if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as Notification).id;
              setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      isActive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleNotifClick = async (notif: Notification) => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
      
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
        const unreadList = updated.filter(n => !n.read);
        const readList = updated.filter(n => n.read).slice(0, 10);
        
        return Array.from(
          new Map([...unreadList, ...readList].map(item => [item.id, item])).values()
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });

      if (onClose) onClose();

      const destination = getNotificationRoute(notif.type);
      router.push(destination);
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        return updated.slice(0, 10);
      });
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  return (
    <div className="notif-dropdown">
      <div className="notif-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button className="notif-mark-read" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>
      <div className="notif-list">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${!n.read ? "unread" : ""}`}
              onClick={() => handleNotifClick(n)}
            >
              <div className="notif-title-row">
                <span className="notif-title">{n.title}</span>
                <span className="notif-date">{getTimeAgo(n.created_at)}</span>
              </div>
              <p className="notif-message">{n.message}</p>
            </div>
          ))
        ) : (
          <div className="notif-empty">All caught up!</div>
        )}
      </div>
    </div>
  );
}