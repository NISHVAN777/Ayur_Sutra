import { api } from "./api";
import { ChatMessage } from "../types";

export const chatService = {
  async sendMessage(message: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const response = await api.post("/chat", { message });
    return response.data;
  },

  async getHistory(): Promise<{ messages: ChatMessage[]; count: number }> {
    const response = await api.get("/chat/history");
    return response.data;
  },
};
