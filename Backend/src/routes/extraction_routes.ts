import express from 'express';
import { 
  saveExtraction, 
  getExtractionHistory, 
  getExtraction, 
  deleteExtraction, 
  previewExtraction 
} from '../controllers/extraction.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Save extraction
router.post('/', saveExtraction);

// Get extraction history
router.get('/', getExtractionHistory);

// Get specific extraction
router.get('/:id', getExtraction);

// Delete extraction
router.delete('/:id', deleteExtraction);

// Preview extraction
router.get('/:id/preview', previewExtraction);

export default router;