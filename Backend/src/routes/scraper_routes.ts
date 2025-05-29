import express from 'express';
import { analyzeWebsite, extractData } from '../controllers/scraper.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/analyze', analyzeWebsite);

router.post('/extract', extractData);

export default router;