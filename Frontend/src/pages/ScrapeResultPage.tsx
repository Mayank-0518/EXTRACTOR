import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaHome, FaSpinner, FaCheck, FaSearch, FaList, FaHashtag, FaLayerGroup, FaCode, FaSave } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [elementTypeFilter, setElementTypeFilter] = useState<'all' | 'id' | 'class' | 'tag'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  const buttonAnimation = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const decodedUrl = url ? decodeURIComponent(url) : '';

  useEffect(() => {
    const fetchElements = async () => {
      try {
        setIsLoading(true);
        const response = await scraperService.analyzeWebsite(decodedUrl);
        setElements(response.elements);
        
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

      if (selector !== 'selectAll' && prev.includes('selectAll')) {
        return [selector];
      }
      
      if (selector === 'selectAll') {
        return prev.includes('selectAll') ? [] : ['selectAll'];
      }
      
      return prev.includes(selector) 
        ? prev.filter(s => s !== selector)
        : [...prev, selector];
    });
    
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

  const filteredElements = elements.filter(element => {
    const matchesType = elementTypeFilter === 'all' || element.type === elementTypeFilter;
    const matchesSearch = searchQuery === '' ||
      element.selector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (element.text && element.text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesType && matchesSearch;
  });

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

  const convertToCSV = (data: PreviewData[]) => {
    if (data.length === 0) return '';

    const headers = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== '_selector' && !key.startsWith('_')) {
          headers.add(key);
        }
      });
    });
    const headerRow = Array.from(headers).join(',');

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

  const isSelected = (selector: string) => {
    return selectedSelectors.includes(selector) || 
           (selectedSelectors.includes('selectAll'));
  };

  const renderElementCount = () => {
    if (selectedSelectors.includes('selectAll')) {
      return <span className="bg-blue-500/20 border border-blue-500/70 shadow-lg  text-white text-xs px-2 py-0.5 rounded-full">{elements.length} (all)</span>;
    }
    return <span className="bg-blue-500/20 border border-blue-500/70 shadow-lg  text-white text-xs px-2 py-0.5 rounded-full">{selectedSelectors.length}</span>;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(55,65,81,1)_0%,_rgba(17,24,39,1)_40%,_rgba(0,0,0,1)_100%)]"></div>
        
        <motion.div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.5, duration: 2 }}
        >
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-green-400"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                opacity: 0.3 + Math.random() * 0.7,
                scale: 0.5 + Math.random() * 1.5
              }}
              animate={{ 
                y: [null, Math.random() * -500],
                opacity: [null, 0]
              }}
              transition={{ 
                duration: 5 + Math.random() * 10, 
                repeat: Infinity, 
                delay: Math.random() * 5,
                ease: "linear"
              }}
            />
          ))}
        </motion.div>
        
        {/* Gradient circles */}
        <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
          <motion.div
            initial={{ x: "100%", y: "100%", opacity: 0 }}
            animate={{ x: "70%", y: "30%", opacity: 0.15 }}
            transition={{ duration: 2 }}
            className="absolute -right-96 top-0 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-green-500/20 to-emerald-600/10 blur-3xl"
          />
          <motion.div
            initial={{ x: "-100%", y: "-100%", opacity: 0 }}
            animate={{ x: "-70%", y: "-30%", opacity: 0.15 }}
            transition={{ duration: 2 }}
            className="absolute left-0 -top-96 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-yellow-500/15 to-amber-600/5 blur-3xl"
          />
        </div>
      </div>

      <div className="relative z-10">
        <header 
          className="backdrop-blur-xl bg-black/30 shadow-md border-b border-white/5 sticky top-0 z-20"
        >
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <h1 
                className="text-xl font-bold bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent"
              >
                Xtract
              </h1>
            </div>
            <motion.button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-sm bg-white/5 backdrop-blur-lg border border-white/10 px-4 py-2 rounded-xl hover:border-white/30 transition-all"
              whileHover={buttonAnimation.hover}
              whileTap={buttonAnimation.tap}
            >
              <FaHome className="mr-2" />
              Dashboard
            </motion.button>
          </div>
        </header>




        <motion.div 
          className="container mx-auto px-6 py-10"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 
            className="text-3xl font-bold mb-6 flex flex-col md:flex-row md:items-center gap-3"
          >
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Extraction Results:
            </span>
            <a 
              href={decodedUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 text-xl hover:underline inline-block md:ml-2 truncate"
            >
              {decodedUrl}
            </a>
          </h1>

          {isLoading ? (
            <div 
              className="flex items-center justify-center h-80"
            >
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="mb-6"
                >
                  <FaSpinner className="text-6xl text-green-400" />
                </motion.div>
                <motion.p 
                  className="text-2xl text-gray-300"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Analyzing website...
                </motion.p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">

              <div 
                className="w-full lg:w-1/3 backdrop-blur-xl bg-black/30 p-6 rounded-2xl border border-white/10 h-fit shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Available Elements
                    <span className="ml-2 bg-green-600/40   text-xs px-2 py-0.5 rounded-full text-white">
                      {elements.length}
                    </span>
                  </h2>
                  <motion.button
                    onClick={() => {
                      if (selectedSelectors.includes('selectAll')) {
                        setSelectedSelectors([]);
                      } else {
                        setSelectedSelectors(['selectAll']);
                        setPreviewData([]);
                      }
                    }}
                    className={`flex items-center text-xs px-4 py-2 rounded-xl border transition-all ${
                      selectedSelectors.includes('selectAll')
                      ? 'bg-yellow-600/20 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                      : 'bg-yellow-600/20 border-white/10 hover:border-yellow-400 text-yellow-300 hover:shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                    }`}
                    whileHover={buttonAnimation.hover}
                    whileTap={buttonAnimation.tap}
                  >
                    <span>{selectedSelectors.includes('selectAll') ? 'Deselect All' : 'Select All'}</span>
                  </motion.button>
                </div>
                
                <div className="mb-4 relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search elements..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full p-3 pl-10 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all backdrop-blur-sm"
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <span 
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-600"
                      style={{
                        width: searchQuery ? "100%" : 0,
                        transition: "width 0.3s"
                      }}
                    />
                  </div>
                </div>              


                <div 
                  className="flex mb-4 space-x-1 border-b border-white/5 pb-2"
                >
                  <button
                    onClick={() => setElementTypeFilter('all')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <FaList className="mr-1" />
                    All
                  </button>
                  <button
                    onClick={() => setElementTypeFilter('id')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'id' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <FaHashtag className="mr-1" />
                    ID
                  </button>
                  <button
                    onClick={() => setElementTypeFilter('class')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'class' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <FaLayerGroup className="mr-1" />
                    Class
                  </button>
                  <button
                    onClick={() => setElementTypeFilter('tag')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'tag' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    <FaCode className="mr-1" />
                    Tag
                  </button>
                </div>


                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {filteredElements.length === 0 ? (
                    <div 
                      className="text-center py-12 text-gray-400"
                    >
                      <div
                        className="mb-4 text-5xl text-gray-500 flex justify-center"
                      >
                        <FaSearch />
                      </div>
                      <p>No elements found matching your filters</p>
                    </div>
                  ) : (
                    filteredElements.map((element, idx) => (
                      <div
                        key={element.selector + '-' + idx}
                        onClick={() => handleSelectorToggle(element.selector)}
                        className={`p-4 rounded-xl cursor-pointer transition-colors relative backdrop-blur-sm ${
                          isSelected(element.selector)
                            ? 'bg-green-500/20 border border-green-500/70 shadow-lg shadow-green-900/10'
                            : 'bg-black/30 border border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span 
                                className={`mr-2 text-xs px-2 py-0.5 rounded-full ${
                                  element.type === 'id' ? 'bg-yellow-700/50 text-yellow-200' :
                                  element.type === 'class' ? 'bg-blue-700/50 text-blue-200' :
                                  'bg-purple-700/50 text-purple-200'
                                }`}
                              >
                                {element.type}
                              </span>
                              <h3 className="text-sm font-mono font-medium text-white truncate">
                                {element.selector}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              {element.text || 'No text content'}
                            </p>
                            

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
                                <span className="bg-black/50 text-gray-300 text-xs px-1 rounded">
                                  {element.children} children
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {isSelected(element.selector) && (
                            <div 
                              className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                            >
                              <FaCheck className="text-xs text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div 
                  className="mt-4 flex justify-between items-center"
                >
                  <div className="text-sm text-gray-400">
                    Selected: {renderElementCount()}
                  </div>
                  <motion.button 
                    onClick={handlePreview}
                    disabled={selectedSelectors.length === 0 || isExtracting}
                    className={`px-5 py-2 rounded-xl font-medium flex items-center ${
                      selectedSelectors.length === 0 || isExtracting
                        ? 'bg-gray-800/50 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    }`}
                    whileHover={selectedSelectors.length === 0 || isExtracting ? {} : buttonAnimation.hover}
                    whileTap={selectedSelectors.length === 0 || isExtracting ? {} : buttonAnimation.tap}
                  >
                    {isExtracting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <FaSpinner />
                        </motion.div>
                        Extracting...
                      </>
                    ) : (
                      'Preview Data'
                    )}
                  </motion.button>
                </div>
              </div>


              <div 
                className="w-full lg:w-2/3"
              >
                <div 
                  className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="p-4 flex justify-between items-center border-b border-white/10">
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-sm font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Data Preview</div>
                    <div className="flex space-x-2">
                      <motion.button 
                        onClick={() => setViewMode('formatted')}
                        className={`px-3 py-1 text-xs rounded-lg ${
                          viewMode === 'formatted' 
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]' 
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                        whileHover={buttonAnimation.hover}
                        whileTap={buttonAnimation.tap}
                      >
                        Formatted View
                      </motion.button>
                      <motion.button 
                        onClick={() => setViewMode('raw')}
                        className={`px-3 py-1 text-xs rounded-lg ${
                          viewMode === 'raw' 
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]' 
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                        whileHover={buttonAnimation.hover}
                        whileTap={buttonAnimation.tap}
                      >
                        Raw JSON
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="p-4 font-mono text-sm text-green-300 overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">                  
                    {previewData.length === 0 ? (
                      <div 
                        className="flex items-center justify-center h-64 text-gray-400"
                      >
                        <div className="text-center">
                          <div
                            className="mb-6 text-6xl text-gray-600/50 flex justify-center"
                          >
                            <FaSearch />
                          </div>
                          <p className="text-lg mb-2">No data extracted yet</p>
                          <p className="text-sm text-gray-500">Select elements and click "Preview Data" to extract data</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4 flex justify-between items-center">
                          <div 
                            className="text-lg"
                          >
                            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Extracted </span>
                            <span className="text-green-400 font-semibold">{previewData.length}</span>
                            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"> items</span>
                          </div>
                          
                          <div 
                            className="flex space-x-2"
                          >
                            <motion.button
                              onClick={() => handleExport('json')}
                              className="flex items-center text-xs bg-white/5 backdrop-blur-lg px-3 py-2 rounded-lg border border-white/10 hover:border-blue-500/50 hover:text-blue-400 transition-all"
                              whileHover={buttonAnimation.hover}
                              whileTap={buttonAnimation.tap}
                            >
                              <FaDownload className="mr-2" />
                              Export JSON
                            </motion.button>
                            <motion.button
                              onClick={() => handleExport('csv')}
                              className="flex items-center text-xs bg-white/5 backdrop-blur-lg px-3 py-2 rounded-lg border border-white/10 hover:border-blue-500/50 hover:text-blue-400 transition-all"
                              whileHover={buttonAnimation.hover}
                              whileTap={buttonAnimation.tap}
                            >
                              <FaDownload className="mr-2" />
                              Export CSV
                            </motion.button>
                            <motion.button
                              onClick={handleSaveExtraction}
                              disabled={isSaving}
                              className={`flex items-center text-xs px-3 py-2 rounded-lg ${
                                isSaving
                                  ? 'bg-blue-700/50 text-blue-300 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                              }`}
                              whileHover={isSaving ? {} : buttonAnimation.hover}
                              whileTap={isSaving ? {} : buttonAnimation.tap}
                            >
                              {isSaving ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="mr-2"
                                >
                                  <FaSpinner />
                                </motion.div>
                              ) : (
                                <FaSave className="mr-2" />
                              )}
                              Save Extraction
                            </motion.button>
                          </div>
                        </div>

                        {viewMode === 'raw' ? (
                          // Raw JSON view
                          <pre 
                            className="bg-black/30 p-6 rounded-xl overflow-auto whitespace-pre-wrap border border-white/5"
                          >
                            {JSON.stringify(previewData, null, 2)}
                          </pre>
                        ) : (
                          // Formatted view
                          <div 
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            {previewData.map((item, index) => (
                              <div 
                                key={index}
                                className="bg-black/30 backdrop-blur-sm p-5 rounded-xl border border-white/5 hover:border-green-500/30 transition-colors shadow-lg"
                              >
                                {item.image && (
                                  <div 
                                    className="mb-4 rounded-lg overflow-hidden flex justify-center bg-black/30 p-2"
                                  >
                                    <img 
                                      src={item.image} 
                                      alt={item.alt || item.title || 'Product image'} 
                                      className="max-h-40 object-contain rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}

                                {item.title && (
                                  <h3 className="text-lg font-semibold text-yellow-300 mb-2">{item.title}</h3>
                                )}

                                {item.price && (
                                  <p className="text-green-400 font-bold">{item.price}</p>
                                )}

                                {(item.rating || item.reviews) && (
                                  <div className="flex items-center gap-2 mb-2">
                                    {item.rating && (
                                      <span className="bg-blue-900/30 px-2 py-0.5 rounded-full text-blue-200">
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

                                {item.description && (
                                  <p className="text-sm text-gray-300 mb-2 line-clamp-3">{item.description}</p>
                                )}

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

                                <div className="mt-2 pt-2 border-t border-white/5">
                                  {Object.entries(item).map(([key, value]) => {
                                    if (['title', 'price', 'image', 'description', 'rating', 'reviews', 'url', '_selector'].includes(key) || 
                                        key.startsWith('_')) {
                                      return null;
                                    }
                                    
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


                        {previewData.length > 50 && viewMode === 'formatted' && (
                          <div 
                            className="mt-4 text-center text-gray-400 text-sm"
                          >
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
        </motion.div>
      </div>
    </div>
  );
};

export default ScrapeResultPage;