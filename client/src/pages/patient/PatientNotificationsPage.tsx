import React, { useState, useEffect } from "react";
import { notificationService } from "../../services/notificationService";
import { Notification } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { formatDateTime } from "../../utils/formatters";
import { Bell, Check } from "lucide-react";

export const PatientNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadNotifs = async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      loadNotifs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Your Notifications</h1>
        <p className="text-xs text-stone-500 mt-1">
          Automated session reminders and therapy completion notices.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">No notifications found.</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                  !n.isRead ? "bg-ayur-50/40" : "hover:bg-stone-50"
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs text-stone-900">{n.title}</h4>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-stone-400 mt-2 block">
                    {formatDateTime(n.createdAt)}
                  </span>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-2 text-stone-400 hover:text-ayur-800 rounded-lg hover:bg-stone-100 transition-colors shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
