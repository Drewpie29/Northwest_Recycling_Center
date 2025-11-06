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
      
      const [totalWeight, totalEntries, topMaterial, topLocation, recentEntries] = await Promise.all([
        storage.getTotalWeightByUser(userId),
        storage.getTotalEntriesByUser(userId),
        storage.getTopMaterialByUser(userId),
        storage.getTopLocationByUser(userId),
        storage.getRecentEntries(userId, 5),
      ]);

      res.json({
        totalWeight,
        totalEntries,
        topMaterial,
        topLocation,
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
      
      const [entries, materialSummary, locationSummary] = await Promise.all([
        storage.getEntriesByUser(userId),
        storage.getMaterialSummary(userId),
        storage.getLocationSummary(userId),
      ]);

      res.json({
        entries,
        materialSummary,
        locationSummary,
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
