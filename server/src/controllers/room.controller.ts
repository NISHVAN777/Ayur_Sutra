import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db, schema } from "../db/index.js";
import { eq, desc, asc, sql } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler.js";
import { format } from "date-fns";

export class RoomController {
  // GET: All rooms with optional status filter
  static async getAllRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statusFilter = req.query.status as "ACTIVE" | "INACTIVE" | undefined;
      const todayStr = format(new Date(), "yyyy-MM-dd");

      const allRooms = await db.query.treatmentRooms.findMany({
        where: statusFilter ? eq(schema.treatmentRooms.status, statusFilter) : undefined,
        with: {
          therapySessions: {
            where: eq(schema.therapySessions.sessionDate, todayStr),
            with: {
              therapist: { with: { user: true } },
              patient: { with: { user: true } },
              course: true,
            },
            orderBy: [asc(schema.therapySessions.startTime)],
          },
        },
        orderBy: [asc(schema.treatmentRooms.roomNumber)],
      });

      const formatted = allRooms.map((room) => ({
        id: room.id,
        roomName: room.roomName,
        roomNumber: room.roomNumber,
        description: room.description,
        status: room.status,
        todaySessionsCount: room.therapySessions.length,
        todaySessions: room.therapySessions,
        createdAt: room.createdAt,
      }));

      res.json({
        success: true,
        count: formatted.length,
        rooms: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Create room
  static async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomName, roomNumber, description, status } = req.body;

      const existingRoom = await db.query.treatmentRooms.findFirst({
        where: eq(schema.treatmentRooms.roomNumber, roomNumber.trim()),
      });

      if (existingRoom) {
        throw new AppError(`Room number '${roomNumber}' already exists.`, 400, "ROOM_NUMBER_EXISTS");
      }

      const roomId = `room_${crypto.randomUUID()}`;
      const [newRoom] = await db
        .insert(schema.treatmentRooms)
        .values({
          id: roomId,
          roomName: roomName.trim(),
          roomNumber: roomNumber.trim(),
          description: description || null,
          status: status || "ACTIVE",
        })
        .returning();

      res.status(201).json({
        success: true,
        message: "Treatment room created successfully.",
        room: newRoom,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Update room
  static async updateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { roomName, roomNumber, description, status } = req.body;

      const room = await db.query.treatmentRooms.findFirst({
        where: eq(schema.treatmentRooms.id, id),
      });

      if (!room) {
        throw new AppError("Treatment room not found.", 404, "ROOM_NOT_FOUND");
      }

      if (roomNumber && roomNumber !== room.roomNumber) {
        const clash = await db.query.treatmentRooms.findFirst({
          where: eq(schema.treatmentRooms.roomNumber, roomNumber.trim()),
        });
        if (clash) {
          throw new AppError(`Room number '${roomNumber}' is already in use.`, 400, "ROOM_NUMBER_EXISTS");
        }
      }

      await db
        .update(schema.treatmentRooms)
        .set({
          roomName: roomName ?? room.roomName,
          roomNumber: roomNumber ?? room.roomNumber,
          description: description ?? room.description,
          status: status ?? room.status,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(eq(schema.treatmentRooms.id, id));

      const updated = await db.query.treatmentRooms.findFirst({
        where: eq(schema.treatmentRooms.id, id),
      });

      res.json({
        success: true,
        message: "Treatment room updated successfully.",
        room: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
