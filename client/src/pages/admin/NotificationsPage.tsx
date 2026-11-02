import React, { useState, useEffect } from "react";
import { notificationService } from "../../services/notificationService";
import { Notification } from "../../types";
import { RefreshCw, Check } from "lucide-react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { formatDateTime } from "../../utils/formatters";
import { Alert } from "../../components/common/Alert";

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

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

  const handleTriggerReminders = async () => {
    try {
      const res = await notificationService.triggerReminders();
      setTriggerMessage(res.message);
      loadNotifs();
      setTimeout(() => setTriggerMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Notifications & Reminders</h1>
          <p className="text-xs text-stone-500 mt-1">
            Automated session reminders and operational status alerts stored in SQLite.
          </p>
        </div>

        <button
          onClick={handleTriggerReminders}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl font-bold text-xs shadow-xs transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-ayur-700" /> Run Automated Reminder Scanner
        </button>
      </div>

      {triggerMessage && <Alert type="success">{triggerMessage}</Alert>}

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
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-stone-900">{n.title}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                      {n.type}
                    </span>
                  </div>
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
