import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapedElement {
  selector: string;
  type: 'tag' | 'class' | 'id';
  text?: string;
  attributes?: Record<string, string>;
  children?: number;
}

interface ScrapedData {
  url: string;
  title: string;
  elements: ScrapedElement[];
  html: string; // Original HTML for further processing
}

/**
 * Service for fetching websites and extracting data
 */
export class ScraperService {
  /**
   * Fetches the HTML from a URL
   */
  async fetchWebsite(url: string): Promise<string> {
    try {
      // Add http if not present
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000, // 10 second timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching website:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Failed to fetch website: HTTP status ${error.response.status}`);
        } else if (error.request) {
          throw new Error('Failed to fetch website: No response received');
        }
      }
      throw new Error('Failed to fetch website');
    }
  }

  /**
   * Parses HTML and extracts available elements for selection
   */
  parseHTML(html: string, url: string): ScrapedData {
    const $ = cheerio.load(html);
    const elements: ScrapedElement[] = [];
    
    // Extract title
    const title = $('title').text() || url;

    // Extract all elements with IDs
    $('[id]').each((i, el) => {
      const element = $(el);
      elements.push({
        selector: `#${element.attr('id')}`,
        type: 'id',
        text: element.text().trim().substring(0, 100), // Limit text length
        attributes: this.getAttributes(element),
        children: element.children().length
      });
    });

    // Extract elements with classes
    const processedClasses = new Set(); // To avoid duplicates
    $('[class]').each((i, el) => {
      const element = $(el);
      const classes = element.attr('class')?.split(/\s+/) || [];
      
      classes.forEach(className => {
        if (className && !processedClasses.has(className)) {
          processedClasses.add(className);
          const elementsWithClass = $(`.${className}`);
          if (elementsWithClass.length > 0) {
            elements.push({
              selector: `.${className}`,
              type: 'class',
              text: elementsWithClass.first().text().trim().substring(0, 100),
              attributes: this.getAttributes(elementsWithClass.first()),
              children: elementsWithClass.first().children().length
            });
          }
        }
      });
    });

    // Extract common HTML tags that often contain useful data
    const commonTags = ['h1', 'h2', 'h3', 'p', 'a', 'img', 'table', 'ul', 'ol', 'div', 'span', 'article', 'section'];
    commonTags.forEach(tag => {
      const count = $(tag).length;
      if (count > 0) {
        elements.push({
          selector: tag,
          type: 'tag',
          text: `${count} ${tag} element(s)`,
          children: $(tag).children().length
        });
      }
    });

    return {
      url,
      title,
      elements,
      html
    };
  }

  /**
   * Extract data from HTML using the provided selectors
   */
  extractData(html: string, selectors: string[]): Record<string, any>[] {
    const $ = cheerio.load(html);
    const results: Record<string, any>[] = [];
    
    // Handle table extraction differently
    const tableSelectors = selectors.filter(s => s.startsWith('table') || $(s).find('table').length > 0);
    const nonTableSelectors = selectors.filter(s => !tableSelectors.includes(s));

    // Process tables
    tableSelectors.forEach(selector => {
      const tables = $(selector).find('table').addBack('table');
      tables.each((i, table) => {
        const tableData: Record<string, string>[] = [];
        const headerRow = $(table).find('tr:first-child');
        const headers: string[] = [];
        
        // Extract headers
        headerRow.find('th, td').each((j, cell) => {
          headers.push($(cell).text().trim());
        });
        
        // Extract data rows
        $(table).find('tr:not(:first-child)').each((j, row) => {
          const dataRow: Record<string, string> = {};
          $(row).find('td').each((k, cell) => {
            const header = headers[k] || `column${k}`;
            dataRow[header] = $(cell).text().trim();
          });
          tableData.push(dataRow);
        });
        
        results.push(...tableData);
      });
    });

    // Process regular selectors
    if (nonTableSelectors.length > 0) {
      const elements = $(nonTableSelectors.join(', '));
      elements.each((i, el) => {
        const element = $(el);
        const item: Record<string, any> = {
          text: element.text().trim(),
        };
        
        // Extract attributes
        const attributes = this.getAttributes(element);
        if (Object.keys(attributes).length > 0) {
          item.attributes = attributes;
        }

        // Extract href for links
        if (element.is('a') && element.attr('href')) {
          item.href = element.attr('href');
        }
        
        // Extract src for images
        if (element.is('img') && element.attr('src')) {
          item.src = element.attr('src');
        }

        results.push(item);
      });
    }

    return results;
  }

  /**
   * Helper method to get all attributes of an element
   */
  private getAttributes(element: cheerio.Cheerio<any>): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attribs = element.get()[0]?.attribs || {};
    
    Object.entries(attribs).forEach(([key, value]) => {
      // Skip data- attributes to avoid cluttering
      if (!key.startsWith('data-') && key !== 'class' && key !== 'id' && key !== 'style') {
        attributes[key] = String(value);
      }
    });
    
    return attributes;
  }
}

export default new ScraperService();