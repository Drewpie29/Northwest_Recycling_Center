// Reference: javascript_database blueprint and javascript_log_in_with_replit blueprint
import {
  users,
  recyclingEntries,
  type User,
  type UpsertUser,
  type RecyclingEntry,
  type InsertRecyclingEntry,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Recycling entry operations
  createEntry(entry: InsertRecyclingEntry): Promise<RecyclingEntry>;
  getEntriesByUser(userId: string): Promise<RecyclingEntry[]>;
  getAllEntries(): Promise<RecyclingEntry[]>;
  getRecentEntries(userId: string, limit: number): Promise<RecyclingEntry[]>;
  
  // Statistics operations
  getTotalWeightByUser(userId: string): Promise<number>;
  getTotalEntriesByUser(userId: string): Promise<number>;
  getTopMaterialByUser(userId: string): Promise<string>;
  getTopLocationByUser(userId: string): Promise<string>;
  getMaterialSummary(userId: string): Promise<Array<{ materialType: string; totalWeight: number; count: number }>>;
  getLocationSummary(userId: string): Promise<Array<{ location: string; totalWeight: number; count: number }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
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

  // Recycling entry operations
  async createEntry(entry: InsertRecyclingEntry): Promise<RecyclingEntry> {
    const [newEntry] = await db
      .insert(recyclingEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getEntriesByUser(userId: string): Promise<RecyclingEntry[]> {
    return await db
      .select()
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId))
      .orderBy(desc(recyclingEntries.collectedAt));
  }

  async getAllEntries(): Promise<RecyclingEntry[]> {
    return await db
      .select()
      .from(recyclingEntries)
      .orderBy(desc(recyclingEntries.collectedAt));
  }

  async getRecentEntries(userId: string, limit: number): Promise<RecyclingEntry[]> {
    return await db
      .select()
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId))
      .orderBy(desc(recyclingEntries.collectedAt))
      .limit(limit);
  }

  // Statistics operations
  async getTotalWeightByUser(userId: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${recyclingEntries.weight} AS NUMERIC)), 0)` })
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId));
    
    return Number(result[0]?.total || 0);
  }

  async getTotalEntriesByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId));
    
    return Number(result[0]?.count || 0);
  }

  async getTopMaterialByUser(userId: string): Promise<string> {
    const result = await db
      .select({
        materialType: recyclingEntries.materialType,
        total: sql<number>`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`,
      })
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId))
      .groupBy(recyclingEntries.materialType)
      .orderBy(desc(sql`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`))
      .limit(1);
    
    return result[0]?.materialType || "N/A";
  }

  async getTopLocationByUser(userId: string): Promise<string> {
    const result = await db
      .select({
        location: recyclingEntries.location,
        total: sql<number>`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`,
      })
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId))
      .groupBy(recyclingEntries.location)
      .orderBy(desc(sql`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`))
      .limit(1);
    
    return result[0]?.location || "N/A";
  }

  async getMaterialSummary(userId: string): Promise<Array<{ materialType: string; totalWeight: number; count: number }>> {
    const result = await db
      .select({
        materialType: recyclingEntries.materialType,
        totalWeight: sql<number>`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId))
      .groupBy(recyclingEntries.materialType)
      .orderBy(desc(sql`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`));
    
    return result.map(r => ({
      materialType: r.materialType,
      totalWeight: Number(r.totalWeight),
      count: Number(r.count),
    }));
  }

  async getLocationSummary(userId: string): Promise<Array<{ location: string; totalWeight: number; count: number }>> {
    const result = await db
      .select({
        location: recyclingEntries.location,
        totalWeight: sql<number>`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(recyclingEntries)
      .where(eq(recyclingEntries.userId, userId))
      .groupBy(recyclingEntries.location)
      .orderBy(desc(sql`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`));
    
    return result.map(r => ({
      location: r.location,
      totalWeight: Number(r.totalWeight),
      count: Number(r.count),
    }));
  }
}

export const storage = new DatabaseStorage();
