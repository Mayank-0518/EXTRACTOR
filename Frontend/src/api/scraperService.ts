import api from './config';

export interface ScrapedElement {
  selector: string;
  type: 'tag' | 'class' | 'id';
  text?: string;
}

export interface ExtractionParams {
  url: string;
  selectors: string[];
  saveExtraction?: boolean;
  title?: string;
}

export interface SaveExtractionParams {
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
    const response = await api.post('/extractions', params);
    return response.data;
  },
  
  // Get user's saved extractions
  getUserExtractions: async (): Promise<Extraction[]> => {
    const response = await api.get('/extractions');
    return response.data;
  },
  
  // Get extraction by ID
  getExtraction: async (id: string): Promise<any> => {
    const response = await api.get(`/extractions/${id}`);
    return response.data;
  },



  // Get extraction download URL for different formats

  // getExtractionUrl: (format: string): string => {
  //   return `${api.defaults.baseURL}/scraper/extract?format=${format}`;
  // },



  // Delete an extraction
  deleteExtraction: async (id: string): Promise<any> => {
    const response = await api.delete(`/extractions/${id}`);
    return response.data;
  },
};

export default scraperService;
