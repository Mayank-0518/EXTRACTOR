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

  // Animation variants
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const elementCardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.02,
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }),
    hover: {
      y: -4,
      scale: 1.02,
      boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
      transition: { duration: 0.2 }
    },
    selected: {
      y: -2,
      scale: 1.01,
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      borderColor: "#10b981",
      transition: { duration: 0.2 }
    }
  };

  const dataCardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (custom: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: custom * 0.05,
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }),
    hover: {
      y: -5,
      boxShadow: "0 15px 30px rgba(0,0,0,0.3)",
      transition: { duration: 0.2 }
    }
  };

  // Decode the URL
  const decodedUrl = url ? decodeURIComponent(url) : '';

  useEffect(() => {
    // Fetch available elements when component loads
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
    <div className="min-h-screen bg-black text-white">
      {/* Animated background */}
      <div className="fixed inset-0 w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(55,65,81,1)_0%,_rgba(17,24,39,1)_40%,_rgba(0,0,0,1)_100%)]"></div>
        
        {/* Particle effects */}
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
        
        {/* Animated gradient circles */}
        <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
          <motion.div
            initial={{ x: "100%", y: "100%", opacity: 0 }}
            animate={{ x: "70%", y: "30%", opacity: 0.15 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -right-96 top-0 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-green-500/20 to-emerald-600/10 blur-3xl"
          />
          <motion.div
            initial={{ x: "-100%", y: "-100%", opacity: 0 }}
            animate={{ x: "-70%", y: "-30%", opacity: 0.15 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute left-0 -top-96 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-yellow-500/15 to-amber-600/5 blur-3xl"
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          className="backdrop-blur-xl bg-black/30 shadow-md border-b border-white/5 sticky top-0 z-20"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <motion.h1 
                className="text-xl font-bold bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                Xtract
              </motion.h1>
            </div>
            <motion.button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-sm bg-white/5 backdrop-blur-lg border border-white/10 px-4 py-2 rounded-xl hover:border-white/30 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <FaHome className="mr-2" />
              Dashboard
            </motion.button>
          </div>
        </motion.header>

        {/* Main Content */}
        <motion.div 
          className="container mx-auto px-6 py-10"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 
            className="text-3xl font-bold mb-6 flex flex-col md:flex-row md:items-center gap-3"
            variants={itemVariants}
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
          </motion.h1>

          {isLoading ? (
            <motion.div 
              className="flex items-center justify-center h-80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
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
            </motion.div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Side - Element Selection */}
              <motion.div 
                variants={itemVariants}
                className="w-full lg:w-1/3 backdrop-blur-xl bg-black/30 p-6 rounded-2xl border border-white/10 h-fit shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Available Elements
                    <span className="ml-2 bg-green-600 text-xs px-2 py-0.5 rounded-full text-white">
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
                      ? 'bg-green-600/20 border-green-500 text-green-400'
                      : 'bg-black/30 border-white/10 hover:border-green-500/50 text-white'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{selectedSelectors.includes('selectAll') ? 'Deselect All' : 'Select All'}</span>
                  </motion.button>
                </div>
                
                <div className="mb-4 relative">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative"
                  >
                    <input
                      type="text"
                      placeholder="Search elements..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full p-3 pl-10 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all backdrop-blur-sm"
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <motion.span 
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-600"
                      initial={{ width: 0 }}
                      animate={{ width: searchQuery ? "100%" : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.div>
                </div>              

                {/* Element Type Filter */}
                <motion.div 
                  className="flex mb-4 space-x-1 border-b border-white/5 pb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    onClick={() => setElementTypeFilter('all')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaList className="mr-1" />
                    All
                  </motion.button>
                  <motion.button
                    onClick={() => setElementTypeFilter('id')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'id' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaHashtag className="mr-1" />
                    ID
                  </motion.button>
                  <motion.button
                    onClick={() => setElementTypeFilter('class')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'class' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaLayerGroup className="mr-1" />
                    Class
                  </motion.button>
                  <motion.button
                    onClick={() => setElementTypeFilter('tag')}
                    className={`flex-1 flex justify-center items-center py-2 px-1 text-xs rounded-lg ${elementTypeFilter === 'tag' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaCode className="mr-1" />
                    Tag
                  </motion.button>
                </motion.div>

                {/* Elements List */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  <AnimatePresence>
                    {filteredElements.length === 0 ? (
                      <motion.div 
                        className="text-center py-12 text-gray-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="mb-4 text-5xl text-gray-500 flex justify-center"
                        >
                          <FaSearch />
                        </motion.div>
                        <p>No elements found matching your filters</p>
                      </motion.div>
                    ) : (
                      filteredElements.map((element, idx) => (
                        <motion.div
                          key={element.selector + '-' + idx}
                          onClick={() => handleSelectorToggle(element.selector)}
                          custom={idx}
                          variants={elementCardVariants}
                          initial="hidden"
                          animate={isSelected(element.selector) ? "selected" : "visible"}
                          whileHover="hover"
                          className={`p-4 rounded-xl cursor-pointer transition-all relative backdrop-blur-sm ${
                            isSelected(element.selector)
                              ? 'bg-green-500/10 border border-green-500/80 shadow-lg shadow-green-900/10'
                              : 'bg-black/30 border border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <motion.span 
                                  className={`mr-2 text-xs px-2 py-0.5 rounded-full ${
                                    element.type === 'id' ? 'bg-yellow-700/50 text-yellow-200' :
                                    element.type === 'class' ? 'bg-blue-700/50 text-blue-200' :
                                    'bg-purple-700/50 text-purple-200'
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  {element.type}
                                </motion.span>
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
                                  <span className="bg-black/50 text-gray-300 text-xs px-1 rounded">
                                    {element.children} children
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {isSelected(element.selector) && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                              >
                                <FaCheck className="text-xs text-white" />
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
                
                <motion.div 
                  className="mt-4 flex justify-between items-center"
                  variants={itemVariants}
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
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-900/20'
                    }`}
                    whileHover={selectedSelectors.length === 0 || isExtracting ? {} : { scale: 1.03 }}
                    whileTap={selectedSelectors.length === 0 || isExtracting ? {} : { scale: 0.97 }}
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
                </motion.div>
              </motion.div>

              {/* Right Side - Data Preview */}
              <motion.div 
                variants={itemVariants}
                className="w-full lg:w-2/3"
              >
                <motion.div 
                  className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
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
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Formatted View
                      </motion.button>
                      <motion.button 
                        onClick={() => setViewMode('raw')}
                        className={`px-3 py-1 text-xs rounded-lg ${
                          viewMode === 'raw' 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Raw JSON
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="p-4 font-mono text-sm text-green-300 overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">                  
                    <AnimatePresence mode="wait">
                      {previewData.length === 0 ? (
                        <motion.div 
                          className="flex items-center justify-center h-64 text-gray-400"
                          key="no-data"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="text-center">
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.2, duration: 0.5 }}
                              className="mb-6 text-6xl text-gray-600/50 flex justify-center"
                            >
                              <FaSearch />
                            </motion.div>
                            <p className="text-lg mb-2">No data extracted yet</p>
                            <p className="text-sm text-gray-500">Select elements and click "Preview Data" to extract data</p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="has-data"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="mb-4 flex justify-between items-center">
                            <motion.div 
                              className="text-lg"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Extracted </span>
                              <span className="text-green-400 font-semibold">{previewData.length}</span>
                              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"> items</span>
                            </motion.div>
                            
                            <motion.div 
                              className="flex space-x-2"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <motion.button
                                onClick={() => handleExport('json')}
                                className="flex items-center text-xs bg-white/5 backdrop-blur-lg px-3 py-2 rounded-lg border border-white/10 hover:border-blue-500/50 hover:text-blue-400 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <FaDownload className="mr-2" />
                                Export JSON
                              </motion.button>
                              <motion.button
                                onClick={() => handleExport('csv')}
                                className="flex items-center text-xs bg-white/5 backdrop-blur-lg px-3 py-2 rounded-lg border border-white/10 hover:border-blue-500/50 hover:text-blue-400 transition-all"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
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
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-xl hover:shadow-blue-900/20'
                                }`}
                                whileHover={isSaving ? {} : { scale: 1.05 }}
                                whileTap={isSaving ? {} : { scale: 0.95 }}
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
                            </motion.div>
                          </div>

                          {viewMode === 'raw' ? (
                            // Raw JSON view
                            <motion.pre 
                              className="bg-black/30 p-6 rounded-xl overflow-auto whitespace-pre-wrap border border-white/5"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              {JSON.stringify(previewData, null, 2)}
                            </motion.pre>
                          ) : (
                            // Formatted view
                            <motion.div 
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              {previewData.map((item, index) => (
                                <motion.div 
                                  key={index}
                                  custom={index}
                                  variants={dataCardVariants}
                                  initial="hidden"
                                  animate="visible"
                                  whileHover="hover"
                                  className="bg-black/30 backdrop-blur-sm p-5 rounded-xl border border-white/5 hover:border-green-500/30 transition-all shadow-lg"
                                >
                                  {/* Image */}
                                  {item.image && (
                                    <motion.div 
                                      className="mb-4 rounded-lg overflow-hidden flex justify-center bg-black/30 p-2"
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.1, duration: 0.4 }}
                                    >
                                      <img 
                                        src={item.image} 
                                        alt={item.alt || item.title || 'Product image'} 
                                        className="max-h-40 object-contain rounded"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </motion.div>
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
                                  <div className="mt-2 pt-2 border-t border-white/5">
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
                                </motion.div>
                              ))}
                            </motion.div>
                          )}

                          {/* Show info on how many items were extracted but not shown if applicable */}
                          {previewData.length > 50 && viewMode === 'formatted' && (
                            <motion.div 
                              className="mt-4 text-center text-gray-400 text-sm"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                            >
                              Showing first 50 of {previewData.length} items. Export data to see all results.
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ScrapeResultPage;