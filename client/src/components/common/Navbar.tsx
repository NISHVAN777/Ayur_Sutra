import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Bell, Sparkles, LogOut, User as UserIcon, Check } from "lucide-react";
import { notificationService } from "../../services/notificationService";
import { Notification } from "../../types";
import { formatDateTime } from "../../utils/formatters";
import { Logo } from "./Logo";

interface NavbarProps {
  onOpenAIModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAIModal }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);

  const fetchNotifs = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      fetchNotifs();
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200/80 px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between">
        {/* Brand with clean English Logo */}
        <Logo size="md" />

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* AI Assistant Quick Button */}
          {onOpenAIModal && (
            <button
              onClick={onOpenAIModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-saffron-500 to-saffron-600 text-white shadow-sm hover:from-saffron-600 hover:to-saffron-700 transition-all transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Ayurveda AI</span>
            </button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-stone-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-serif">
                    Notifications
                  </h4>
                  <span className="text-[11px] text-stone-500">{unreadCount} unread</span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition-colors hover:bg-stone-50 ${
                          !n.isRead ? "bg-ayur-50/40" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-stone-900">{n.title}</div>
                          {!n.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="text-ayur-700 hover:text-ayur-900 text-[10px] font-medium flex items-center gap-0.5 shrink-0"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" /> Mark read
                            </button>
                          )}
                        </div>
                        <p className="text-stone-600 mt-1 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-stone-400 mt-1 block">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile info */}
          <div className="flex items-center gap-3 pl-2 sm:border-l border-stone-200">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-stone-900">{user?.name}</div>
              <div className="text-[10px] font-semibold text-ayur-700 uppercase tracking-wider">
                {user?.role}
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-ayur-100 border border-ayur-200 text-ayur-800 flex items-center justify-center font-bold text-xs shadow-inner">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
