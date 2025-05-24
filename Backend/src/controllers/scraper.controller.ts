import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { AuthRequest } from '../middleware/auth.middleware.js';

/**
 * Analyze a website to find available selectors
 */
export const analyzeWebsite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    
    if (!url) {
      res.status(400).json({ message: 'URL is required' });
      return;
    }
    
    // Fetch the website content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Collect elements with IDs
    const elementsWithIds: { selector: string; type: string; text?: string }[] = [];
    $('[id]').each((_, element) => {
      const el = $(element);
      const id = el.attr('id');
      if (id) {
        elementsWithIds.push({
          selector: `#${id}`,
          type: 'id',
          text: el.text().trim().substring(0, 50)
        });
      }
    });
    
    // Collect elements with classes
    const elementsWithClasses: { selector: string; type: string; text?: string }[] = [];
    $('[class]').each((_, element) => {
      const el = $(element);
      const classes = el.attr('class')?.split(' ') || [];
      
      for (const cls of classes) {
        if (cls && !elementsWithClasses.some(e => e.selector === `.${cls}`)) {
          elementsWithClasses.push({
            selector: `.${cls}`,
            type: 'class',
            text: el.text().trim().substring(0, 50)
          });
        }
      }
    });
    
    // Collect common HTML tags
    const commonTags = ['table', 'tr', 'td', 'th', 'a', 'p', 'div', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];
    const tagsWithContent: { selector: string; type: string; text?: string }[] = [];
    
    commonTags.forEach(tag => {
      $(tag).each((_, element) => {
        const el = $(element);
        const text = el.text().trim();
        
        if (text && text.length > 0) {
          tagsWithContent.push({
            selector: tag,
            type: 'tag',
            text: text.substring(0, 50)
          });
        }
      });
    });
    
    // Limit the number of elements to prevent overwhelming response
    const limitResults = (arr: any[], limit: number) => arr.slice(0, limit);
    
    res.json({
      url,
      elements: [
        ...limitResults(elementsWithIds, 50),
        ...limitResults(elementsWithClasses, 50),
        ...limitResults(tagsWithContent, 50)
      ]
    });
  } catch (error) {
    console.error('Error analyzing website:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to analyze website'
    });
  }
};

/**
 * Extract data from a website using specified selectors
 */
export const extractData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url, selectors, saveExtraction, title } = req.body;
    
    if (!url || !selectors || !Array.isArray(selectors)) {
      res.status(400).json({ message: 'URL and selectors array are required' });
      return;
    }
    
    // Fetch the website content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract data for each selector
    const data: Record<string, any>[] = [];
    
    // Handle table extraction specifically
    const tableSelectorIndex = selectors.findIndex(selector => 
      selector.toLowerCase() === 'table' || 
      selector.includes('table') || 
      $(selector).find('table').length > 0 || 
      $(selector).is('table')
    );
    
    if (tableSelectorIndex >= 0) {
      // Process tables specially
      const tableSelector = selectors[tableSelectorIndex];
      const tables = tableSelector === 'table' ? $('table') : $(tableSelector);
      
      tables.each((_, table) => {
        const tableData = extractTableData($, table);
        data.push(...tableData);
      });
    } else {
      // Process regular selectors
      for (const selector of selectors) {
        $(selector).each((_, element) => {
          const el = $(element);
          const text = el.text().trim();
          const href = el.is('a') ? el.attr('href') : undefined;
          const src = el.is('img') ? el.attr('src') : undefined;
          
          const item: Record<string, any> = {
            selector,
            text
          };
          
          if (href) item.href = href;
          if (src) item.src = src;
          
          // Get attributes
          const attributes: Record<string, string> = {};
          const attribs = el.attr();
          if (attribs) {
            Object.entries(attribs).forEach(([key, value]) => {
              if (key !== 'href' && key !== 'src') {
                attributes[key] = value;
              }
            });
          }
          
          if (Object.keys(attributes).length > 0) {
            item.attributes = attributes;
          }
          
          data.push(item);
        });
      }
    }
    
    // If data should be saved to the database
    if (saveExtraction && req.userId) {
      const { Extraction } = await import('../models/extraction.model.js');
      
      const extraction = new Extraction({
        userId: req.userId,
        url,
        title: title || url,
        selectors,
        data
      });
      
      await extraction.save();
      res.json({ 
        message: 'Data extracted and saved',
        id: extraction._id,
        data
      });
    } else {
      res.json({ data });
    }
  } catch (error) {
    console.error('Error extracting data:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to extract data'
    });
  }
};

/**
 * Helper function to extract data from tables
 */
const extractTableData = ($: cheerio.CheerioAPI, table: any): Record<string, any>[] => {
  const tableData: Record<string, any>[] = [];
  
  // Get headers from the first row
  const headers: string[] = [];
  $(table).find('tr:first-child th, tr:first-child td').each((_, cell) => {
    headers.push($(cell).text().trim());
  });
  
  // If no explicit headers, use index as header
  if (headers.length === 0) {
    const firstRow = $(table).find('tr:first-child td');
    firstRow.each((index) => {
      headers.push(`column${index + 1}`);
    });
  }
  
  // Process each row
  $(table).find('tr').each((rowIndex, row) => {
    // Skip first row if it has headers
    if (rowIndex === 0 && headers.length > 0 && $(row).find('th').length > 0) {
      return;
    }
    
    const rowData: Record<string, string> = {};
    $(row).find('td').each((cellIndex, cell) => {
      const header = headers[cellIndex] || `column${cellIndex + 1}`;
      rowData[header] = $(cell).text().trim();
    });
    
    if (Object.keys(rowData).length > 0) {
      tableData.push(rowData);
    }
  });
  
  return tableData;
};