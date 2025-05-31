import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaHome, FaSpinner, FaCheck, FaSearch, FaList, FaHashtag, FaLayerGroup, FaCode, FaSave } from 'react-icons/fa';
import scraperService from '../api/scraperService';
import type { ScrapedElement } from '../api/scraperService';

interface PreviewData {
  [key: string]: any;
}

const ScrapeResultPage = () => {
  const { url } = useParams<{ url: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [elements, setElements] = useState<ScrapedElement[]>([]);
  const [selectedSelectors, setSelectedSelectors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scrapedUrl, setScrapedUrl] = useState('');
  const [elementTypeFilter, setElementTypeFilter] = useState<'all' | 'id' | 'class' | 'tag'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  // Decode the URL
  const decodedUrl = url ? decodeURIComponent(url) : '';

  useEffect(() => {
    // Fetch available elements when component loads
    const fetchElements = async () => {
      try {
        setIsLoading(true);
        const response = await scraperService.analyzeWebsite(decodedUrl);
        setElements(response.elements);
        setScrapedUrl(decodedUrl);
      } catch (error) {
        console.error('Failed to analyze website:', error);
        toast.error('Failed to analyze website. Please try again.');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (decodedUrl) {
      fetchElements();
    } else {
      navigate('/');
    }
  }, [decodedUrl, navigate]);

  const handleSelectorToggle = (selector: string) => {
    setSelectedSelectors(prev => {
      // If we're toggling a regular selector but 'selectAll' is active,
      // we need to deactivate 'selectAll' first
      if (selector !== 'selectAll' && prev.includes('selectAll')) {
        return [selector];
      }
      
      // If we're toggling 'selectAll', ignore other selectors
      if (selector === 'selectAll') {
        return prev.includes('selectAll') ? [] : ['selectAll'];
      }
      
      // Normal toggle behavior for regular selectors
      return prev.includes(selector) 
        ? prev.filter(s => s !== selector)
        : [...prev, selector];
    });
    
    // Clear preview data when changing selection
    setPreviewData([]);
  };

  const handlePreview = async () => {
    if (selectedSelectors.length === 0) {
      toast.error('Please select at least one element to extract');
      return;
    }

    try {
      setIsExtracting(true);
      setPreviewData([]);
      
      const response = await scraperService.extractData({
        url: decodedUrl,
        selectors: selectedSelectors
      });
      
      setPreviewData(response.data);
      
      // Show success message based on selection mode
      if (selectedSelectors.includes('selectAll')) {
        toast.success(`All elements extracted! Found ${response.data.length} items.`);
      } else {
        toast.success(`Data extracted successfully! Found ${response.data.length} items.`);
      }
    } catch (error: any) {
      console.error('Extraction error:', error);
      const message = error.response?.data?.message || 'Failed to extract data';
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveExtraction = async () => {
    if (previewData.length === 0) {
      toast.error('No data to save. Please extract data first.');
      return;
    }

    try {
      setIsSaving(true);

      // Create a title for the extraction
      const hostname = new URL(decodedUrl).hostname;
      const title = `Extraction from ${hostname}`;

      await scraperService.saveExtraction({
        url: decodedUrl,
        title: title,
        data: previewData,
        selectors: selectedSelectors
      });

      toast.success('Extraction saved successfully!');
    } catch (error: any) {
      console.error('Save extraction error:', error);
      const message = error.response?.data?.message || 'Failed to save extraction';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter elements based on search query and element type
  const filteredElements = elements.filter(element => {
    const matchesType = elementTypeFilter === 'all' || element.type === elementTypeFilter;
    const matchesSearch = searchQuery === '' ||
      element.selector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (element.text && element.text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesType && matchesSearch;
  });

  // Handle export
  const handleExport = (format: 'json' | 'csv') => {
    if (previewData.length === 0) {
      toast.error('No data to export. Please extract data first.');
      return;
    }

    try {
      let dataStr;
      let fileName;

      if (format === 'json') {
        dataStr = JSON.stringify(previewData, null, 2);
        fileName = 'extraction-data.json';
        downloadFile(dataStr, fileName, 'application/json');
      } else if (format === 'csv') {
        dataStr = convertToCSV(previewData);
        fileName = 'extraction-data.csv';
        downloadFile(dataStr, fileName, 'text/csv');
      }

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // Convert JSON data to CSV
  const convertToCSV = (data: PreviewData[]) => {
    if (data.length === 0) return '';

    // Get all possible headers from all objects
    const headers = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== '_selector' && !key.startsWith('_')) {
          headers.add(key);
        }
      });
    });
    const headerRow = Array.from(headers).join(',');

    // Generate rows
    const rows = data.map(item => {
      return Array.from(headers).map(header => {
        const value = item[header];
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        } else {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
      }).join(',');
    });

    return [headerRow, ...rows].join('\n');
  };

  // Download file
  const downloadFile = (data: string, fileName: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Determine if a selector is selected
  const isSelected = (selector: string) => {
    return selectedSelectors.includes(selector) || 
           (selectedSelectors.includes('selectAll'));
  };

  // Render element count badge
  const renderElementCount = () => {
    if (selectedSelectors.includes('selectAll')) {
      return <span className="bg-blue-600 text-xs px-2 py-0.5 rounded-full">{elements.length} (all)</span>;
    }
    return <span className="bg-blue-600 text-xs px-2 py-0.5 rounded-full">{selectedSelectors.length}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gray-900 shadow-md border-b border-gray-800">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-green-400">Xtract</h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-sm bg-gray-800 px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
          >
            <FaHome className="mr-1" />
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">
          Extraction Results:
          <a href={decodedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xl ml-2">
            {decodedUrl}
          </a>
        </h1>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <FaSpinner className="text-5xl text-green-400 animate-spin mb-4" />
              <p className="text-xl">Analyzing website...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - Element Selection */}
            <div className="w-full lg:w-1/3 bg-gray-800 p-6 rounded-lg border border-gray-700 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  Available Elements
                  <span className="ml-2 bg-green-600 text-xs px-2 py-0.5 rounded-full">{elements.length}</span>
                </h2>
                <button
                  onClick={() => {
                    if (selectedSelectors.includes('selectAll')) {
                      setSelectedSelectors([]);
                    } else {
                      setSelectedSelectors(['selectAll']);
                      setPreviewData([]);
                    }
                  }}
                  className="flex items-center text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <span>{selectedSelectors.includes('selectAll') ? 'Deselect All' : 'Select All'}</span>
                </button>
              </div>
              
              <div className="mb-4 relative">
                <input
                  type="text"
                  placeholder="Search elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 pl-10 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-green-500"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>              

              {/* Element Type Filter */}
              <div className="flex mb-4 space-x-1 border-b border-gray-700 pb-2">
                <button
                  onClick={() => setElementTypeFilter('all')}
                  className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-md ${elementTypeFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                  <FaList className="mr-1" />
                  All
                </button>
                <button
                  onClick={() => setElementTypeFilter('id')}
                  className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-md ${elementTypeFilter === 'id' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                  <FaHashtag className="mr-1" />
                  ID
                </button>
                <button
                  onClick={() => setElementTypeFilter('class')}
                  className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-md ${elementTypeFilter === 'class' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                  <FaLayerGroup className="mr-1" />
                  Class
                </button>
                <button
                  onClick={() => setElementTypeFilter('tag')}
                  className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-md ${elementTypeFilter === 'tag' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}
                >
                  <FaCode className="mr-1" />
                  Tag
                </button>
              </div>

              {/* Elements List */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {filteredElements.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No elements found matching your filters
                  </div>
                ) : (
                  filteredElements.map((element, idx) => (
                    <div
                      key={element.selector + '-' + idx}
                      onClick={() => handleSelectorToggle(element.selector)}
                      className={`p-3 rounded-md cursor-pointer transition-colors relative ${
                        isSelected(element.selector)
                          ? 'bg-green-700/30 border border-green-600'
                          : 'bg-gray-700 border border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className={`mr-2 text-xs px-1.5 py-0.5 rounded ${
                              element.type === 'id' ? 'bg-yellow-700/50 text-yellow-200' :
                              element.type === 'class' ? 'bg-blue-700/50 text-blue-200' :
                              'bg-purple-700/50 text-purple-200'
                            }`}>
                              {element.type}
                            </span>
                            <h3 className="text-sm font-mono font-medium text-white truncate">
                              {element.selector}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {element.text || 'No text content'}
                          </p>
                          
                          {/* Element tags */}
                          <div className="flex mt-1 flex-wrap gap-1">
                            {element.hasImage && (
                              <span className="bg-pink-900/30 text-pink-200 text-xs px-1 rounded">
                                Images
                              </span>
                            )}
                            {element.hasTable && (
                              <span className="bg-indigo-900/30 text-indigo-200 text-xs px-1 rounded">
                                Tables
                              </span>
                            )}
                            {element.children && element.children > 0 && (
                              <span className="bg-gray-700 text-gray-300 text-xs px-1 rounded">
                                {element.children} children
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {isSelected(element.selector) && (
                          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <FaCheck className="text-xs text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  Selected: {renderElementCount()}
                </div>
                <button 
                  onClick={handlePreview}
                  disabled={selectedSelectors.length === 0 || isExtracting}
                  className={`px-4 py-2 rounded-md font-medium flex items-center ${
                    selectedSelectors.length === 0 || isExtracting
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white transition-colors'
                  }`}
                >
                  {isExtracting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Extracting...
                    </>
                  ) : (
                    'Preview Data'
                  )}
                </button>
              </div>
            </div>

            {/* Right Side - Data Preview */}
            <div className="w-full lg:w-2/3">
              <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b border-gray-700">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm font-semibold">Data Preview</div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setViewMode('formatted')}
                      className={`px-3 py-1 text-xs rounded ${
                        viewMode === 'formatted' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Formatted View
                    </button>
                    <button 
                      onClick={() => setViewMode('raw')}
                      className={`px-3 py-1 text-xs rounded ${
                        viewMode === 'raw' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Raw JSON
                    </button>
                  </div>
                </div>
                
                <div className="p-4 font-mono text-sm text-green-300 overflow-x-auto max-h-[70vh] overflow-y-auto">                  
                  {previewData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center">
                        <p className="mb-2">No data extracted yet</p>
                        <p className="text-sm">Select elements and click "Preview Data" to extract data</p>
                      </div>
                    </div>
                  ) : (<div>
                    <div className="mb-4 flex justify-between items-center">
                      <div className="text-sm">
                        <span className="text-white">Extracted {previewData.length} items</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleExport('json')}
                          className="flex items-center text-xs bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                        >
                          <FaDownload className="mr-1" />
                          Export JSON
                        </button>
                        <button
                          onClick={() => handleExport('csv')}
                          className="flex items-center text-xs bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                        >
                          <FaDownload className="mr-1" />
                          Export CSV
                        </button>
                        <button
                          onClick={handleSaveExtraction}
                          disabled={isSaving}
                          className="flex items-center text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                        >
                          {isSaving ? <FaSpinner className="animate-spin mr-1" /> : <FaSave className="mr-1" />}
                          Save Extraction
                        </button>
                      </div>
                    </div>

                    {viewMode === 'raw' ? (
                      // Raw JSON view
                      <pre className="bg-gray-800 p-4 rounded overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(previewData, null, 2)}
                      </pre>
                    ) : (
                      // Formatted view
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {previewData.map((item, index) => (
                          <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 transition-colors">
                            {/* Image */}
                            {item.image && (
                              <div className="mb-4 rounded overflow-hidden flex justify-center bg-gray-900 p-2">
                                <img 
                                  src={item.image} 
                                  alt={item.alt || item.title || 'Product image'} 
                                  className="max-h-40 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}

                            {/* Title */}
                            {item.title && (
                              <h3 className="text-lg font-semibold text-yellow-300 mb-2">{item.title}</h3>
                            )}

                            {/* Price */}
                            {item.price && (
                              <p className="text-green-400 font-bold">{item.price}</p>
                            )}

                            {/* Rating & Reviews */}
                            {(item.rating || item.reviews) && (
                              <div className="flex items-center gap-2 mb-2">
                                {item.rating && (
                                  <span className="bg-blue-900 px-2 py-0.5 rounded text-blue-200">
                                    ★ {item.rating}
                                  </span>
                                )}
                                {item.reviews && (
                                  <span className="text-gray-400">
                                    ({item.reviews} reviews)
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Description */}
                            {item.description && (
                              <p className="text-sm text-gray-300 mb-2 line-clamp-3">{item.description}</p>
                            )}

                            {/* Product URL */}
                            {item.url && (
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:underline block truncate mb-2"
                              >
                                {item.url}
                              </a>
                            )}

                            {/* Other attributes */}
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              {Object.entries(item).map(([key, value]) => {
                                // Skip keys already displayed or internal keys
                                if (['title', 'price', 'image', 'description', 'rating', 'reviews', 'url', '_selector'].includes(key) || 
                                    key.startsWith('_')) {
                                  return null;
                                }
                                
                                // Skip empty values and objects/arrays
                                if (value === null || value === undefined || value === '' || 
                                    typeof value === 'object') {
                                  return null;
                                }
                                
                                return (
                                  <div key={key} className="flex text-xs mb-1">
                                    <span className="text-gray-400 min-w-[100px]">{key}:</span>
                                    <span className="text-white">{String(value)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show info on how many items were extracted but not shown if applicable */}
                    {previewData.length > 50 && viewMode === 'formatted' && (
                      <div className="mt-4 text-center text-gray-400 text-sm">
                        Showing first 50 of {previewData.length} items. Export data to see all results.
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrapeResultPage;