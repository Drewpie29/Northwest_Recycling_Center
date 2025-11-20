import { sql } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  integer,
  text,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles for access control
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "technician",
]);

// Material types for recycling collection
export const materialTypeEnum = pgEnum("material_type", [
  "Aluminum",
  "Cardboard",
  "Glass",
  "Paper - Mixed",
  "Paper - Books",
  "Paper - Newspaper",
  "Paper-White",
  "Plastic - #1 PET",
  "Plastic - #2 Colored",
  "Plastic - #2 Natural",
  "Scrap Metal",
  "Other - Recycled",
]);

export const MATERIAL_TYPES = [
  "Aluminum",
  "Cardboard",
  "Glass",
  "Paper - Mixed",
  "Paper - Books",
  "Paper - Newspaper",
  "Paper-White",
  "Plastic - #1 PET",
  "Plastic - #2 Colored",
  "Plastic - #2 Natural",
  "Scrap Metal",
  "Other - Recycled",
] as const;

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

// Reference: javascript_auth_all_persistance blueprint
// User storage table - username/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: userRoleEnum("role").notNull().default("technician"),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = deactivated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
}).extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "technician"]).default("technician"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Recycling entries table - tracks individual recycling activities
export const recyclingEntries = pgTable("recycling_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  materialType: materialTypeEnum("material_type").notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(), // in pounds
  notes: text("notes"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecyclingEntrySchema = createInsertSchema(recyclingEntries).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  weight: z.coerce.number().positive("Weight must be positive"),
  materialType: z.enum(MATERIAL_TYPES, {
    errorMap: () => ({ message: "Please select a valid material type" }),
  }),
  notes: z.string().optional(),
  collectedAt: z.coerce.date(),
});

export type InsertRecyclingEntry = z.infer<typeof insertRecyclingEntrySchema>;
export type RecyclingEntry = typeof recyclingEntries.$inferSelect;

// Compost entries table - tracks monthly compost totals
export const compostEntries = pgTable("compost_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  month: varchar("month").notNull(), // Format: YYYY-MM (e.g., "2025-01")
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(), // in pounds
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserMonth: uniqueIndex("unique_user_month").on(table.userId, table.month),
}));

export const insertCompostEntrySchema = createInsertSchema(compostEntries).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  weight: z.coerce.number().positive("Weight must be positive"),
  notes: z.string().optional(),
});

export type InsertCompostEntry = z.infer<typeof insertCompostEntrySchema>;
export type CompostEntry = typeof compostEntries.$inferSelect;
