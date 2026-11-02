import { api } from "./api";
import { TherapyCourse, AvailabilityResult } from "../types";

export const courseService = {
  async getAll(params?: {
    status?: string;
    patientId?: string;
  }): Promise<{ courses: TherapyCourse[]; count: number }> {
    const response = await api.get("/courses", { params });
    return response.data;
  },

  async getById(id: string): Promise<{ course: TherapyCourse }> {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  async checkAvailability(data: {
    durationDays: number;
    startDate: string;
    therapistId: string;
    roomId: string;
    sessionTime: string;
  }): Promise<AvailabilityResult> {
    const response = await api.post("/courses/check-availability", data);
    return response.data;
  },

  async create(data: {
    patientId: string;
    therapyName: string;
    description?: string;
    durationDays: number;
    startDate: string;
    therapistId: string;
    roomId: string;
    defaultSessionTime: string;
  }): Promise<{ course: TherapyCourse; message: string }> {
    const response = await api.post("/courses", data);
    return response.data;
  },

  async pause(id: string, reason?: string): Promise<{ course: TherapyCourse; message: string }> {
    const response = await api.patch(`/courses/${id}/pause`, { reason });
    return response.data;
  },

  async resume(id: string, reason?: string): Promise<{ course: TherapyCourse; message: string }> {
    const response = await api.patch(`/courses/${id}/resume`, { reason });
    return response.data;
  },

  async cancel(id: string): Promise<{ message: string }> {
    const response = await api.patch(`/courses/${id}/cancel`);
    return response.data;
  },
};
