// Reference: javascript_auth_all_persistance blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertRecyclingEntrySchema } from "@shared/schema";
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
      const { month, weight, notes } = req.body;

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

  const httpServer = createServer(app);
  return httpServer;
}
