import api from './config';

export interface ScrapedElement {
  selector: string;
  type: 'id' | 'class' | 'tag';
  text?: string;
  children?: number;
  hasImage?: boolean;
  hasTable?: boolean;
  attributes?: Record<string, string>;
}

interface ExtractionParams {
  url: string;
  selectors: string[];
}

interface SaveExtractionParams {
  url: string;
  title: string;
  data: any[];
  selectors: string[];
}

export interface Extraction {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  userId: string;
  dataCount: number;
  previewData?: any[];
}

const scraperService = {
  // Analyze a website to get elements
  analyzeWebsite: async (url: string): Promise<{ elements: ScrapedElement[] }> => {
    const response = await api.post('/scraper/analyze', { url });
    return response.data;
  },

  // Extract data from a website
  extractData: async (params: ExtractionParams): Promise<any> => {
    const response = await api.post('/scraper/extract', params);
    return response.data;
  },
  
  // Save an extraction
  saveExtraction: async (params: SaveExtractionParams): Promise<any> => {
    const response = await api.post('/extraction', params);
    return response.data;
  },
  
  // Get user's saved extractions
  getUserExtractions: async (): Promise<Extraction[]> => {
    const response = await api.get('/extraction');
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.extractions)) {
      return response.data.extractions;
    }
    return [];
  },
  
  // Get a specific extraction by ID
  getExtraction: async (id: string): Promise<any> => {
    const response = await api.get(`/extraction/${id}`);
    return response.data;
  },
  
  // Delete an extraction
  deleteExtraction: async (id: string): Promise<any> => {
    const response = await api.delete(`/extraction/${id}`);
    return response.data;
  },
};

export default scraperService;