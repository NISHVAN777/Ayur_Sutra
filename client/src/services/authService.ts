import { api } from "./api";
import { User } from "../types";

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async getMe(): Promise<{ user: User }> {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async register(data: any): Promise<{ user: User; token: string }> {
    const response = await api.post("/auth/register", data);
    return response.data;
  },
};
