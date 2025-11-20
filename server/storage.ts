// Reference: javascript_database blueprint and javascript_auth_all_persistance blueprint
import {
  users,
  recyclingEntries,
  compostEntries,
  materialCategories,
  type User,
  type InsertUser,
  type RecyclingEntry,
  type InsertRecyclingEntry,
  type CompostEntry,
  type InsertCompostEntry,
  type MaterialCategory,
  type InsertMaterialCategory,
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
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<Pick<User, 'isActive' | 'role' | 'email' | 'firstName' | 'lastName'>>): Promise<User>;
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
  
  // Material category operations
  getAllMaterialCategories(): Promise<MaterialCategory[]>;
  getActiveMaterialCategories(): Promise<MaterialCategory[]>;
  createMaterialCategory(category: InsertMaterialCategory): Promise<MaterialCategory>;
  updateMaterialCategory(id: string, updates: Partial<Pick<MaterialCategory, 'name' | 'isActive'>>): Promise<MaterialCategory>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'isActive' | 'role' | 'email' | 'firstName' | 'lastName'>>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
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
        materialType: materialCategories.name,
        total: sql<number>`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`,
      })
      .from(recyclingEntries)
      .innerJoin(materialCategories, eq(recyclingEntries.materialCategoryId, materialCategories.id))
      .where(eq(recyclingEntries.userId, userId))
      .groupBy(materialCategories.name)
      .orderBy(desc(sql`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`))
      .limit(1);
    
    return result[0]?.materialType || "N/A";
  }

  async getMaterialSummary(userId: string): Promise<Array<{ materialType: string; totalWeight: number; count: number }>> {
    const result = await db
      .select({
        materialType: materialCategories.name,
        totalWeight: sql<number>`SUM(CAST(${recyclingEntries.weight} AS NUMERIC))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(recyclingEntries)
      .innerJoin(materialCategories, eq(recyclingEntries.materialCategoryId, materialCategories.id))
      .where(eq(recyclingEntries.userId, userId))
      .groupBy(materialCategories.name)
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

  // Material category operations
  async getAllMaterialCategories(): Promise<MaterialCategory[]> {
    return await db
      .select()
      .from(materialCategories)
      .orderBy(materialCategories.name);
  }

  async getActiveMaterialCategories(): Promise<MaterialCategory[]> {
    return await db
      .select()
      .from(materialCategories)
      .where(eq(materialCategories.isActive, 1))
      .orderBy(materialCategories.name);
  }

  async createMaterialCategory(category: InsertMaterialCategory): Promise<MaterialCategory> {
    const [newCategory] = await db
      .insert(materialCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateMaterialCategory(id: string, updates: Partial<Pick<MaterialCategory, 'name' | 'isActive'>>): Promise<MaterialCategory> {
    const [updatedCategory] = await db
      .update(materialCategories)
      .set(updates)
      .where(eq(materialCategories.id, id))
      .returning();
    return updatedCategory;
  }
}

export const storage = new DatabaseStorage();
