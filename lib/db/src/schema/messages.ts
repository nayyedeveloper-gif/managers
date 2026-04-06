import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  channelId: integer("channel_id").notNull(),
  senderId: integer("sender_id").notNull(),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  isEdited: boolean("is_edited").notNull().default(false),
  reactions: jsonb("reactions").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
