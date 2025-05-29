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

router.use(authMiddleware);

router.post('/', saveExtraction);

router.get('/', getExtractionHistory);

router.get('/:id', getExtraction);

router.delete('/:id', deleteExtraction);

router.get('/:id/preview', previewExtraction);

export default router;