// Reference: javascript_database blueprint and javascript_auth_all_persistance blueprint
import {
  users,
  recyclingEntries,
  compostEntries,
  type User,
  type InsertUser,
  type RecyclingEntry,
  type InsertRecyclingEntry,
  type CompostEntry,
  type InsertCompostEntry,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations - for authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  sessionStore: session.SessionStore;
  
  // Recycling entry operations
  createEntry(entry: InsertRecyclingEntry): Promise<RecyclingEntry>;
  getEntriesByUser(userId: string): Promise<RecyclingEntry[]>;
  getAllEntries(): Promise<RecyclingEntry[]>;
  getRecentEntries(userId: string, limit: number): Promise<RecyclingEntry[]>;
  
  // Statistics operations
  getTotalWeightByUser(userId: string): Promise<number>;
  getTotalCompostWeightByUser(userId: string): Promise<number>;
  getTotalEntriesByUser(userId: string): Promise<number>;
  getTopMaterialByUser(userId: string): Promise<string>;
  getMaterialSummary(userId: string): Promise<Array<{ materialType: string; totalWeight: number; count: number }>>;
  
  // Compost operations
  createCompostEntry(entry: InsertCompostEntry): Promise<CompostEntry>;
  getCompostEntryByUserAndMonth(userId: string, month: string): Promise<CompostEntry | undefined>;
  updateCompostEntry(id: string, weight: number, notes?: string): Promise<CompostEntry>;
  getCompostEntriesByUser(userId: string): Promise<CompostEntry[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: false,
    });
  }

  // User operations - for authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
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

  async getTotalCompostWeightByUser(userId: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${compostEntries.weight} AS NUMERIC)), 0)` })
      .from(compostEntries)
      .where(eq(compostEntries.userId, userId));
    
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

  // Compost operations
  async createCompostEntry(entry: InsertCompostEntry): Promise<CompostEntry> {
    const [newEntry] = await db
      .insert(compostEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getCompostEntryByUserAndMonth(userId: string, month: string): Promise<CompostEntry | undefined> {
    const [entry] = await db
      .select()
      .from(compostEntries)
      .where(sql`${compostEntries.userId} = ${userId} AND ${compostEntries.month} = ${month}`);
    return entry;
  }

  async updateCompostEntry(id: string, weight: number, notes?: string): Promise<CompostEntry> {
    const [updatedEntry] = await db
      .update(compostEntries)
      .set({ 
        weight: weight.toString(),
        notes: notes,
        updatedAt: new Date(),
      })
      .where(eq(compostEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async getCompostEntriesByUser(userId: string): Promise<CompostEntry[]> {
    return await db
      .select()
      .from(compostEntries)
      .where(eq(compostEntries.userId, userId))
      .orderBy(desc(compostEntries.month));
  }
}

export const storage = new DatabaseStorage();
