import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { Extraction } from '../models/extraction.model.js';

/**
 * Save extraction results to the database
 */
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

/**
 * Get extraction history for the current user
 */
export const getExtractionHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '10');
    
    const extractions = await Extraction
      .find({ userId: req.userId })
      .select('url title createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Extraction.countDocuments({ userId: req.userId });
    
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

/**
 * Get a specific extraction by ID
 */
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
    }    // Handle different export formats
    if (format === 'csv') {
      // Ensure data is an array before passing to convertToCSV
      const dataArray = Array.isArray(extraction.data) ? extraction.data : [extraction.data];
      const csvData = convertToCSV(dataArray);
      res.header('Content-Type', 'text/csv');
      res.attachment(`extraction-${id}.csv`);
      res.send(csvData);
      return;
    } else if (format === 'excel') {
      // Ensure data is an array before passing to convertToExcel
      const dataArray = Array.isArray(extraction.data) ? extraction.data : [extraction.data];
      const excelData = convertToExcel(dataArray);
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(`extraction-${id}.xlsx`);
      res.send(excelData);
      return;    } else if (format === 'xml') {
      // For XML, we can pass either a single object or an array
      const xmlData = convertToXML(extraction.data);
      res.header('Content-Type', 'application/xml');
      res.attachment(`extraction-${id}.xml`);
      res.send(xmlData);
      return;
    }
    
    // Default to JSON
    res.json(extraction);
  } catch (error) {
    console.error('Error fetching extraction:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to fetch extraction'
    });
  }
};

/**
 * Delete a specific extraction by ID
 */
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

/**
 * Preview a subset of extraction data
 */
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

/**
 * Convert data to CSV format
 */
function convertToCSV(data: Record<string, any>[]): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  // Get all unique headers from all objects
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

/**
 * Convert data to XML format
 */
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

/**
 * Convert data to Excel format
 * Note: This is a simple implementation that creates a CSV and returns it as a buffer
 * For better Excel support, install xlsx: npm install xlsx
 */
function convertToExcel(data: Record<string, any>[]): Buffer {
  // Simple implementation - convert to CSV and return as buffer
  const csvString = convertToCSV(data);
  return Buffer.from(csvString);
  
  // For a full Excel implementation with the xlsx library:
  /*
  import * as XLSX from 'xlsx';
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Extraction');
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
  */
}