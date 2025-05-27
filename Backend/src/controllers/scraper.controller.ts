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
    $('[id]').each((index, element) => {
      const el = $(element);
      const id = el.attr('id');
      if (id) {
        // Make each ID selector unique by using the exact instance
        const uniqueSelector = `#${id}`;
        elementsWithIds.push({
          selector: uniqueSelector,
          type: 'id',
          text: el.text().trim().substring(0, 50)
        });
      }
    });
    
    // Collect elements with classes
    const elementsWithClasses: { selector: string; type: string; text?: string }[] = [];
    $('[class]').each((index, element) => {
      const el = $(element);
      const classes = el.attr('class')?.split(' ') || [];
      
      // Get the element's tag name
      const tagName = element.name;
      
      for (const cls of classes) {
        if (cls) {
          // Create a more specific selector using tag, class, and position
          const uniqueSelector = `${tagName}.${cls}:nth-of-type(${index + 1})`;
          elementsWithClasses.push({
            selector: uniqueSelector,
            type: 'class',
            text: el.text().trim().substring(0, 50)
          });
        }
      }
    });
      // Collect common HTML tags
    const commonTags = ['table', 'tr', 'td', 'th', 'a', 'p', 'div', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'article', 'section', 'product'];
    const tagsWithContent: { selector: string; type: string; text?: string; uniqueSelector: string }[] = [];
    
    commonTags.forEach(tag => {
      $(tag).each((index, element) => {
        const el = $(element);
        const text = el.text().trim();
        
        if (text && text.length > 0) {
          // Create a unique selector for this specific element
          const uniqueSelector = `${tag}:nth-of-type(${index + 1})`;
          
          tagsWithContent.push({
            selector: uniqueSelector, // Use the unique selector instead of just tag
            type: 'tag',
            text: text.substring(0, 50),
            uniqueSelector: uniqueSelector
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
    const baseUrl = url; // Use the provided URL as base for relative URLs
    
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
    } else {    // Check for a "selectAll" flag
      const isSelectAll = selectors.includes('*') || selectors.includes('selectAll');
        // Define product selectors if selectAll is true or explicitly requested
      if (isSelectAll) {
        console.log("Select All mode activated - looking for product data");
        // Look for common product containers including Amazon-style selectors
        const productSelectors = [
          '.product', 
          '[class*=product]', 
          '.item', 
          '[class*=item]',
          'article',
          '.card',
          '[class*=card]',
          // Amazon-specific selectors
          '[data-component-type="s-search-result"]',
          '.s-result-item',
          '[data-asin]',
          '.celwidget',
          // Generic e-commerce selectors
          '.product-item',
          '.listing-item',
          '.search-result',
          '.grid-item',
          '[data-product-id]',
          '[data-sku]',
          // More generic containers that might contain products
          'li[class*="item"]',
          'div[class*="listing"]',
          'div[class*="tile"]'
        ];
        
        // Try each product selector
        for (const productSelector of productSelectors) {
          if ($(productSelector).length > 0) {
            console.log(`Found ${$(productSelector).length} items with selector ${productSelector}`);
            $(productSelector).each((_, element) => {
              const el = $(element);
              const item: Record<string, any> = {};
              
              // Extract all data from this product element
              extractStructuredData($, el, item, url);
              
              // Add selector info
              item._selector = productSelector;
              
              // Only add items that have meaningful data (title, price, or image)
              const hasMeaningfulData = item.title || item.price || item.image || 
                                       Object.keys(item).length > 2;
              if (hasMeaningfulData) {
                data.push(item);
              }
            });
            
            // If we found products, no need to try other selectors
            if (data.length > 0) {
              break;
            }
          }
        }
      }
        // Process regular selectors if we're not doing selectAll or if selectAll didn't find anything
      if (!isSelectAll || data.length === 0) {
        for (const selector of selectors.filter(s => s !== '*' && s !== 'selectAll')) {
          // Only select the specific element using the exact selector (including :nth-of-type if present)
          // This ensures we don't select ALL elements of a tag type 
          $(selector).each((_, element) => {
            const el = $(element);
            const item: Record<string, any> = {};
            
            // Enhanced extraction based on the element structure
            extractStructuredData($, el, item, url);
            
            // If we couldn't extract structured data, fall back to basic extraction
            if (Object.keys(item).length === 0) {
              item.text = el.text().trim();
              
              // Extract basic attributes
              const href = el.is('a') ? el.attr('href') : undefined;
              const src = el.is('img') ? el.attr('src') : undefined;
              if (href) {
                item.href = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
              }
              if (src) {
                item.src = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
              }
            }
            
            // Add selector info
            item._selector = selector;
            
            // Only add if we have meaningful data (more than just the selector)
            if (Object.keys(item).length > 1) {
              data.push(item);
            }
          });
        }
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
 * Extract structured data from an element with deep nested search
 */
const extractStructuredData = ($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, item: Record<string, any>, baseUrl: string): void => {
  // Deep image extraction - search through all nested levels
  const images: string[] = [];
  const imageData: any[] = [];
  
  // Find all images including deeply nested ones
  element.find('img').each((_, img) => {
    const $img = $(img);
    let src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original');
    
    // Check for lazy loading attributes
    if (!src) {
      const dataSrcSet = $img.attr('data-srcset') || $img.attr('srcset');
      if (dataSrcSet) {
        src = dataSrcSet.split(',')[0]?.split(' ')[0];
      }
    }
    
    if (src) {
      // Make relative URLs absolute
      const imgUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
      images.push(imgUrl);
      
      // Collect image metadata
      const imgInfo: any = {
        src: imgUrl,
        alt: $img.attr('alt') || '',
        title: $img.attr('title') || '',
        width: $img.attr('width') || '',
        height: $img.attr('height') || ''
      };
      
      // Look for parent container classes for context
      const parent = $img.parent();
      if (parent.length) {
        imgInfo.parentClass = parent.attr('class') || '';
      }
      
      imageData.push(imgInfo);
    }
  });
  
  // Set image data
  if (images.length > 0) {
    item.image = images[0]; // Primary image
    if (images.length > 1) {
      item.images = images; // All images
    }
    item.imageData = imageData; // Detailed image info
  }

  // Extract heading data (often product titles) - search deeper
  element.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"], [id*="title"]').each((_, heading) => {
    const $heading = $(heading);
    const text = $heading.text().trim();
    const classNames = $heading.attr('class')?.split(' ') || [];
    
    if (text && !item.title) {
      // Check for common product title classes
      if (classNames.some(c => /title|name|product|heading/i.test(c))) {
        item.title = text;
      } else if ($heading.is('h1, h2, h3')) {
        item.title = text;
      }
    }
  });
  // Extract price data with multiple patterns and deeper search
  element.find('.price, [class*=price], .cost, [class*=cost], [data-price], .money, [class*=money], .amount').each((_, price) => {
    const $price = $(price);
    let priceText = $price.text().trim();
    
    // If no text, check data attributes
    if (!priceText) {
      priceText = $price.attr('data-price') || $price.attr('data-value') || '';
    }
    
    if (priceText && !item.price) {
      // Clean price text
      const cleanPrice = priceText.replace(/[^\d.,₹$€£¥]/g, '');
      const numValue = parseFloat(cleanPrice.replace(/,/g, ''));
      
      if (!isNaN(numValue)) {
        item.price = priceText;
        item.priceValue = numValue;
        item.priceCurrency = priceText.match(/[₹$€£¥]/)?.[0] || '';
      } else {
        item.price = priceText;
      }
    }
  });
  
  // Extract ratings with more patterns
  element.find('.rating, [class*=rating], .stars, [class*=stars], [class*=review-score], .score').each((_, rating) => {
    const $rating = $(rating);
    let ratingText = $rating.text().trim();
    
    // Check data attributes if no text
    if (!ratingText) {
      ratingText = $rating.attr('data-rating') || $rating.attr('data-score') || '';
    }
    
    if (ratingText && !item.rating) {
      const cleanRating = ratingText.replace(/[^\d.]/g, '');
      const numRating = parseFloat(cleanRating);
      if (!isNaN(numRating)) {
        item.rating = numRating;
        item.ratingText = ratingText;
      }
    }
  });
  
  // Extract reviews count with broader search
  element.find('.reviews, [class*=review], .votes, [class*=votes], [class*=rating-count]').each((_, reviews) => {
    const $reviews = $(reviews);
    const text = $reviews.text().trim();
    
    if (text && !item.reviews) {
      // Extract numbers from text like "(1,234 reviews)" or "1234 votes"
      const matches = text.match(/[\d,]+/g);
      if (matches) {
        const number = parseInt(matches[0].replace(/,/g, ''));
        if (!isNaN(number)) {
          item.reviews = number;
          item.reviewsText = text;
        }
      }
    }
  });
    // Extract images
  element.find('img').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    if (src) {
      // Make relative URLs absolute
      const imgUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
      if (!item.image) {
        item.image = imgUrl;
      } else if (!item.images) {
        item.images = [item.image, imgUrl];
      } else {
        item.images.push(imgUrl);
      }
      
      // Get alt text if available
      const alt = $img.attr('alt');
      if (alt && !item.alt) {
        item.alt = alt;
      }
    }
  });
  
  // Extract links with better handling
  element.find('a').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    if (href && !item.url) {
      // Make relative URLs absolute
      const linkUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
      item.url = linkUrl;
      
      // Get link text if available
      const linkText = $link.text().trim();
      if (linkText && !item.linkText) {
        item.linkText = linkText;
      }
    }
  });
  
  // Extract product description with more selectors
  element.find('p, .description, [class*=desc], .product-desc, .summary, [class*=summary]').each((_, desc) => {
    const $desc = $(desc);
    const text = $desc.text().trim();
    if (text && text.length > 20 && !item.description) {
      item.description = text.length > 200 ? text.substring(0, 200) + '...' : text;
    }
  });

  // Extract availability/stock info
  element.find('.availability, [class*=stock], [class*=available], .in-stock, .out-of-stock').each((_, stock) => {
    const $stock = $(stock);
    const text = $stock.text().trim();
    if (text && !item.availability) {
      item.availability = text;
      // Determine if in stock
      item.inStock = /in.?stock|available|ships/i.test(text) && !/out.?of.?stock|unavailable/i.test(text);
    }
  });

  // Extract brand information
  element.find('.brand, [class*=brand], [data-brand], .manufacturer').each((_, brand) => {
    const $brand = $(brand);
    const text = $brand.text().trim() || $brand.attr('data-brand') || '';
    if (text && !item.brand) {
      item.brand = text;
    }
  });

  // Extract SKU/Product ID
  element.find('[class*=sku], [data-sku], [class*=product-id], [data-product-id]').each((_, sku) => {
    const $sku = $(sku);
    const text = $sku.text().trim() || $sku.attr('data-sku') || $sku.attr('data-product-id') || '';
    if (text && !item.sku) {
      item.sku = text;
    }
  });

  // Add any additional useful data from spans, divs with meaningful classes
  element.find('span, div').each((_, el) => {
    const $el = $(el);
    const classNames = $el.attr('class')?.split(' ') || [];
    const text = $el.text().trim();
    
    if (text && classNames.length > 0) {
      for (const className of classNames) {
        // Skip already extracted data and common layout classes
        if (className && 
            !item[className] && 
            !['price', 'rating', 'reviews', 'title', 'description', 'image', 'container', 'wrapper', 'row', 'col'].includes(className) &&
            !className.match(/^(d-|flex-|text-|bg-|border-|p-|m-|w-|h-)/)) {
          
          // Try to parse as number if it looks numeric
          if (/^\d+(\.\d+)?$/.test(text)) {
            item[className] = parseFloat(text);
          } else if (text.length > 0 && text.length < 100) {
            item[className] = text;
          }
          break;
        }
      }
    }
  });
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