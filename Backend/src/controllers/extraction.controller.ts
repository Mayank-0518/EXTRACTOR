import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Extraction } from '../models/extraction.model.js';

//save extraction
export const saveExtraction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url, title, selectors, data } = req.body;
    
    if (!url || !selectors || !data) {
      res.status(400).json({ message: 'URL, selectors, and data are required' });
      return;
    }
    
    if (!req.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const extraction = new Extraction({
      userId: req.userId,
      url,
      title: title || url,
      selectors,
      data
    });

    await extraction.save();
    
    res.status(201).json({ 
      message: 'Extraction saved successfully',
      id: extraction._id
    });
  } catch (error) {
    console.error('Error saving extraction:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to save extraction'
    });
  }
};

//extraction history
export const getExtractionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    
    const extractionsData = await Extraction
      .find({ userId: req.userId })
      .select('url title createdAt data')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Extraction.countDocuments({ userId: req.userId });
    
    // Format extractions for frontend compatibility
    const extractions = extractionsData.map(extraction => ({
      id: extraction._id.toString(),
      url: extraction.url,
      title: extraction.title,
      createdAt: extraction.createdAt,
      userId: req.userId,
      dataCount: Array.isArray(extraction.data) ? extraction.data.length : 0
    }));
    
    // Return just the extractions array for better frontend compatibility
    res.json({
      extractions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching extraction history:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to fetch extraction history'
    });
  }
};

//get specific extraction id
export const getExtraction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const format = req.query.format as string || 'json';
    
    if (!req.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const extraction = await Extraction.findOne({ 
      _id: id, 
      userId: req.userId 
    });
    
    if (!extraction) {
      res.status(404).json({ message: 'Extraction not found' });
      return;
    }  

    if (format === 'csv') {
      const dataArray = Array.isArray(extraction.data) ? extraction.data : [extraction.data];
      const csvData = convertToCSV(dataArray);
      res.header('Content-Type', 'text/csv');
      res.attachment(`extraction-${id}.csv`);
      res.send(csvData);
      return;
    }  
    
    else if (format === 'xml') {
      const xmlData = convertToXML(extraction.data);
      res.header('Content-Type', 'application/xml');
      res.attachment(`extraction-${id}.xml`);
      res.send(xmlData);
      return; 
    }
    
    res.json(extraction);
  } 
  
  catch (error) {
    console.error('Error fetching extraction:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to fetch extraction'
    });
  }
};


//delete saved extraction
export const deleteExtraction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!req.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const extraction = await Extraction.findOneAndDelete({ 
      _id: id, 
      userId: req.userId 
    });
    
    if (!extraction) {
      res.status(404).json({ message: 'Extraction not found' });
      return;
    }
    
    res.json({ message: 'Extraction deleted successfully' });
  } catch (error) {
    console.error('Error deleting extraction:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to delete extraction'
    });
  }
};

//preview
export const previewExtraction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string || '10');
    
    if (!req.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const extraction = await Extraction.findOne({ 
      _id: id, 
      userId: req.userId 
    });
    
    if (!extraction) {
      res.status(404).json({ message: 'Extraction not found' });
      return;
    }
    
    // Get subset of data for preview
    let previewData = extraction.data;
    if (Array.isArray(previewData) && previewData.length > limit) {
      previewData = previewData.slice(0, limit);
    }
    
    res.json({
      title: extraction.title,
      url: extraction.url,
      createdAt: extraction.createdAt,
      totalRecords: Array.isArray(extraction.data) ? extraction.data.length : 1,
      previewData
    });
  } catch (error) {
    console.error('Error previewing extraction:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to preview extraction'
    });
  }
};

//CSV converter 
//GPT ne likha hai maine nhi
function convertToCSV(data: Record<string, any>[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  const headers = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (typeof item[key] !== 'object' || item[key] === null) {
        headers.add(key);
      }
    });
  });
  
  const headerRow = [...headers].join(',');
  const rows = data.map(item => {
    return [...headers].map(header => {
      const value = item[header];
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}

//same here
//not implemented thogh (error)
function convertToXML(data: Record<string, any>[] | Record<string, any>): string {
  const toXML = (obj: any, nodeName = 'item'): string => {
    if (obj === null || obj === undefined) {
      return '';
    }
    
    if (Array.isArray(obj)) {
      return `<items>${obj.map(item => toXML(item, 'item')).join('')}</items>`;
    }
    
    if (typeof obj === 'object') {
      const properties = Object.entries(obj).map(([key, value]) => {
        if (Array.isArray(value)) {
          return `<${key}>${value.map(item => toXML(item, 'item')).join('')}</${key}>`;
        } else if (typeof value === 'object' && value !== null) {
          return `<${key}>${toXML(value)}</${key}>`;
        } else {
          return `<${key}>${escapeXML(String(value || ''))}</${key}>`;
        }
      }).join('');
      
      return `<${nodeName}>${properties}</${nodeName}>`;
    }
    
    return escapeXML(String(obj));
  };
  
  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  
  return `<?xml version="1.0" encoding="UTF-8"?>\n${toXML(data, 'data')}`;
}

//will use xlsx laterOn  
// function convertToExcel(data: Record<string, any>[]): Buffer {
//   const csvString = convertToCSV(data);
//   return Buffer.from(csvString);
// }