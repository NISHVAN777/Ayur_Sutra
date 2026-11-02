import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "ayursutra_super_secure_jwt_secret_key_2026_dev_prod";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "THERAPIST" | "PATIENT";
  patientId?: string;
  therapistId?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
