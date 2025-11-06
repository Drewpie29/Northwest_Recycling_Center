import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Reference: javascript_log_in_with_replit blueprint
// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Reference: javascript_log_in_with_replit blueprint
// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Recycling entries table - tracks individual recycling activities
export const recyclingEntries = pgTable("recycling_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  materialType: varchar("material_type").notNull(), // e.g., "Paper", "Plastic", "Glass", "Metal", "Cardboard", "Electronics"
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(), // in pounds
  location: varchar("location").notNull(), // e.g., "Colden Hall", "Student Union", "Library"
  notes: text("notes"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecyclingEntrySchema = createInsertSchema(recyclingEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  weight: z.coerce.number().positive("Weight must be positive"),
  materialType: z.string().min(1, "Material type is required"),
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
});

export type InsertRecyclingEntry = z.infer<typeof insertRecyclingEntrySchema>;
export type RecyclingEntry = typeof recyclingEntries.$inferSelect;
