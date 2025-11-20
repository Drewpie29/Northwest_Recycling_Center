// Reference: javascript_auth_all_persistance blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword } from "./auth";
import { insertRecyclingEntrySchema, insertCompostEntrySchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - sets up /api/register, /api/login, /api/logout, /api/user
  await setupAuth(app);

  // Dashboard stats endpoint
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      
      const [totalWeight, totalCompostWeight, totalEntries, topMaterial, recentEntries] = await Promise.all([
        storage.getTotalWeightByUser(userId),
        storage.getTotalCompostWeightByUser(userId),
        storage.getTotalEntriesByUser(userId),
        storage.getTopMaterialByUser(userId),
        storage.getRecentEntries(userId, 5),
      ]);

      res.json({
        totalWeight,
        totalCompostWeight,
        totalEntries,
        topMaterial,
        recentEntries,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Create new recycling entry
  app.post('/api/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      console.log('[POST /api/entries] Request received', { userId, body: req.body });
      
      // Validate request body
      const validation = insertRecyclingEntrySchema.safeParse(req.body);
      if (!validation.success) {
        const validationError = fromError(validation.error);
        console.log('[POST /api/entries] Validation failed:', validation.error.errors);
        return res.status(400).json({ message: validationError.toString() });
      }

      console.log('[POST /api/entries] Validation passed:', validation.data);
      const entry = await storage.createEntry({
        ...validation.data,
        userId,
      });
      console.log('[POST /api/entries] Entry created:', entry);

      res.status(201).json(entry);
    } catch (error) {
      console.error("[POST /api/entries] Error creating entry:", error);
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  // Get all entries for the current user
  app.get('/api/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const entries = await storage.getEntriesByUser(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  // Reports endpoint with detailed summaries
  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      
      const [entries, materialSummary, compostEntries] = await Promise.all([
        storage.getEntriesByUser(userId),
        storage.getMaterialSummary(userId),
        storage.getCompostEntriesByUser(userId),
      ]);

      res.json({
        entries,
        materialSummary,
        compostEntries,
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Compost endpoints
  app.post('/api/compost', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const validation = insertCompostEntrySchema.safeParse(req.body);
      if (!validation.success) {
        const validationError = fromError(validation.error);
        return res.status(400).json({ message: validationError.toString() });
      }

      const { month, weight, notes } = validation.data;

      // Check if entry already exists for this month
      const existing = await storage.getCompostEntryByUserAndMonth(userId, month);
      
      if (existing) {
        // Update existing entry
        const updated = await storage.updateCompostEntry(existing.id, weight, notes);
        res.json(updated);
      } else {
        // Create new entry
        const entry = await storage.createCompostEntry({
          userId,
          month,
          weight,
          notes,
        });
        res.json(entry);
      }
    } catch (error) {
      console.error("Error saving compost entry:", error);
      res.status(500).json({ message: "Failed to save compost entry" });
    }
  });

  app.get('/api/compost', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const entries = await storage.getCompostEntriesByUser(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching compost entries:", error);
      res.status(500).json({ message: "Failed to fetch compost entries" });
    }
  });

  app.get('/api/compost/:month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { month } = req.params;
      const entry = await storage.getCompostEntryByUserAndMonth(userId, month);
      res.json(entry || null);
    } catch (error) {
      console.error("Error fetching compost entry:", error);
      res.status(500).json({ message: "Failed to fetch compost entry" });
    }
  });

  // Admin-only routes for user management
  app.get('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      // Validate request body
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        const validationError = fromError(validation.error);
        return res.status(400).json({ message: validationError.toString() });
      }

      // Check if username already exists
      const existing = await storage.getUserByUsername(validation.data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user with hashed password
      const user = await storage.createUser({
        ...validation.data,
        password: await hashPassword(validation.data.password),
      });

      // Return user without password
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/admin/users/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body
      const validation = updateUserSchema.safeParse(req.body);
      if (!validation.success) {
        const validationError = fromError(validation.error);
        return res.status(400).json({ message: validationError.toString() });
      }

      // Verify user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user with validated data
      const updatedUser = await storage.updateUser(id, validation.data);
      
      // Return user without password
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
