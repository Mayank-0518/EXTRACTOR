import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaSearch, FaSignOutAlt, FaSpinner, FaExternalLinkAlt, FaEye, FaTrash } from 'react-icons/fa';
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
        setExtractions(extractionData);
      } catch (error) {
        console.error("Failed to fetch extractions", error);
        toast.error("Failed to load your saved extractions");
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

  // Function to view extraction details
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
          onClick={handleLogout}
          className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors flex items-center"
        >
          <FaSignOutAlt className="mr-2" /> Logout
        </button>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center">
            Enter a website URL to scrape
          </h1>
          <p className="text-xl mb-12 text-gray-300 text-center">
            Xtract will analyze the website and help you select the data you want to extract.
          </p>

          <form onSubmit={handleSubmit} className="mb-12">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., example.com)"
                className="flex-1 p-4 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 focus:outline-none focus:border-green-500 text-white"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-4 rounded-lg bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 font-bold transition-all transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  'Loading...'
                ) : (
                  <>
                    <FaSearch className="mr-2" /> Scrape
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-700">
              <h3 className="text-2xl font-bold">Recent Extractions</h3>
            </div>
            
            {isLoadingExtractions ? (
              <div className="p-8 flex justify-center">
                <FaSpinner className="animate-spin text-3xl text-green-400" />
              </div>
            ) : extractions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">
                  You don't have any extractions yet. Enter a URL above to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {extractions.map((extraction) => (
                  <div key={extraction.id} className="p-4 hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg text-yellow-300">{extraction.title}</h4>
                        <a 
                          href={extraction.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline flex items-center text-sm mt-1"
                        >
                          {new URL(extraction.url).hostname} <FaExternalLinkAlt className="ml-1 text-xs" />
                        </a>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatDate(extraction.createdAt)} • {extraction.dataCount} items
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewExtraction(extraction.id)}
                          className="p-2 rounded bg-gray-600 hover:bg-gray-500 text-white"
                          title="View extraction"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => deleteExtraction(extraction.id)}
                          className="p-2 rounded bg-red-600 hover:bg-red-700 text-white"
                          title="Delete extraction"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;