import { api } from "./api";
import { TherapySession, AuditLog } from "../types";

export const sessionService = {
  async getAll(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    therapistId?: string;
    roomId?: string;
    patientId?: string;
    status?: string;
  }): Promise<{ sessions: TherapySession[]; count: number }> {
    const response = await api.get("/sessions", { params });
    return response.data;
  },

  async getById(id: string): Promise<{ session: TherapySession }> {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },

  async complete(
    id: string,
    data?: {
      treatmentNotes?: string;
      bloodPressure?: string;
      pulseRate?: number;
      temperature?: number;
      weight?: number;
      symptomScore?: number;
      pathya?: string;
      apathya?: string;
      lifestyleInstructions?: string;
    } | string
  ): Promise<{ message: string; session: TherapySession }> {
    const payload = typeof data === "string" ? { treatmentNotes: data } : (data || {});
    const response = await api.patch(`/sessions/${id}/complete`, payload);
    return response.data;
  },

  async markMissed(id: string, reason?: string): Promise<{ message: string; session: TherapySession }> {
    const response = await api.patch(`/sessions/${id}/missed`, { reason });
    return response.data;
  },

  async reschedule(
    id: string,
    data: {
      sessionDate: string;
      startTime: string;
      therapistId?: string;
      roomId?: string;
      reason: string;
    }
  ): Promise<{ message: string; session: TherapySession }> {
    const response = await api.patch(`/sessions/${id}/reschedule`, data);
    return response.data;
  },

  async cancel(id: string, reason: string): Promise<{ message: string; session: TherapySession }> {
    const response = await api.patch(`/sessions/${id}/cancel`, { reason });
    return response.data;
  },

  async changeTherapist(
    id: string,
    therapistId: string,
    reason?: string
  ): Promise<{ message: string; session: TherapySession }> {
    const response = await api.patch(`/sessions/${id}/therapist`, { therapistId, reason });
    return response.data;
  },

  async changeRoom(
    id: string,
    roomId: string,
    reason?: string
  ): Promise<{ message: string; session: TherapySession }> {
    const response = await api.patch(`/sessions/${id}/room`, { roomId, reason });
    return response.data;
  },

  async getAuditLogs(id: string): Promise<{ auditLogs: AuditLog[]; count: number }> {
    const response = await api.get(`/sessions/${id}/audit`);
    return response.data;
  },

  async updateNotes(id: string, treatmentNotes: string): Promise<{ message: string; session: TherapySession }> {
    const response = await api.post(`/sessions/${id}/notes`, { treatmentNotes });
    return response.data;
  },

  async requestReschedule(
    id: string,
    data: { reason: string; preferredDate?: string; preferredTime?: string }
  ): Promise<{ message: string; requestId: string }> {
    const response = await api.post(`/sessions/${id}/request-reschedule`, data);
    return response.data;
  },

  async requestCancel(
    id: string,
    data: { reason: string }
  ): Promise<{ message: string; requestId: string }> {
    const response = await api.post(`/sessions/${id}/request-cancel`, data);
    return response.data;
  },

  async requestReplacement(
    id: string,
    data: { reason: string; preferredDate?: string; preferredTime?: string }
  ): Promise<{ message: string; requestId: string }> {
    const response = await api.post(`/sessions/${id}/request-replacement`, data);
    return response.data;
  },

  async recommendReschedule(
    id: string,
    data: { reason: string; preferredDate?: string; preferredTime?: string }
  ): Promise<{ message: string; requestId: string }> {
    const response = await api.post(`/sessions/${id}/recommend-reschedule`, data);
    return response.data;
  },

  async declineReplacement(id: string): Promise<{ message: string }> {
    const response = await api.post(`/sessions/${id}/decline-replacement`);
    return response.data;
  },
};
