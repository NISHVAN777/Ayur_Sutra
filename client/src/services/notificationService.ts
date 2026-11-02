import { api } from "./api";
import { Notification } from "../types";

export const notificationService = {
  async getNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const response = await api.get("/notifications");
    return response.data;
  },

  async markAsRead(id: string): Promise<{ message: string }> {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async triggerReminders(): Promise<{ message: string }> {
    const response = await api.post("/notifications/trigger-reminders");
    return response.data;
  },
};
