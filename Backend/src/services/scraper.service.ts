import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

interface ScrapedElement {
  selector: string;
  type: 'tag' | 'class' | 'id';
  text?: string;
  attributes?: Record<string, string>;
  children?: number;
  hasImage?: boolean;
  hasTable?: boolean;
}

interface ScrapedData {
  url: string;
  title: string;
  elements: ScrapedElement[];
  html: string; 
}


export class ScraperService {
  

  //to fetch HTML from URL
  async fetchWebsite(url: string): Promise<string> {
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 5000,
        maxRedirects: 5,
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

  
  

  //to parse teh HTML fetched
  parseHTML(html: string, url: string): ScrapedData {
    const $ = cheerio.load(html);
    const elements: ScrapedElement[] = [];
    
    const title = $('title').text() || url;

    $('[id]').each((i, el) => {
      const element = $(el);
      const id = element.attr('id');
      if (id && !id.includes(' ')) { 
        elements.push({
          selector: `#${id}`,
          type: 'id',
          text: this.getElementPreview(element),
          attributes: this.getAttributes(element),
          children: element.children().length,
          hasImage: element.find('img').length > 0,
          hasTable: element.find('table').length > 0
        });
      }
    });

    const processedClasses = new Set(); 
    $('[class]').each((i, el) => {
      const element = $(el);
      const classes = element.attr('class')?.split(/\s+/) || [];
      
      classes.forEach(className => {
        if (className && !processedClasses.has(className) && !className.includes(':')) {
          processedClasses.add(className);
          const selector = `.${className}`;
          const elementsWithClass = $(selector);
          
          if (elementsWithClass.length > 0) {
            elements.push({
              selector,
              type: 'class',
              text: this.getElementPreview(elementsWithClass.first()),
              attributes: this.getAttributes(elementsWithClass.first()),
              children: elementsWithClass.first().children().length,
              hasImage: elementsWithClass.find('img').length > 0,
              hasTable: elementsWithClass.find('table').length > 0
            });
          }
        }
      });
    });

    // Extract common HTML tags that often contain useful data
    const commonTags = [
      'article', 'section', 'main', 'header', 'footer', 'nav',
      'div', 'span', 'p', 'a', 'img', 'table', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'form', 'input', 'button', 'select', 'option',
      'figure', 'figcaption', 'video', 'audio'
    ];
    
    // Only include tags that exist and have a reasonable number of elements (limit to 100)
    commonTags.forEach(tag => {
      const tagElements = $(tag);
      const count = tagElements.length;
      
      if (count > 0 && count < 100) {
        const hasImage = $(tag).find('img').length > 0;
        const hasTable = $(tag).find('table').length > 0;
        
        elements.push({
          selector: tag,
          type: 'tag',
          text: `${count} ${tag} element(s)`,
          children: $(tag).children().length,
          hasImage,
          hasTable
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


  //to extract data after user selects elements
  extractData(html: string, selectors: string[], baseUrl: string): Record<string, any>[] {
    const $ = cheerio.load(html);
    const data: Record<string, any>[] = [];
    const isSelectAll = selectors.includes('selectAll') || selectors.includes('*');

    // Table extraction if any selector is a table or contains a table
    const tableSelectorIndex = selectors.findIndex(selector => 
      selector.toLowerCase() === 'table' || 
      selector.includes('table') || 
      $(selector).find('table').length > 0 || 
      $(selector).is('table')
    );

    if (tableSelectorIndex >= 0) {
      const tableSelector = selectors[tableSelectorIndex];
      const tables = tableSelector === 'table' ? $('table') : $(tableSelector);
      tables.each((_, table) => {
        const tableData = this.extractTableData($, $(table), baseUrl);
        data.push(...tableData);
      });
    } else if (isSelectAll) {
      // Product-like selectors for selectAll
      const productSelectors = [
        '.product', '[class*=product]', '.item', '[class*=item]', 'article', '.card', '[class*=card]',
        '[data-component-type="s-search-result"]', '.s-result-item', '[data-asin]', '.celwidget',
        '.product-item', '.listing-item', '.search-result', '.grid-item', '[data-product-id]', '[data-sku]',
        'li[class*="item"]', 'div[class*="listing"]', 'div[class*="tile"]'
      ];
      let found = false;
      for (const productSelector of productSelectors) {
        if ($(productSelector).length > 0) {
          $(productSelector).each((_, element) => {
            const el = $(element);
            const item: Record<string, any> = {};
            this.extractStructuredData($, el, item, baseUrl);
            item._selector = productSelector;
            const hasMeaningfulData = item.title || item.price || item.image || Object.keys(item).length > 2;
            if (hasMeaningfulData) {
              data.push(item);
            }
          });
          if (data.length > 0) {
            found = true;
            break;
          }
        }
      }
      // Fallback to all elements if no product selectors found
      if (!found) {
        $('*').each((_, el) => {
          const element = $(el);
          const item: Record<string, any> = {};
          this.extractStructuredData($, element, item, baseUrl);
          if (Object.keys(item).length > 1) {
            data.push(item);
          }
        });
      }
    } else {
      // Regular selectors
      for (const selector of selectors.filter(s => s !== '*' && s !== 'selectAll')) {
        $(selector).each((_, element) => {
          const el = $(element);
          const item: Record<string, any> = {};
          this.extractStructuredData($, el, item, baseUrl);
          if (Object.keys(item).length === 0) {
            item.text = el.text().trim();
            const href = el.is('a') ? el.attr('href') : undefined;
            const src = el.is('img') ? el.attr('src') : undefined;
            if (href) {
              item.href = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
            }
            if (src) {
              item.src = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
            }
          }
          item._selector = selector;
          if (Object.keys(item).length > 1) {
            data.push(item);
          }
        });
      }
    }
    return data;
  }
  
//extractAllata
 //extractAllata (full DOM traversal, truly generic)
  private extractAllData($: cheerio.CheerioAPI, baseUrl: string): Record<string, any>[] {
    const results: Record<string, any>[] = [];
    const processedElements = new Set<string>();

    // Traverse all elements in the DOM
    $('*').each((_, el) => {
      const element = $(el);
      // Use outer HTML as a unique key for deduplication
      const outerHtml = $.html(element);
      if (processedElements.has(outerHtml)) return;
      processedElements.add(outerHtml);

      // Extract data for every element
      const item = this.extractElementData($, element, baseUrl);
      if (item && Object.keys(item).length > 1) {
        results.push(item);
      }
    });

    // Explicitly extract all tables (with deduplication)
    $('table').each((_, table) => {
      const tableHtml = $.html(table);
      if (processedElements.has(tableHtml)) return;
      processedElements.add(tableHtml);
      const tableData = this.extractTableData($, $(table), baseUrl);
      results.push(...tableData);
    });

    // Explicitly extract all images (with deduplication)
    $('img').each((_, img) => {
      const imgHtml = $.html(img);
      if (processedElements.has(imgHtml)) return;
      processedElements.add(imgHtml);
      const imageItem = this.extractImageData($, $(img), baseUrl);
      if (imageItem && Object.keys(imageItem).length > 1) {
        results.push(imageItem);
      }
    });

    // Deduplicate and limit results for performance
    return this.deduplicateResults(results).slice(0, 200);
  } 
  
  
 //to extract ata for selected elemets
  private extractSelectorData(
    $: cheerio.CheerioAPI, 
    selector: string, 
    baseUrl: string, 
    results: Record<string, any>[],
    processedElements: Set<string>,
    limit: number = 100
  ): void {
    try {
      if (selector === 'table' || $(selector).find('table').length > 0) {
        const tables = $(selector).find('table').addBack('table');
        tables.each((i, table) => {
          if (i < limit) {
            const tableData = this.extractTableData($, $(table), baseUrl);
            results.push(...tableData);
          }
        });
        return;
      }
      
      $(selector).each((i, el) => {
        if (i >= limit) return;

        // Recursively extract data for this element and all its descendants
        const traverseAndExtract = (element: cheerio.Cheerio<any>) => {
          const elementHtml = element.html();
          if (elementHtml && processedElements.has(elementHtml)) {
            return;
          }
          if (elementHtml) {
            processedElements.add(elementHtml);
          }

          const item = this.extractElementData($, element, baseUrl);
          // Only push if the item has meaningful data
          if (
            item &&
            (
              (item.image && item.image !== '') ||
              (item.images && Array.isArray(item.images) && item.images.length > 0) ||
              (item.price && item.price !== '') ||
              (item.title && item.title !== '') ||
              (item.description && item.description !== '') ||
              (item.rating && item.rating !== '') ||
              (item.reviews && item.reviews !== '') ||
              (item.urls && Array.isArray(item.urls) && item.urls.length > 0) ||
              (item.text && typeof item.text === 'string' && item.text.trim().length > 10 && !(/^(\s*|[\d\W]*)$/.test(item.text))) ||
              (item.attributes && Object.keys(item.attributes).length > 0)
            )
          ) {
            results.push(item);
          }

          // Traverse children
          element.children().each((_, child) => {
            traverseAndExtract(element.constructor(child));
          });
        };

        traverseAndExtract($(el));
      });
    } catch (error) {
      console.error(`Error extracting data for selector ${selector}:`, error);
    }
  }



//
//
//

//AI is responsible for any error below this
// only GOD and GPT understands 100% of whats written below 
  private extractElementData($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, baseUrl: string): Record<string, any> {
    const item: Record<string, any> = {
      _selector: this.getElementSelector(element)
    };
    
    const text = element.text().trim();
    if (text) {
      item.text = text;
    }
    

    element.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"], [id*="title"]').each((_, heading) => {
      const headingText = $(heading).text().trim();
      if (headingText && headingText.length < 200 && !item.title) {
        item.title = headingText;
      }
    });
    
    if (!item.title && element.is('h1, h2, h3, h4, h5, h6')) {
      item.title = text;
    }
    
    const priceRegex = /(\$|€|£|¥|\bUSD|\bEUR|\bGBP|\bJPY|\bRS\.|\bRs\.|\₹)\s*\d+(\.\d{2})?|\d+(\.\d{2})?\s*(\$|€|£|¥|\bUSD|\bEUR|\bGBP|\bJPY|\bRS\.|\bRs\.|\₹)/i;
    element.find('*').each((_, el) => {
      const elText = $(el).text().trim();
      const priceMatch = elText.match(priceRegex);
      if (priceMatch && !item.price) {
        item.price = priceMatch[0].trim();
      }
    });
    
    if (!item.price) {
      const priceMatch = text.match(priceRegex);
      if (priceMatch) {
        item.price = priceMatch[0].trim();
      }
    }
    
    const images: string[] = [];
    const imageData: any[] = [];
    
    element.find('img').each((_, img) => {
      const $img = $(img);
      let src = $img.attr('src');
      
      if (!src) {
        src = $img.attr('data-src') || 
              $img.attr('data-original') || 
              $img.attr('data-lazy-src') || 
              $img.attr('data-url');
      }
      
      if (src) {
        const imgUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
        
        images.push(imgUrl);
        
        const imgInfo: any = {
          src: imgUrl,
          alt: $img.attr('alt') || '',
          title: $img.attr('title') || '',
          width: $img.attr('width'),
          height: $img.attr('height')
        };
        
        imageData.push(imgInfo);
      }
    });
    
    if (images.length > 0) {
      item.image = images[0];
      if (images.length > 1) {
        item.images = images;
      }
      item.imageData = imageData;
    }
    
    const links: string[] = [];
    element.find('a').each((_, a) => {
      const href = $(a).attr('href');
      if (href) {
        const url = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        links.push(url);
      }
    });
    
    if (links.length > 0) {
      item.urls = links;
    }
    
    element.find('p, [class*="desc"], [class*="description"], [id*="desc"]').each((_, p) => {
      const descText = $(p).text().trim();
      if (descText && descText.length > 10 && descText.length < 500 && !item.description) {
        item.description = descText;
      }
    });
    
    const ratingRegex = /([0-5](\.\d{1,2})?)\s*\/\s*5|([0-5](\.\d{1,2})?)\s*stars|([0-5](\.\d{1,2})?)\s*out\s*of\s*5/i;
    element.find('*').each((_, el) => {
      const elText = $(el).text().trim();
      
      const ratingMatch = elText.match(ratingRegex);
      if (ratingMatch && !item.rating) {
        item.rating = ratingMatch[1] || ratingMatch[3] || ratingMatch[5];
      }
      
      const reviewMatch = elText.match(/(\d+)\s*reviews?|review\s*\((\d+)\)/i);
      if (reviewMatch && !item.reviews) {
        item.reviews = reviewMatch[1] || reviewMatch[2];
      }
    });
    
    const attributes = this.getAttributes(element);
    if (Object.keys(attributes).length > 0) {
      item.attributes = attributes;
    }
    
    return item;
  }
  

  private extractTableData($: cheerio.CheerioAPI, table: cheerio.Cheerio<any>, baseUrl: string): Record<string, any>[] {
    const tableData: Record<string, any>[] = [];
    const headers: string[] = [];
    $(table).find('tr:first-child th, tr:first-child td').each((_, cell) => {
      headers.push($(cell).text().trim());
    });
    if (headers.length === 0) {
      const firstRow = $(table).find('tr:first-child td');
      firstRow.each((index) => {
        headers.push(`column${index + 1}`);
      });
    }
    $(table).find('tr').each((rowIndex, row) => {
      if (rowIndex === 0 && headers.length > 0 && $(row).find('th').length > 0) {
        return;
      }
      const rowData: Record<string, any> = {};
      $(row).find('td').each((cellIndex, cell) => {
        const header = headers[cellIndex] || `column${cellIndex + 1}`;
        rowData[header] = $(cell).text().trim();
      });
      if (Object.keys(rowData).length > 0) {
        tableData.push(rowData);
      }
    });
    return tableData;
  }
  
  private extractStructuredData($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, item: Record<string, any>, baseUrl: string): void {
    const images: string[] = [];
    const imageData: any[] = [];
    element.find('img').each((_, img) => {
      const $img = $(img);
      let src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original');
      if (!src) {
        const dataSrcSet = $img.attr('data-srcset') || $img.attr('srcset');
        if (dataSrcSet) {
          src = dataSrcSet.split(',')[0]?.split(' ')[0];
        }
      }
      if (src) {
        const imgUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
        images.push(imgUrl);
        const imgInfo: any = {
          src: imgUrl,
          alt: $img.attr('alt') || '',
          title: $img.attr('title') || '',
          width: $img.attr('width') || '',
          height: $img.attr('height') || ''
        };
        const parent = $img.parent();
        if (parent.length) {
          imgInfo.parentClass = parent.attr('class') || '';
        }
        imageData.push(imgInfo);
      }
    });
    if (images.length > 0) {
      item.image = images[0];
      if (images.length > 1) {
        item.images = images;
      }
      item.imageData = imageData;
    }


    element.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"], [id*="title"]').each((_, heading) => {
      const $heading = $(heading);
      const text = $heading.text().trim();
      const classNames = $heading.attr('class')?.split(' ') || [];
      if (text && !item.title) {
        if (classNames.some(c => /title|name|product|heading/i.test(c))) {
          item.title = text;
        } else if ($heading.is('h1, h2, h3')) {
          item.title = text;
        }
      }
    });


    element.find('.price, [class*=price], .cost, [class*=cost], [data-price], .money, [class*=money], .amount').each((_, price) => {
      const $price = $(price);
      let priceText = $price.text().trim();
      if (!priceText) {
        priceText = $price.attr('data-price') || $price.attr('data-value') || '';
      }
      if (priceText && !item.price) {
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


    element.find('.rating, [class*=rating], .stars, [class*=stars], [class*=review-score], .score').each((_, rating) => {
      const $rating = $(rating);
      let ratingText = $rating.text().trim();
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


    element.find('.reviews, [class*=review], .votes, [class*=votes], [class*=rating-count]').each((_, reviews) => {
      const $reviews = $(reviews);
      const text = $reviews.text().trim();
      if (text && !item.reviews) {
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


    element.find('img').each((_, img) => {
      const $img = $(img);
      const src = $img.attr('src');
      if (src) {
        const imgUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
        if (!item.image) {
          item.image = imgUrl;
        } else if (!item.images) {
          item.images = [item.image, imgUrl];
        } else {
          item.images.push(imgUrl);
        }
        const alt = $img.attr('alt');
        if (alt && !item.alt) {
          item.alt = alt;
        }
      }
    });


    element.find('a').each((_, link) => {
      const $link = $(link);
      const href = $link.attr('href');
      if (href && !item.url) {
        const linkUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        item.url = linkUrl;
        const linkText = $link.text().trim();
        if (linkText && !item.linkText) {
          item.linkText = linkText;
        }
      }
    });

    element.find('p, .description, [class*=desc], .product-desc, .summary, [class*=summary]').each((_, desc) => {
      const $desc = $(desc);
      const text = $desc.text().trim();
      if (text && text.length > 20 && !item.description) {
        item.description = text.length > 200 ? text.substring(0, 200) + '...' : text;
      }
    });

    element.find('.availability, [class*=stock], [class*=available], .in-stock, .out-of-stock').each((_, stock) => {
      const $stock = $(stock);
      const text = $stock.text().trim();
      if (text && !item.availability) {
        item.availability = text;
        item.inStock = /in.?stock|available|ships/i.test(text) && !/out.?of.?stock|unavailable/i.test(text);
      }
    });

    element.find('.brand, [class*=brand], [data-brand], .manufacturer').each((_, brand) => {
      const $brand = $(brand);
      const text = $brand.text().trim() || $brand.attr('data-brand') || '';
      if (text && !item.brand) {
        item.brand = text;
      }
    });


    element.find('[class*=sku], [data-sku], [class*=product-id], [data-product-id]').each((_, sku) => {
      const $sku = $(sku);
      const text = $sku.text().trim() || $sku.attr('data-sku') || $sku.attr('data-product-id') || '';
      if (text && !item.sku) {
        item.sku = text;
      }
    });


    element.find('span, div').each((_, el) => {
      const $el = $(el);
      const classNames = $el.attr('class')?.split(' ') || [];
      const text = $el.text().trim();
      if (text && classNames.length > 0) {
        for (const className of classNames) {
          if (className && 
              !item[className] && 
              !['price', 'rating', 'reviews', 'title', 'description', 'image', 'container', 'wrapper', 'row', 'col'].includes(className) &&
              !className.match(/^(d-|flex-|text-|bg-|border-|p-|m-|w-|h-)/)) {
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
  }
  

  //OK back again, i understand it now
  //to extract imagespecific data
  private extractImageData($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, baseUrl: string): Record<string, any> | null {
    const src = element.attr('src') || 
                element.attr('data-src') || 
                element.attr('data-original') || 
                element.attr('data-lazy-src');
                
    if (!src) return null;
    
    const imgUrl = src.startsWith('http') ? src : new URL(src, baseUrl).toString();
    
    const width = parseInt(element.attr('width') || '0');
    const height = parseInt(element.attr('height') || '0');
    if ((width > 0 && width < 50) || (height > 0 && height < 50)) {
      return null;
    }
    
    const item: Record<string, any> = {
      image: imgUrl,
      alt: element.attr('alt') || '',
      _selector: this.getElementSelector(element)
    };
    
    const parent = element.parent();
    if (parent.length) {
      const siblingText = parent.clone().children('img').remove().end().text().trim();
      if (siblingText) {
        item.text = siblingText;
      }
      
      parent.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]').each((_, heading) => {
        const headingText = $(heading).text().trim();
        if (headingText && !item.title) {
          item.title = headingText;
        }
      });
    }
    
    return item;
  }
  

  //to get CSS selector for an element
  private getElementSelector(element: cheerio.Cheerio<any>): string {
    const id = element.attr('id');
    if (id) {
      return `#${id}`;
    }
    
    const classAttr = element.attr('class');
    if (classAttr) {
      const classes = classAttr.split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.get(0)?.name || 'unknown';
  }
  
//text preview
  private getElementPreview(element: cheerio.Cheerio<any>): string {
    let text = element.text().trim();
    
    if (text.length > 100) {
      text = text.substring(0, 97) + '...';
    }
    
    text = text.replace(/\s+/g, ' ');
    
    return text;
  }
  
//attribute extractionnnn weeeeeeeeee!!!
  private getAttributes(element: cheerio.Cheerio<any>): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attribs = element.get()[0]?.attribs || {};
    
    Object.entries(attribs).forEach(([key, value]) => {
      const usefulAttrs = ['href', 'src', 'alt', 'title', 'aria-label'];
      
      if (usefulAttrs.includes(key) || key.startsWith('data-') && key !== 'data-reactid') {
        attributes[key] = String(value);
      }
    });
    
    return attributes;
  }
  
//Pradhan Mantri duplicate Hatao Yojna
  private deduplicateResults(results: Record<string, any>[]): Record<string, any>[] {
    const seen = new Set();
    
    return results.filter(item => {
      const dedupeKey = [
        item.title,
        item.image,
        item.price,
        item.url
      ].filter(Boolean).join('|');
      
      if (!dedupeKey) return true;
      
      if (seen.has(dedupeKey)) {
        return false;
      }
      
      seen.add(dedupeKey);
      return true;
    });
  }



  //
parseSafeHTML(html: string, baseUrl: string) {
  try {
    return this.parseHTML(html, baseUrl);
  } catch (error) {
    console.log("Normal parsing failed, using safe method");
    return this.parseBasicHTML(html, baseUrl);
  }
}





parseBasicHTML(html: string, baseUrl: string) {
  const $ = cheerio.load(html, {
    xmlMode: false
  });
  
  const url = baseUrl;
  const title = $('title').text().trim() || url;
  const elements = [];
  
  try {
   
    const commonTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav'];
    
    $('[id]').each((_, el) => {
      try {
        const element = $(el);
        const id = element.attr('id');
        
        if (id && !id.includes('[') && !id.includes(']') && !id.includes('(') && !id.includes(')') && 
            !id.includes('"') && !id.includes("'") && !id.includes('=')) {
          elements.push({
            selector: `#${id}`,
            type: 'id',
            text: element.text().trim().substring(0, 150),
            children: element.children().length,
            hasImage: element.find('img').length > 0,
            hasTable: element.find('table').length > 0
          });
        }
      } catch (e) {
      }
    });
    
    commonTags.forEach(tag => {
      try {
        if (elements.length < 100) { 
          const tagCount = $(tag).length;
          if (tagCount > 0 && tagCount < 100) { 
            elements.push({
              selector: tag,
              type: 'tag',
              text: $(tag).first().text().trim().substring(0, 150),
              children: $(tag).first().children().length,
              hasImage: $(tag).first().find('img').length > 0,
              hasTable: $(tag).first().find('table').length > 0
            });
          }
        }
      } catch (e) {
      }
    });
    
    if (elements.length < 50) {
      $('[class]').each((_, el) => {
        try {
          if (elements.length >= 100) return; 
          
          const element = $(el);
          const classes = element.attr('class');
          
          if (classes) {
            const firstClass = classes.split(/\s+/).find(c => 
              c && 
              !c.includes('[') && !c.includes(']') && 
              !c.includes('(') && !c.includes(')') &&
              !c.includes('"') && !c.includes("'") && 
              !c.includes('=')
            );
            
            if (firstClass) {
              const selector = `.${firstClass}`;
              
              if (!elements.some(e => e.selector === selector)) {
                elements.push({
                  selector,
                  type: 'class',
                  text: element.text().trim().substring(0, 150),
                  children: element.children().length,
                  hasImage: element.find('img').length > 0,
                  hasTable: element.find('table').length > 0
                });
              }
            }
          }
        } catch (e) {

        }
      });
    }
  } catch (error) {
    console.error("Error in basic HTML parsing:", error);
  }
  
  return {
    url,
    title,
    elements: elements.slice(0, 100), 
    html
  };
}
}

export default new ScraperService();