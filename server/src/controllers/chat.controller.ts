import { Request, Response, NextFunction } from "express";
import { db, schema } from "../db/index.js";
import { eq, asc } from "drizzle-orm";
import { ChatService } from "../services/chat.service.js";
import { AppError } from "../middleware/errorHandler.js";

export class ChatController {
  // POST: Send chat message to AI assistant
  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { message } = req.body;

      if (!message || typeof message !== "string" || !message.trim()) {
        throw new AppError("Message cannot be empty.", 400, "INVALID_MESSAGE");
      }

      const result = await ChatService.handleMessage(userId, message.trim());

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET: Get chat history for authenticated user
  static async getChatHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const messages = await db.query.chatMessages.findMany({
        where: eq(schema.chatMessages.userId, userId),
        orderBy: [asc(schema.chatMessages.createdAt)],
      });

      res.json({
        success: true,
        count: messages.length,
        messages,
      });
    } catch (error) {
      next(error);
    }
  }
}
