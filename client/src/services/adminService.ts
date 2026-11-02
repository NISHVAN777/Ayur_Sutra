import { api } from "./api";
import { DashboardStats, TherapySession, TherapyCourse, Notification } from "../types";

export const adminService = {
  async getDashboard(): Promise<{
    date: string;
    stats: DashboardStats;
    todaySessions: TherapySession[];
    activeCourses: Array<{
      id: string;
      therapyName: string;
      patientName: string;
      durationDays: number;
      startDate: string;
      progressPercentage: number;
      completedSessions: number;
      status: string;
    }>;
    upcomingSessions: TherapySession[];
    recentActivity: Notification[];
  }> {
    const response = await api.get("/admin/dashboard");
    return response.data;
  },

  async getReports(): Promise<{
    summary: {
      totalCourses: number;
      totalSessions: number;
      sessionStatusCounts: { SCHEDULED: number; COMPLETED: number; MISSED: number; CANCELLED: number };
      therapyDistribution: Record<string, number>;
      therapistWorkload: Array<{ name: string; completed: number; scheduled: number }>;
    };
  }> {
    const response = await api.get("/admin/reports");
    return response.data;
  },

  async getTherapistAvailability(id: string) {
    const response = await api.get(`/admin/therapists/${id}/availability`);
    return response.data;
  },

  async updateTherapistAvailability(id: string, data: {
    workingDays?: number[];
    workingHoursStart?: string;
    workingHoursEnd?: string;
    weeklyOff?: number | null;
  }) {
    const response = await api.put(`/admin/therapists/${id}/availability`, data);
    return response.data;
  },

  async getTherapistLeaves(id: string) {
    const response = await api.get(`/admin/therapists/${id}/leaves`);
    return response.data;
  },

  async createTherapistLeave(id: string, data: { startDate: string; endDate: string; reason?: string }) {
    const response = await api.post(`/admin/therapists/${id}/leaves`, data);
    return response.data;
  },

  async deleteTherapistLeave(leaveId: string) {
    const response = await api.delete(`/admin/leaves/${leaveId}`);
    return response.data;
  },

  async getCompatibility() {
    const response = await api.get("/admin/compatibility");
    return response.data;
  },

  async addCompatibility(data: { procedureName: string; roomId: string }) {
    const response = await api.post("/admin/compatibility", data);
    return response.data;
  },

  async deleteCompatibility(id: string) {
    const response = await api.delete(`/admin/compatibility/${id}`);
    return response.data;
  },
};
