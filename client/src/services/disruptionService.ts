import { api } from "./api";
import { DisruptionPlan } from "../types";

export interface DisruptionInput {
  therapistId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export const disruptionService = {
  async preview(data: DisruptionInput): Promise<DisruptionPlan> {
    const response = await api.post("/admin/disruptions/preview", data);
    return response.data;
  },

  async apply(data: DisruptionInput): Promise<DisruptionPlan & { message: string }> {
    const response = await api.post("/admin/disruptions/apply", data);
    return response.data;
  },
};
