import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaDownload, FaHome, FaSpinner, FaCheck } from 'react-icons/fa';

interface ScrapedElement {
  selector: string;
  type: 'tag' | 'class' | 'id';
  text?: string;
}

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
  const [exportFormat, setExportFormat] = useState('json');
  const [scrapedUrl, setScrapedUrl] = useState('');

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

        const response = await axios.post(
          'http://localhost:5000/api/scraper/analyze',
          { url: decodedUrl },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setElements(response.data.elements);
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
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:5000/api/scraper/extract',
        {
          url: decodedUrl,
          selectors: selectedSelectors
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPreviewData(response.data.data);
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
      
      // For formats that require file download
      if (exportFormat === 'csv' || exportFormat === 'excel' || exportFormat === 'xml') {
        // Create a form to submit
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `http://localhost:5000/api/scraper/extract?format=${exportFormat}`;
        form.target = '_blank';
        
        // Add URL field
        const urlField = document.createElement('input');
        urlField.type = 'hidden';
        urlField.name = 'url';
        urlField.value = decodedUrl;
        form.appendChild(urlField);
        
        // Add selectors field
        const selectorsField = document.createElement('input');
        selectorsField.type = 'hidden';
        selectorsField.name = 'selectors';
        selectorsField.value = JSON.stringify(selectedSelectors);
        form.appendChild(selectorsField);
        
        // Add authorization header
        const authField = document.createElement('input');
        authField.type = 'hidden';
        authField.name = 'authorization';
        authField.value = `Bearer ${token}`;
        form.appendChild(authField);
        
        // Submit the form
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      } else {
        // For JSON format
        const response = await axios.post(
          'http://localhost:5000/api/scraper/extract',
          {
            url: decodedUrl,
            selectors: selectedSelectors,
            saveExtraction: true,
            title: `Extraction from ${new URL(decodedUrl).hostname}`
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Save to browser
        const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `extraction-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      toast.success(`Data exported as ${exportFormat.toUpperCase()}!`);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to export data';
      toast.error(message);
    } finally {
      setIsExtracting(false);
    }
  };

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
                <span className="text-sm text-green-400">
                  {selectedSelectors.length} selected
                </span>
              </h2>
              
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {elements.length === 0 ? (
                  <p className="text-gray-400">No elements found</p>
                ) : (
                  <div className="space-y-3">
                    {elements.map((element, index) => (
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
              
              <div className="mt-6 space-y-4">
                <button
                  onClick={handlePreview}
                  disabled={selectedSelectors.length === 0 || isExtracting}
                  className="w-full py-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isExtracting ? 'Extracting...' : 'Preview Data'}
                </button>
                
                <div className="flex gap-4">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="flex-1 p-2 rounded-md bg-gray-700 border border-gray-600 focus:border-green-500 focus:outline-none"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                    <option value="xml">XML</option>
                  </select>
                  
                  <button
                    onClick={handleExport}
                    disabled={selectedSelectors.length === 0 || isExtracting}
                    className="flex-1 py-2 rounded-md bg-yellow-600 hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                  >
                    <FaDownload className="mr-2" /> Export
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
                  ) : (
                    <pre>{JSON.stringify(previewData, null, 2)}</pre>
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