import express from 'express';
import { analyzeWebsite, extractData } from '../controllers/scraper.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Analyze a website to find available selectors
router.post('/analyze', analyzeWebsite);

// Extract data using specified selectors
router.post('/extract', extractData);

export default router;