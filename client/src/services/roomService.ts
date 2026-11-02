import { api } from "./api";
import { TreatmentRoom } from "../types";

export const roomService = {
  async getAll(status?: "ACTIVE" | "INACTIVE"): Promise<{ rooms: TreatmentRoom[]; count: number }> {
    const response = await api.get("/rooms", { params: { status } });
    return response.data;
  },

  async create(data: { roomName: string; roomNumber: string; description?: string; status?: "ACTIVE" | "INACTIVE" }): Promise<{ room: TreatmentRoom }> {
    const response = await api.post("/rooms", data);
    return response.data;
  },

  async update(id: string, data: any): Promise<{ room: TreatmentRoom }> {
    const response = await api.put(`/rooms/${id}`, data);
    return response.data;
  },
};
