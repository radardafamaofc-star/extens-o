import { pgTable, text, serial, timestamp, boolean, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Export auth models
export { users, sessions } from "./models/auth";
import { users } from "./models/auth";

export const activationCodes = pgTable("activation_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: varchar("created_by_id").references(() => users.id),
});

export const insertActivationCodeSchema = createInsertSchema(activationCodes).omit({ 
  id: true, 
  createdAt: true,
  createdById: true
});

export type InsertActivationCode = z.infer<typeof insertActivationCodeSchema>;
export type ActivationCode = typeof activationCodes.$inferSelect;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
