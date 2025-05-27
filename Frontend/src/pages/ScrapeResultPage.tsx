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

  // Decode the URL
  const decodedUrl = url ? decodeURIComponent(url) : '';

  useEffect(() => {
    // Fetch available elements when component loads
    const analyzeWebsite = async () => {
      try {
        setIsLoading(true);
        setScrapedUrl(decodedUrl);
        
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Authentication required');
          navigate('/login');
          return;
        }

        const response = await scraperService.analyzeWebsite(decodedUrl);
        setElements(response.elements);
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to analyze website';
        toast.error(message);
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (decodedUrl) {
      analyzeWebsite();
    }
  }, [decodedUrl, navigate]);
  
  const handleSelectorToggle = (selector: string) => {
    setSelectedSelectors((prev) => {
      if (prev.includes(selector)) {
        return prev.filter((s) => s !== selector);
      } else {
        return [...prev, selector];
      }
    });
  };

  const handlePreview = async () => {
    if (selectedSelectors.length === 0) {
      toast.error('Please select at least one element to extract');
      return;
    }

    try {
      setIsExtracting(true);
      
      const response = await scraperService.extractData({
        url: decodedUrl,
        selectors: selectedSelectors
      });
      
      setPreviewData(response.data);
      toast.success('Data extracted successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to extract data';
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExport = async () => {
    if (selectedSelectors.length === 0) {
      toast.error('Please select at least one element to extract');
      return;
    }

    try {
      setIsExtracting(true);
      const token = localStorage.getItem('token');
      
      // For JSON format
      const response = await scraperService.extractData({
        url: decodedUrl,
        selectors: selectedSelectors,
        saveExtraction: true,
        title: `Extraction from ${new URL(decodedUrl).hostname}`
      });
      
      // Save to browser
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `extraction-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Data exported as JSON!`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to export data';
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle saving the extraction
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-3xl font-bold text-green-400">
            X<span className="text-yellow-300">tract</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors flex items-center"
        >
          <FaHome className="mr-2" /> Dashboard
        </button>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-6">
          Extraction Results: 
          <span className="text-green-400">
            {scrapedUrl ? new URL(scrapedUrl).hostname : 'Loading...'}
          </span>
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
              <h2 className="text-xl font-bold mb-4 flex justify-between items-center">
                Available Elements
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (selectedSelectors.length === elements.length) {
                        setSelectedSelectors([]);
                      } else {
                        setSelectedSelectors(elements.map(e => e.selector));
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    {selectedSelectors.length === elements.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-green-400">
                    {selectedSelectors.length} selected
                  </span>
                </div>
              </h2>
              
              {/* Search input */}
              <div className="mb-4 relative">
                <input
                  type="text"
                  placeholder="Search elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 pl-10 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-green-500"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="mb-4">
                <button 
                  onClick={() => {
                    setSelectedSelectors(['selectAll']);
                    handlePreview();
                    toast.success('Smart extraction activated - detecting product data');
                  }}
                  className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Smart Extract (Detect Products)
                </button>
              </div>

              {/* Element Type Filter Tabs */}
              <div className="flex mb-4 border-b border-gray-700">
                <button
                  onClick={() => setElementTypeFilter('all')}
                  className={`px-4 py-2 flex-1 text-center transition-colors flex items-center justify-center gap-2 ${
                    elementTypeFilter === 'all'
                      ? 'bg-gray-700 border-b-2 border-green-400 font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FaList className="text-xs" /> All
                </button>
                <button
                  onClick={() => setElementTypeFilter('id')}
                  className={`px-4 py-2 flex-1 text-center transition-colors flex items-center justify-center gap-2 ${
                    elementTypeFilter === 'id'
                      ? 'bg-gray-700 border-b-2 border-green-400 font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FaHashtag className="text-xs" /> ID
                </button>
                <button
                  onClick={() => setElementTypeFilter('class')}
                  className={`px-4 py-2 flex-1 text-center transition-colors flex items-center justify-center gap-2 ${
                    elementTypeFilter === 'class'
                      ? 'bg-gray-700 border-b-2 border-green-400 font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FaLayerGroup className="text-xs" /> Class
                </button>
                <button
                  onClick={() => setElementTypeFilter('tag')}
                  className={`px-4 py-2 flex-1 text-center transition-colors flex items-center justify-center gap-2 ${
                    elementTypeFilter === 'tag'
                      ? 'bg-gray-700 border-b-2 border-green-400 font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FaCode className="text-xs" /> Tag
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {filteredElements.length === 0 ? (
                  <p className="text-gray-400">
                    {elements.length === 0
                      ? "No elements found"
                      : "No elements match your search criteria"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredElements.map((element, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedSelectors.includes(element.selector)
                            ? 'bg-green-800 bg-opacity-30 border-green-500'
                            : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                        }`}
                        onClick={() => handleSelectorToggle(element.selector)}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-mono ${
                              element.type === 'id'
                                ? 'text-yellow-400'
                                : element.type === 'class'
                                ? 'text-blue-400'
                                : 'text-green-400'
                            }`}
                          >
                            {element.selector}
                          </span>
                          {selectedSelectors.includes(element.selector) && (
                            <FaCheck className="text-green-400" />
                          )}
                        </div>
                        {element.text && (
                          <p className="text-sm text-gray-300 mt-1 truncate">
                            {element.text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Info panel showing count of matching elements */}
              <div className="mt-3 mb-4 text-xs text-gray-400">
                Showing {filteredElements.length} of {elements.length} elements 
                {searchQuery && ` matching "${searchQuery}"`}
              </div>

              <div className="mt-4 space-y-4">
                <button
                  onClick={handlePreview}
                  disabled={selectedSelectors.length === 0 || isExtracting}
                  className="w-full py-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isExtracting ? 'Extracting...' : 'Preview Data'}
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleExport}
                    disabled={selectedSelectors.length === 0 || isExtracting || isSaving}
                    className="py-2 rounded-md bg-yellow-600 hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                  >
                    <FaDownload className="mr-2" /> Export JSON
                  </button>
                  
                  <button
                    onClick={handleSaveExtraction}
                    disabled={previewData.length === 0 || isSaving}
                    className="py-2 rounded-md bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                  >
                    <FaSave className="mr-2" /> {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Right Side - Preview */}
            <div className="w-full lg:w-2/3">
              <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-800 p-3 flex items-center">
                  <div className="flex space-x-2 mr-4">
                    <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-400">Data Preview</span>
                </div>
                  <div className="p-4 font-mono text-sm text-green-300 overflow-x-auto max-h-[70vh] overflow-y-auto">
                  {previewData.length === 0 ? (
                    <p className="text-gray-500">
                      {selectedSelectors.length === 0
                        ? '// Select elements to extract data'
                        : '// Click "Preview Data" to see extraction results'}
                    </p>
                  ) : (                      <div>
                        <div className="mb-4 flex">
                          <select 
                            className="p-2 rounded-md bg-gray-700 border border-gray-600 focus:border-green-500 focus:outline-none text-white"
                            onChange={(e) => {
                              // We'll just keep this as a UI element for now
                              // Later we can implement different view modes
                              console.log("Selected view mode:", e.target.value);
                            }}
                          >
                            <option value="formatted">Formatted View</option>
                            <option value="raw">Raw JSON</option>
                            <option value="table">Table View</option>
                          </select>
                        </div>
                      
                      {/* Formatted Display - like product cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {previewData.map((item, index) => (
                          <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 transition-colors">
                            {/* Show image if available */}
                            {item.image && (
                              <div className="mb-3">
                                <img 
                                  src={item.image} 
                                  alt={item.alt || item.title || 'Image'} 
                                  className="max-h-40 object-contain mx-auto rounded"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
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
                              <p className="text-gray-300 mt-1 text-sm line-clamp-2">{item.description}</p>
                            )}
                            
                            {/* URL */}
                            {item.url && (
                              <div className="mt-2">
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-400 hover:underline text-xs truncate block"
                                >
                                  {item.url}
                                </a>
                              </div>
                            )}
                            
                            {/* Other properties */}
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              {Object.entries(item).map(([key, value]) => {
                                // Skip already displayed properties
                                if (['title', 'price', 'rating', 'reviews', 'description', 'url', 'image', 'alt', '_selector'].includes(key)) {
                                  return null;
                                }
                                
                                return (
                                  <div key={key} className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">{key}:</span>
                                    <span className="text-white">{String(value).substring(0, 50)}</span>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Selector used */}
                            <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
                              selector: {item._selector || 'unknown'}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Also show raw data for debugging */}
                      <details className="mt-6">
                        <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors">
                          Show raw JSON data
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-900 rounded">{JSON.stringify(previewData, null, 2)}</pre>
                      </details>
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