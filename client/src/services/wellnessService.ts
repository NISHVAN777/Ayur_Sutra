import { api } from "./api";
import { WellnessLog, AgniStatus, BowelStatus } from "../types";

export interface WellnessLogInput {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  agniStatus: AgniStatus;
  bowelStatus: BowelStatus;
  reactions: string[];
  energyLevel: number;
  discomfortLevel: number;
  notes?: string;
}

export const wellnessService = {
  async submit(data: WellnessLogInput): Promise<{ log: WellnessLog }> {
    const response = await api.post("/wellness-logs", data);
    return response.data;
  },

  async getMine(): Promise<{ logs: WellnessLog[] }> {
    const response = await api.get("/wellness-logs");
    return response.data;
  },

  async getForPatient(patientId: string): Promise<{ logs: WellnessLog[] }> {
    const response = await api.get(`/wellness-logs/patient/${patientId}`);
    return response.data;
  },
};
