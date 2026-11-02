import { api } from "./api";
import { Patient, TherapyCourse, TherapySession, Notification } from "../types";

export const patientService = {
  // Admin: get all patients with search
  async getAll(search?: string): Promise<{ patients: Patient[]; count: number }> {
    const response = await api.get("/patients", { params: { search } });
    return response.data;
  },

  async getById(id: string): Promise<{ patient: Patient }> {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },

  async create(data: any): Promise<{ patient: Patient }> {
    const response = await api.post("/patients", data);
    return response.data;
  },

  async update(id: string, data: any): Promise<{ patient: Patient }> {
    const response = await api.put(`/patients/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
  },

  // Patient Self Portal Endpoints
  async getDashboard(): Promise<{
    patient: { id: string; name: string; email: string; phone: string; medicalNotes: string | null };
    activeCourse: TherapyCourse | null;
    stats: {
      progressPercentage: number;
      completedSessions: number;
      remainingSessions: number;
      totalSessions: number;
      currentDayDisplay: string;
      hasActiveCourse: boolean;
    };
    nextSession: TherapySession | null;
    recentNotifications: Notification[];
  }> {
    const response = await api.get("/patient/dashboard");
    return response.data;
  },

  async getCourse(): Promise<{ activeCourse: TherapyCourse | null }> {
    const response = await api.get("/patient/course");
    return response.data;
  },

  async getSessions(): Promise<{ sessions: TherapySession[]; count: number }> {
    const response = await api.get("/patient/sessions");
    return response.data;
  },

  async getHistory(): Promise<{ history: TherapySession[]; count: number }> {
    const response = await api.get("/patient/history");
    return response.data;
  },
};
