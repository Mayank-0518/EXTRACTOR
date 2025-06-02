import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import ScraperService from '../services/scraper.service.js';

//to analyze website (fetch and parse)
export const analyzeWebsite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({ message: 'URL is required' });
      return;
    }
    
    console.log(`Analyzing website: ${url}`);
    
    const html = await ScraperService.fetchWebsite(url);
    
    const data = ScraperService.parseHTML(html, url);
    
    res.json({
      url: data.url,
      pageTitle: data.title,
      elements: data.elements
    });
  } catch (error) {
    console.error('Error analyzing website:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to analyze website' 
    });
  }
};

//extraction from selected elements
export const extractData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url, selectors } = req.body;
    
    if (!url || !Array.isArray(selectors)) {
      res.status(400).json({ message: 'URL and selectors array are required' });
      return;
    }
    
    console.log(`Extracting data from ${url} with ${selectors.length} selectors`);
    
    const html = await ScraperService.fetchWebsite(url);
    
    const data = ScraperService.extractData(html, selectors, url);
    
    res.json({ data });
  } catch (error) {
    console.error('Error extracting data:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to extract data' 
    });
  }
};