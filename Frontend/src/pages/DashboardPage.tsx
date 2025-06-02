import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaSearch, FaSignOutAlt, FaSpinner, FaExternalLinkAlt, FaEye, FaTrash, FaHistory } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import scraperService from '../api/scraperService';
import type { Extraction } from '../api/scraperService';

const DashboardPage = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [isLoadingExtractions, setIsLoadingExtractions] = useState(true);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // Fetch saved extractions on component mount
  useEffect(() => {
    const fetchExtractions = async () => {
      try {
        setIsLoadingExtractions(true);
        const extractionData = await scraperService.getUserExtractions();
        // Make sure we have an array before setting state
        if (Array.isArray(extractionData)) {
          setExtractions(extractionData);
        } else {
          console.error("Expected array of extractions but received:", extractionData);
          setExtractions([]);
          toast.error("Received unexpected data format from server");
        }
      } catch (error) {
        console.error("Failed to fetch extractions", error);
        toast.error("Failed to load your saved extractions");
        setExtractions([]); // Set to empty array to avoid map errors
      } finally {
        setIsLoadingExtractions(false);
      }
    };

    fetchExtractions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic URL validation
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      let formattedUrl = url;
      // Add https:// if not present
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      setIsLoading(true);
      
      // Encode the URL to pass as a route parameter
      const encodedUrl = encodeURIComponent(formattedUrl);
      navigate(`/result/${encodedUrl}`);
    } catch (error) {
      toast.error('Failed to process URL. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const viewExtraction = (extractionId: string) => {
    // Navigate to extraction details page (you'll need to create this page)
    navigate(`/extraction/${extractionId}`);
  };

  // Function to delete extraction
  const deleteExtraction = async (extractionId: string) => {
    try {
      await scraperService.deleteExtraction(extractionId);
      // Remove from state to update UI
      setExtractions(extractions.filter(ext => ext.id !== extractionId));
      toast.success('Extraction deleted successfully');
    } catch (error) {
      toast.error('Failed to delete extraction');
    }
  };

  // Animation variants
  const containerVariants = {
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1,
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }),
    hover: {
      y: -5,
      backgroundColor: "rgba(255,255,255,0.05)",
      transition: { duration: 0.2 }
    }
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
          {[...Array(20)].map((_, i) => (
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
        {/* Navbar */}
        <motion.nav 
          className="container mx-auto px-6 py-6 flex justify-between items-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center">
            <motion.span 
              className="text-3xl font-extrabold"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <span className="bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent">
                X<span className="text-yellow-300">tract</span>
              </span>
            </motion.span>
          </div>
          <motion.button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-xl bg-black/20 backdrop-blur-lg border border-white/10 text-white hover:border-red-400/50 hover:text-red-400 transition-all flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <FaSignOutAlt className="mr-2" /> Logout
          </motion.button>
        </motion.nav>

        {/* Main Content */}
        <motion.div 
          className="container mx-auto px-6 py-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="max-w-4xl mx-auto">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
              variants={itemVariants}
            >
              Extract Data from Any Website
            </motion.h1>
            
            <motion.p 
              className="text-xl mb-12 text-gray-400 text-center"
              variants={itemVariants}
            >
              Enter a URL below to analyze the website and select what data to extract
            </motion.p>

            <motion.form 
              onSubmit={handleSubmit} 
              className="mb-12"
              variants={itemVariants}
            >
              <div className="flex flex-col md:flex-row gap-4 relative">
                <motion.div 
                  className="flex-1 relative"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter website URL (e.g., example.com)"
                    className="w-full p-4 rounded-xl bg-black/50 backdrop-blur-lg border border-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white shadow-lg transition-all"
                  />
                  <motion.span 
                    className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-600"
                    initial={{ width: 0 }}
                    animate={{ width: url ? "100%" : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className={`px-8 py-4 rounded-xl font-semibold transition-all flex items-center justify-center ${
                    isLoading 
                      ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-black shadow-lg shadow-green-900/20 hover:shadow-green-900/40'
                  }`}
                  whileHover={isLoading ? {} : { scale: 1.03 }}
                  whileTap={isLoading ? {} : { scale: 0.97 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    delay: 0.4, 
                    duration: 0.6,
                    type: "spring", 
                    stiffness: 400, 
                    damping: 10 
                  }}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <FaSpinner />
                    </motion.div>
                  ) : (
                    <FaSearch className="mr-2" />
                  )}
                  {isLoading ? 'Analyzing...' : 'Scrape'}
                </motion.button>
              </div>
            </motion.form>

            <motion.div 
              className="bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
              variants={itemVariants}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className="p-6 border-b border-white/10 flex items-center">
                <FaHistory className="text-green-400 mr-3" />
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Recent Extractions</h3>
              </div>
              
              <AnimatePresence>
                {isLoadingExtractions ? (
                  <motion.div 
                    className="p-12 flex flex-col items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="mb-4"
                    >
                      <FaSpinner className="text-4xl text-green-400" />
                    </motion.div>
                    <p className="text-gray-400">Loading your extractions...</p>
                  </motion.div>
                ) : !extractions || extractions.length === 0 ? (
                  <motion.div 
                    className="p-12 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="mb-4 text-6xl text-gray-500 flex justify-center"
                    >
                      <FaSearch />
                    </motion.div>
                    <p className="text-gray-400 max-w-md mx-auto">
                      You don't have any extractions yet. Enter a URL above to analyze a website and start extracting data.
                    </p>
                  </motion.div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {extractions.map((extraction, index) => (
                      <motion.div 
                        key={extraction.id} 
                        custom={index}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover="hover"
                        className="p-5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg text-yellow-300">{extraction.title}</h4>
                            <a 
                              href={extraction.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline flex items-center text-sm mt-1"
                            >
                              {new URL(extraction.url).hostname} 
                              <FaExternalLinkAlt className="ml-1 text-xs" />
                            </a>
                            <p className="text-sm text-gray-400 mt-1">
                              {formatDate(extraction.createdAt)} • {extraction.dataCount} items
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <motion.button
                              onClick={() => viewExtraction(extraction.id)}
                              className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5 hover:border-green-400/50 hover:text-green-400 text-white"
                              title="View extraction"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <FaEye />
                            </motion.button>
                            <motion.button
                              onClick={() => deleteExtraction(extraction.id)}
                              className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5 hover:border-red-400/50 hover:text-red-400 text-white"
                              title="Delete extraction"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <FaTrash />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;