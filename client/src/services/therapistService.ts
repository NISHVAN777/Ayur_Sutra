import { api } from "./api";
import { Therapist, TherapySession } from "../types";

export const therapistService = {
  async getAll(): Promise<{ therapists: Therapist[]; count: number }> {
    const response = await api.get("/therapists");
    return response.data;
  },

  async getProfile(id: string): Promise<{ profile: Therapist }> {
    const response = await api.get(`/therapists/${id}/profile`);
    return response.data;
  },

  async create(data: {
    name: string;
    email: string;
    password?: string;
    specialization: string;
    phone: string;
    experience: string;
    avatarUrl?: string;
    bio?: string;
  }): Promise<{ therapist: Therapist; message: string }> {
    const response = await api.post("/therapists", data);
    return response.data;
  },

  async getDashboard(): Promise<{
    date: string;
    stats: {
      todayTotal: number;
      todayCompleted: number;
      todayPending: number;
      allTimeCompleted: number;
    };
    nextSession?: TherapySession;
    todaySessions: TherapySession[];
  }> {
    const response = await api.get("/therapist/dashboard");
    return response.data;
  },

  async getSessions(): Promise<{ sessions: TherapySession[]; count: number }> {
    const response = await api.get("/therapist/sessions");
    return response.data;
  },

  async getHistory(): Promise<{ history: TherapySession[]; count: number }> {
    const response = await api.get("/therapist/history");
    return response.data;
  },

  async getPatientTherapyPlan(patientId: string): Promise<{
    patient: any;
    activeCourse: any;
    courses: any[];
  }> {
    const response = await api.get(`/therapist/patients/${patientId}/therapy-plan`);
    return response.data;
  },
};

