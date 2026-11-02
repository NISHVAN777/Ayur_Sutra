import { api } from "./api";
import { SessionRequest } from "../types";

export const requestService = {
  async getAll(params?: { status?: string }): Promise<{ requests: SessionRequest[]; count: number }> {
    const response = await api.get("/requests", { params });
    return response.data;
  },

  async approve(
    id: string,
    data: {
      sessionDate?: string;
      startTime?: string;
      therapistId?: string;
      roomId?: string;
      notes?: string;
    }
  ): Promise<{ message: string; session: any }> {
    const response = await api.post(`/requests/${id}/approve`, data);
    return response.data;
  },

  async reject(
    id: string,
    data: { reason: string }
  ): Promise<{ message: string }> {
    const response = await api.post(`/requests/${id}/reject`, data);
    return response.data;
  },
};
