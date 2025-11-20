// Reference: javascript_auth_all_persistance blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, hashPassword } from "./auth";
import { insertRecyclingEntrySchema, insertCompostEntrySchema, insertUserSchema, updateUserSchema, insertMaterialCategorySchema, updateMaterialCategorySchema } from "@shared/schema";
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

  // Update a recycling entry (with ownership check)
  app.patch('/api/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const entryId = req.params.id;
      
      // Get the existing entry to check ownership
      const existingEntry = await storage.getEntry(entryId);
      if (!existingEntry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Authorization: technicians can only edit their own entries, admins can edit any
      if (userRole !== 'admin' && existingEntry.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own entries" });
      }
      
      // Validate updates using partial schema (allow partial updates)
      const updateSchema = insertRecyclingEntrySchema.partial();
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        const validationError = fromError(validation.error);
        return res.status(400).json({ message: validationError.toString() });
      }
      
      // Convert weight to string for database storage
      const updates: any = { ...validation.data };
      if (updates.weight !== undefined) {
        updates.weight = updates.weight.toString();
      }
      
      await storage.updateEntry(entryId, updates);
      
      // Refetch with joined data using the bale owner's ID (not the acting user's ID)
      // This ensures admins can see the updated bale even when editing another user's entry
      const updatedEntries = await storage.getEntriesByUser(existingEntry.userId);
      const updatedEntry = updatedEntries.find(e => e.id === entryId);
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating entry:", error);
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  // Delete a recycling entry (with ownership check)
  app.delete('/api/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const entryId = req.params.id;
      
      // Get the existing entry to check ownership
      const existingEntry = await storage.getEntry(entryId);
      if (!existingEntry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Authorization: technicians can only delete their own entries, admins can delete any
      if (userRole !== 'admin' && existingEntry.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own entries" });
      }
      
      await storage.deleteEntry(entryId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting entry:", error);
      res.status(500).json({ message: "Failed to delete entry" });
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

  app.delete('/api/admin/users/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user!.id;

      // Prevent deleting yourself
      if (id === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Verify user exists
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete the user
      await storage.deleteUser(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ===== Material Category Routes =====

  // Get active material categories (for all users)
  app.get('/api/material-categories', isAuthenticated, async (_req, res) => {
    try {
      const categories = await storage.getActiveMaterialCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching active categories:", error);
      res.status(500).json({ message: "Failed to fetch material categories" });
    }
  });

  // Get all material categories (admin only)
  app.get('/api/admin/material-categories', isAdmin, async (_req, res) => {
    try {
      const categories = await storage.getAllMaterialCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching all categories:", error);
      res.status(500).json({ message: "Failed to fetch material categories" });
    }
  });

  // Create new material category (admin only)
  app.post('/api/admin/material-categories', isAdmin, async (req, res) => {
    try {
      // Validate request body
      const validation = insertMaterialCategorySchema.safeParse(req.body);
      if (!validation.success) {
        const validationError = fromError(validation.error);
        return res.status(400).json({ message: validationError.toString() });
      }

      const category = await storage.createMaterialCategory(validation.data);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating material category:", error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ message: "Category name already exists" });
      }
      res.status(500).json({ message: "Failed to create material category" });
    }
  });

  // Update material category (admin only)
  app.patch('/api/admin/material-categories/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body
      const validation = updateMaterialCategorySchema.safeParse(req.body);
      if (!validation.success) {
        const validationError = fromError(validation.error);
        return res.status(400).json({ message: validationError.toString() });
      }

      const updatedCategory = await storage.updateMaterialCategory(id, validation.data);
      res.json(updatedCategory);
    } catch (error: any) {
      console.error("Error updating material category:", error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ message: "Category name already exists" });
      }
      res.status(500).json({ message: "Failed to update material category" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
