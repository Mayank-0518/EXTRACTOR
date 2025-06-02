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
  analyzeWebsite: async (url: string): Promise<{ elements: ScrapedElement[] }> => {
    const response = await api.post('/scraper/analyze', { url });
    return response.data;
  },

  extractData: async (params: ExtractionParams): Promise<any> => {
    const response = await api.post('/scraper/extract', params);
    return response.data;
  },
  
  saveExtraction: async (params: SaveExtractionParams): Promise<any> => {
    const response = await api.post('/extraction', params);
    return response.data;
  },
  
  getUserExtractions: async (): Promise<Extraction[]> => {
    const response = await api.get('/extraction');
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.extractions)) {
      return response.data.extractions;
    }
    return [];
  },
  
  getExtraction: async (id: string): Promise<any> => {
    const response = await api.get(`/extraction/${id}`);
    return response.data;
  },
  
  deleteExtraction: async (id: string): Promise<any> => {
    const response = await api.delete(`/extraction/${id}`);
    return response.data;
  },
};

export default scraperService;