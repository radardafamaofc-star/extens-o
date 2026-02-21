import { users, type User, type UpsertUser, activationCodes, type ActivationCode } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { IAuthStorage } from "./replit_integrations/auth";

export interface IStorage extends IAuthStorage {
  // Activation Codes
  getCodes(): Promise<ActivationCode[]>;
  getCodeByValue(code: string): Promise<ActivationCode | undefined>;
  getCodeById(id: number): Promise<ActivationCode | undefined>;
  createCode(code: string, expiresAt: Date, createdById: string): Promise<ActivationCode>;
  revokeCode(id: number): Promise<ActivationCode>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Codes
  async getCodes(): Promise<ActivationCode[]> {
    return await db.select().from(activationCodes).orderBy(desc(activationCodes.createdAt));
  }

  async getCodeByValue(code: string): Promise<ActivationCode | undefined> {
    const [activationCode] = await db.select().from(activationCodes).where(eq(activationCodes.code, code));
    return activationCode;
  }

  async getCodeById(id: number): Promise<ActivationCode | undefined> {
    const [activationCode] = await db.select().from(activationCodes).where(eq(activationCodes.id, id));
    return activationCode;
  }

  async createCode(code: string, expiresAt: Date, createdById: string): Promise<ActivationCode> {
    const [activationCode] = await db.insert(activationCodes).values({
      code,
      expiresAt,
      createdById,
      isActive: true,
    }).returning();
    return activationCode;
  }

  async revokeCode(id: number): Promise<ActivationCode> {
    const [activationCode] = await db.update(activationCodes)
      .set({ isActive: false })
      .where(eq(activationCodes.id, id))
      .returning();
    return activationCode;
  }
}

export const storage = new DatabaseStorage();
